import { Window, Anchor, Layer, Exclusivity } from "../../widget.ts"
import Gdk from "gi://Gdk?version=3.0"
import { execAsync } from "astal"
import { SCREEN_WIDTH, SCREEN_HEIGHT, dark, rand_int, get_cursor } from "../../env.ts"

const { round, sqrt, min, max } = Math

const cell_w = 200
const cell_h = round(sqrt(cell_w ** 2 - (cell_w / 2) ** 2))
const rows = round(SCREEN_HEIGHT / cell_h) + 2
const cols = round(SCREEN_WIDTH * 2 / cell_w) + 2
const N = rows * cols

// ── Pre-computed cell grid ──
const cellX = new Float32Array(N)
const cellY = new Float32Array(N)
const cellPx = new Float32Array(N)
const cellPy = new Float32Array(N)
const cellInverted = new Uint8Array(N)
const cellRand = new Float32Array(N)
for (let i = 0; i < N; i++) {
    const x = i % cols
    const y = (i - x) / cols
    cellX[i] = x
    cellY[i] = y
    cellPx[i] = x * cell_w / 2
    cellPy[i] = y * cell_h
    cellInverted[i] = (x % 2 === 0 ? y % 2 === 1 : y % 2 === 0) ? 1 : 0
    cellRand[i] = rand_int(50, 100) / 100
}

const FILL_MS        = 600
const DISSOLVE_MS    = 350
const SWITCH_AT      = 0.40
const PAUSE_MS       = 200
const COOLDOWN_MS    = 200
const BG_ALPHA       = 0.95

const alphas  = new Float32Array(N)
const leftV   = new Float32Array(N)
const rightV  = new Float32Array(N)
const yV      = new Float32Array(N)

let _win: any = null
let animating = false
let lastEndMs = 0
let onCompleteCb: (() => void) | null = null
let recordCb: (() => void) | null = null

const color = (): [number, number, number] => dark.get()
    ? [218/255, 212/255, 187/255]
    : [87/255,  84/255,  74/255]

const draw_triangle = (ctx: any, cx: number, cy: number, w: number, h: number,
    color: number[], inverted: boolean,
    lr: number, rr: number, yr: number) => {
    if (lr <= 0.001 || rr <= 0.001 || yr <= 0.001) return
    ctx.setSourceRGBA(...color)

    const left = [cx - w / 2, cy + (inverted ? h / 2 : -h / 2)]
    const right = [cx + w / 2, cy + (inverted ? h / 2 : -h / 2)]
    const yp = [cx, cy + (inverted ? -h / 2 : h / 2)]

    if (lr < 0.9) {
        const vx = (right[0] - left[0]) * (1 - lr)
        const vy = (right[1] - left[1]) * (1 - lr)
        const vx2 = (yp[0] - left[0]) * (1 - lr)
        const vy2 = (yp[1] - left[1]) * (1 - lr)
        left[0] += vx / 2 + vx2 / 2; left[1] += vy / 2 + vy2 / 2
    }
    if (rr < 0.9) {
        const vx = (left[0] - right[0]) * (1 - rr)
        const vy = (left[1] - right[1]) * (1 - rr)
        const vx2 = (yp[0] - right[0]) * (1 - rr)
        const vy2 = (yp[1] - right[1]) * (1 - rr)
        right[0] += vx / 2 + vx2 / 2; right[1] += vy / 2 + vy2 / 2
    }
    if (yr < 0.9) {
        const vx = (left[0] - yp[0]) * (1 - yr)
        const vy = (left[1] - yp[1]) * (1 - yr)
        const vx2 = (right[0] - yp[0]) * (1 - yr)
        const vy2 = (right[1] - yp[1]) * (1 - yr)
        yp[0] += vx / 2 + vx2 / 2; yp[1] += vy / 2 + vy2 / 2
    }

    ctx.moveTo(...left)
    ctx.lineTo(...right)
    ctx.lineTo(...yp)
    ctx.fill()
}

const reset = () => {
    alphas.fill(0)
    leftV.fill(1); rightV.fill(1); yV.fill(1)
}

const end = () => {
    animating = false
    lastEndMs = Date.now()
    if (_win) _win.visible = false
    const cb = onCompleteCb
    onCompleteCb = null
    if (cb) try { cb() } catch (e) { print("ws_anim cb:", e) }
}

const fill = async (target: string, cc: number, cr: number) => {
    const maxDist = sqrt(max(cc, cols - cc) ** 2 + max(cr, rows - cr) ** 2) + 1
    const start = Date.now()
    let dispatched = false
    const frameMs = 1000 / 60

    while (true) {
        const elapsed = Date.now() - start
        const t = min(1, elapsed / FILL_MS)

        if (t >= SWITCH_AT && !dispatched) {
            dispatched = true
            execAsync(["hyprctl", "dispatch", "workspace", target]).catch(print)
        }

        const wave = maxDist * t
        for (let i = 0; i < N; i++) {
            const dx = cellX[i] - cc
            const dy = cellY[i] - cr
            const d2 = dx * dx + dy * dy
            const r = cellRand[i]
            if (d2 < wave * wave * r * r) {
                alphas[i] = BG_ALPHA
                leftV[i] = 1; rightV[i] = 1; yV[i] = 1
            }
        }

        _win?.queue_draw()
        if (t >= 1) break
        await new Promise(r => setTimeout(r, frameMs))
    }

    alphas.fill(BG_ALPHA)
    leftV.fill(1); rightV.fill(1); yV.fill(1)
    _win?.queue_draw()
}

const dissolve = async (cc: number, cr: number) => {
    const maxDist = sqrt(max(cc, cols - cc) ** 2 + max(cr, rows - cr) ** 2) + 1
    const start = Date.now()
    const frameMs = 1000 / 60

    while (true) {
        const elapsed = Date.now() - start
        const t = min(1, elapsed / DISSOLVE_MS)

        const wave = maxDist * t
        for (let i = 0; i < N; i++) {
            const dx = cellX[i] - cc
            const dy = cellY[i] - cr
            const d2 = dx * dx + dy * dy
            const r = cellRand[i]
            if (d2 < wave * wave * r * r) {
                alphas[i] = 0
            }
        }

        _win?.queue_draw()
        if (t >= 1) break
        await new Promise(r => setTimeout(r, frameMs))
    }

    alphas.fill(0)
    _win?.queue_draw()
}

const run = async (target: string) => {
    if (!_win) { end(); return }
    _win.visible = true
    _win.queue_draw()

    const [real_x, real_y] = await get_cursor()
    const cc = real_x / SCREEN_WIDTH * cols
    const cr = real_y / SCREEN_HEIGHT * rows

    await fill(target, cc, cr)

    if (target === "theme") {
        alphas.fill(BG_ALPHA)
        leftV.fill(1); rightV.fill(1); yV.fill(1)
        _win.queue_draw()
        await new Promise(r => setTimeout(r, PAUSE_MS))
        alphas.fill(0)
        _win.queue_draw()
    } else {
        await dissolve(cc, cr)
    }

    end()
}

export const isAnimating = () => animating

export const triggerWsAnim = () => { /* no-op */ }

const RECORD_P1_MS = 500
const RECORD_P2_MS = 400
const RECORD_ALPHA = 0.70

const runRecordAnim = async (): Promise<void> => {
    if (!_win) return
    animating = true
    _win.visible = true
    _win.queue_draw()

    try {
        const [real_x, real_y] = await get_cursor()
        const cc = real_x / SCREEN_WIDTH * cols
        const cr = real_y / SCREEN_HEIGHT * rows
        const maxD = sqrt(max(cc, cols - cc) ** 2 + max(cr, rows - cr) ** 2) + 1

        const p1start = Date.now()
        const p1frame = 1000 / 60
        while (true) {
            const t = min((Date.now() - p1start) / RECORD_P1_MS, 1)
            const waveD = maxD * t
            for (let i = 0; i < N; i++) {
                const dx = cellX[i] - cc
                const dy = cellY[i] - cr
                const d = sqrt(dx * dx + dy * dy)
                if (d < waveD) {
                    const local = 1 - (waveD - d) / waveD
                    alphas[i] = min(max(local, 0), 1) * RECORD_ALPHA
                    leftV[i] = 1; rightV[i] = 1; yV[i] = 1
                }
            }
            _win?.queue_draw()
            if (t >= 1) break
            await new Promise(r => setTimeout(r, p1frame))
        }

        for (let i = 0; i < N; i++) alphas[i] = RECORD_ALPHA
        leftV.fill(1); rightV.fill(1); yV.fill(1)
        _win?.queue_draw()

        const cb = recordCb; recordCb = null
        if (cb) try { cb() } catch (e) { print("rec cb:", e) }

        const p2start = Date.now()
        const p2frame = 1000 / 60
        while (true) {
            const t = min((Date.now() - p2start) / RECORD_P2_MS, 1)
            const waveD2 = (maxD * t) ** 2
            for (let i = 0; i < N; i++) {
                const dx = cellX[i] - cc
                const dy = cellY[i] - cr
                const d2 = dx * dx + dy * dy
                if (d2 < waveD2) alphas[i] = 0
            }
            _win?.queue_draw()
            if (t >= 1) break
            await new Promise(r => setTimeout(r, p2frame))
        }

        alphas.fill(0)
        _win?.queue_draw()
        if (_win) _win.visible = false
    } finally {
        animating = false
        lastEndMs = Date.now()
    }
}

export const triggerRecordAnim = (onDone: () => void) => {
    if (animating) { onDone(); return }
    reset()
    recordCb = onDone
    runRecordAnim().catch(print)
}

export const triggerThemeWipe = () => {
    if (!animating) { animating = true; reset(); run("theme").catch(print) }
}

export const triggerSwitch = (hyprctlArg: string): Promise<void> =>
    new Promise(resolve => {
        if (animating || Date.now() - lastEndMs < COOLDOWN_MS) {
            resolve()
            return
        }
        onCompleteCb = resolve
        animating = true
        reset()
        run(hyprctlArg).catch(print)
    })

export const WsAnimWindow = () => {
    const rgba_visual = Gdk.Screen.get_default()?.get_rgba_visual()

    _win = Window({
        name: "ws_anim",
        className: "ws-anim",
        anchor: Anchor.TOP | Anchor.LEFT | Anchor.BOTTOM | Anchor.RIGHT,
        exclusivity: Exclusivity.IGNORE,
        layer: Layer.OVERLAY,
        focusable: false,
        visible: false,
        setup: (self: any) => {
            self.set_app_paintable(true)
            if (rgba_visual) self.set_visual(rgba_visual)

            self.connect("draw", (_s: any, ctx: any) => {
                ctx.setOperator(0); ctx.paint(); ctx.setOperator(2)
                const [r, g, b] = color()
                for (let i = 0; i < N; i++) {
                    const a = alphas[i]
                    if (a < 0.005) continue
                    draw_triangle(ctx, cellPx[i], cellPy[i],
                        cell_w - 3, cell_h - 1.5,
                        [r, g, b, a], !!cellInverted[i],
                        leftV[i], rightV[i], yV[i])
                }
                return false
            })
        },
    })

    return _win
}
