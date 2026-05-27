import { Window, Anchor, Layer, Exclusivity, Keymode } from "../../widget.ts"
import Gdk from "gi://Gdk?version=3.0"
import { execAsync } from "astal"
import { SCREEN_WIDTH, SCREEN_HEIGHT, dark, get_cursor, rand_int } from "../../env.ts"

const { round, sqrt, min, max, abs } = Math

const cell_w = 200
const cell_h = round(sqrt(cell_w ** 2 - (cell_w / 2) ** 2))
const rows = round(SCREEN_HEIGHT / cell_h) + 2
const cols = round(SCREEN_WIDTH * 2 / cell_w) + 2
const N = rows * cols

const BG_ALPHA  = 0.62
const HOVER_R   = 300    // px radius of cursor brighten ring
const HOVER_STR = 0.55   // max alpha reduction near cursor

const alphas     = new Float32Array(N)
const selected   = new Uint8Array(N)
const selFade    = new Float32Array(N)
const hoverBoost = new Float32Array(N)

const leftV  = new Float32Array(N)  // current left vertex ratio
const rightV = new Float32Array(N)  // current right vertex ratio
const yV     = new Float32Array(N)  // current y vertex ratio
const tLeft  = new Float32Array(N)  // target left vertex ratio
const tRight = new Float32Array(N)  // target right vertex ratio
const tY     = new Float32Array(N)  // target y vertex ratio

selFade.fill(1)
tLeft.fill(1); tRight.fill(1); tY.fill(1)
leftV.fill(1); rightV.fill(1); yV.fill(1)

const color = () => dark.get()
    ? [218/255, 212/255, 187/255] as const
    : [87/255,  84/255,  74/255]  as const

let _win: any = null
let _active = false
let _dragStart: [number, number] | null = null
let _dragEnd:   [number, number] | null = null
let _phase: "fill" | "select" | "dissolve" = "fill"
let hoverX = -1, hoverY = -1
let _hoverGen = 0
let _selFadeGen = 0
let _aliveGen = 0

const getXY = (ev: any): [number, number] | null => {
    try {
        if (typeof ev?.x === "number" && typeof ev?.y === "number") return [ev.x, ev.y]
        const c = ev?.get_coords?.()
        if (Array.isArray(c)) {
            if (c.length >= 3) return [c[1], c[2]]
            if (c.length === 2) return [c[0], c[1]]
        }
    } catch {}
    return null
}

const cellCx = (i: number) => (i % cols) * cell_w / 2
const cellCy = (i: number) => ((i - i % cols) / cols) * cell_h

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

const updateSelected = () => {
    if (!_dragStart || !_dragEnd) { selected.fill(0); return }
    const [sx, sy] = _dragStart, [ex, ey] = _dragEnd
    const x1 = min(sx, ex), x2 = max(sx, ex), y1 = min(sy, ey), y2 = max(sy, ey)
    for (let i = 0; i < N; i++) {
        const cx = cellCx(i), cy = cellCy(i)
        selected[i] = (cx >= x1 && cx <= x2 && cy >= y1 && cy <= y2) ? 1 : 0
    }
    runSelFade()
}

const runSelFade = async () => {
    const gen = ++_selFadeGen
    while (true) {
        let stable = true
        for (let i = 0; i < N; i++) {
            const target = selected[i] ? 0 : 1
            const delta = target - selFade[i]
            if (abs(delta) > 0.005) {
                selFade[i] += delta * 0.28
                stable = false
            } else {
                selFade[i] = target
            }
            const vTarget = selected[i] ? 0 : 1
            const dvL = vTarget - leftV[i]
            const dvR = vTarget - rightV[i]
            const dvY = vTarget - yV[i]
            if (abs(dvL) > 0.005) { leftV[i] += dvL * 0.22; stable = false } else { leftV[i] = vTarget }
            if (abs(dvR) > 0.005) { rightV[i] += dvR * 0.22; stable = false } else { rightV[i] = vTarget }
            if (abs(dvY) > 0.005) { yV[i] += dvY * 0.22; stable = false } else { yV[i] = vTarget }
        }
        _win?.queue_draw()
        if (stable || gen !== _selFadeGen) break
        await new Promise(r => setTimeout(r, 16))
    }
}

const animateHover = async () => {
    const gen = ++_hoverGen
    while (true) {
        let stable = true
        for (let i = 0; i < N; i++) {
            const d = sqrt((cellCx(i) - hoverX) ** 2 + (cellCy(i) - hoverY) ** 2)
            const target = d < HOVER_R ? (1 - d / HOVER_R) * HOVER_STR : 0
            const delta = target - hoverBoost[i]
            if (abs(delta) > 0.005) {
                hoverBoost[i] += delta * 0.30
                stable = false
            } else {
                hoverBoost[i] = target
            }
        }
        _win?.queue_draw()
        if (stable || gen !== _hoverGen) break
        await new Promise(r => setTimeout(r, 16))
    }
}

const animateAlive = async () => {
    const gen = ++_aliveGen
    const step = 0.03
    while (true) {
        let changed = false
        for (let i = 0; i < N; i++) {
            if (selected[i] || selFade[i] < 0.1) continue
            if (leftV[i] > 0.8 && rightV[i] > 0.8 && yV[i] > 0.8) {
                tLeft[i] = 0.85 + Math.random() * 0.15
                tRight[i] = 0.85 + Math.random() * 0.15
                tY[i] = 0.85 + Math.random() * 0.15
            }
            const dvL = tLeft[i] - leftV[i]
            const dvR = tRight[i] - rightV[i]
            const dvY = tY[i] - yV[i]
            if (abs(dvL) > 0.002) { leftV[i] += dvL * 0.12; changed = true }
            if (abs(dvR) > 0.002) { rightV[i] += dvR * 0.12; changed = true }
            if (abs(dvY) > 0.002) { yV[i] += dvY * 0.12; changed = true }
        }
        if (changed) _win?.queue_draw()
        if (gen !== _aliveGen) break
        await new Promise(r => setTimeout(r, 60))
    }
}

const dismiss = async () => {
    _phase = "dissolve"
    try {
        const start = Date.now()
        const duration = 400
        const fps = 60
        const cc = cols / 2
        const cr = rows / 2
        const maxDist = sqrt(max(cc, cols - cc) ** 2 + max(cr, rows - cr) ** 2) + 1
        while (true) {
            const elapsed = Date.now() - start
            const t = min(1, elapsed / duration)
            for (let i = 0; i < N; i++) {
                const x = i % cols, y = (i - x) / cols
                const d = sqrt((x - cc) ** 2 + (y - cr) ** 2)
                if (d < maxDist * t * rand_int(50, 100) / 100) {
                    alphas[i] = 0
                }
            }
            _win?.queue_draw()
            if (t >= 1) break
            await new Promise(r => setTimeout(r, 1000 / fps))
        }
    } catch (e) { print("dismiss anim error:", e) }
    alphas.fill(0)
    _win?.queue_draw()
    _active = false
    _dragStart = _dragEnd = null
    selected.fill(0); hoverBoost.fill(0); selFade.fill(1)
    leftV.fill(1); rightV.fill(1); yV.fill(1)
    tLeft.fill(1); tRight.fill(1); tY.fill(1)
    hoverX = hoverY = -1
    if (_win) _win.visible = false
}

const startFill = async () => {
    _phase = "fill"
    const [real_x, real_y] = await get_cursor()
    const cc = real_x / SCREEN_WIDTH * cols
    const cr = real_y / SCREEN_HEIGHT * rows
    const maxDist = sqrt(max(cc, cols - cc) ** 2 + max(cr, rows - cr) ** 2) + 1

    const start = Date.now()
    const duration = 600
    const fps = 60
    while (true) {
        const elapsed = Date.now() - start
        const t = min(1, elapsed / duration)
        for (let i = 0; i < N; i++) {
            const x = i % cols, y = (i - x) / cols
            const d = sqrt((x - cc) ** 2 + (y - cr) ** 2)
            if (d < maxDist * t * rand_int(50, 100) / 100) {
                alphas[i] = BG_ALPHA
                tLeft[i] = 1; tRight[i] = 1; tY[i] = 1
            }
        }
        _win?.queue_draw()
        if (t >= 1) break
        await new Promise(r => setTimeout(r, 1000 / fps))
    }
    alphas.fill(BG_ALPHA)
    tLeft.fill(1); tRight.fill(1); tY.fill(1)
    _win?.queue_draw()
    _phase = "select"
    animateAlive().catch(print)
}

const captureRegion = async (rx: number, ry: number, rw: number, rh: number) => {
    const cmd =
        `mkdir -p ~/Screenshots && ` +
        `f=~/Screenshots/$(date +%Y%m%d_%H%M%S).png && ` +
        `grim -g "${rx},${ry} ${rw}x${rh}" "$f" && ` +
        `wl-copy -t image/png < "$f" 2>/dev/null; ` +
        `notify-send "Screenshot" "Saved to $f and clipboard" -a "yorha"`
    await execAsync(["sh", "-c", cmd]).catch(print)
}

export const triggerScreenshot = () => {
    if (_active || !_win) return
    _active = true
    _dragStart = _dragEnd = null
    selected.fill(0); alphas.fill(0); hoverBoost.fill(0); selFade.fill(1)
    leftV.fill(1); rightV.fill(1); yV.fill(1)
    tLeft.fill(1); tRight.fill(1); tY.fill(1)
    hoverX = hoverY = -1
    _win.visible = true
    try { _win.present?.() } catch {}
    startFill().catch(print)
}

export const ScreenshotWindow = () => {
    const rgba_visual = Gdk.Screen.get_default()?.get_rgba_visual()

    _win = Window({
        name: "screenshot",
        className: "screenshot-overlay",
        anchor: Anchor.TOP | Anchor.LEFT | Anchor.BOTTOM | Anchor.RIGHT,
        exclusivity: Exclusivity.IGNORE,
        layer: Layer.OVERLAY,
        keymode: Keymode.EXCLUSIVE,
        focusable: true,
        visible: false,
        setup: (self: any) => {
            self.set_app_paintable(true)
            if (rgba_visual) self.set_visual(rgba_visual)

            self.add_events(
                Gdk.EventMask.BUTTON_PRESS_MASK   |
                Gdk.EventMask.BUTTON_RELEASE_MASK |
                Gdk.EventMask.POINTER_MOTION_MASK |
                Gdk.EventMask.KEY_PRESS_MASK
            )

            self.connect("draw", (_s: any, ctx: any) => {
                ctx.setOperator(0); ctx.paint(); ctx.setOperator(2)
                const [r, g, b] = color()
                for (let i = 0; i < N; i++) {
                    const x = i % cols, y = (i - x) / cols
                    const inv = (x % 2 === 0 ? y % 2 === 1 : y % 2 === 0)
                    const cx = x * cell_w / 2, cy = y * cell_h
                    const baseA = max(0, alphas[i] - hoverBoost[i])
                    const a = baseA * selFade[i]
                    if (a < 0.005) continue
                    draw_triangle(ctx, cx, cy, cell_w - 3, cell_h - 1.5,
                        [r, g, b, a], inv,
                        leftV[i], rightV[i], yV[i])
                }
                if (_dragStart && _dragEnd) {
                    const [sx, sy] = _dragStart, [ex, ey] = _dragEnd
                    const rx = min(sx,ex), ry = min(sy,ey)
                    const rw = abs(ex-sx), rh = abs(ey-sy)
                    for (let off = 16; off >= 2; off -= 2) {
                        ctx.setSourceRGBA(1, 1, 1, 0.15 * (1 - off / 16))
                        ctx.setLineWidth(off)
                        ctx.rectangle(rx, ry, rw, rh)
                        ctx.stroke()
                    }
                    ctx.setSourceRGBA(1, 1, 1, 1)
                    ctx.setLineWidth(1.5)
                    ctx.rectangle(rx + 0.5, ry + 0.5, rw - 1, rh - 1)
                    ctx.stroke()
                }
                return false
            })

            self.connect("motion-notify-event", (_w: any, ev: any) => {
                if (!_active || _phase === "dissolve") return false
                const xy = getXY(ev)
                if (!xy) return false
                hoverX = xy[0]; hoverY = xy[1]
                animateHover().catch(print)
                if (_dragStart) {
                    _dragEnd = xy
                    updateSelected()
                    _win?.queue_draw()
                }
                return false
            })

            self.connect("button-press-event", (_w: any, ev: any) => {
                if (!_active || _phase === "dissolve") return true
                const xy = getXY(ev)
                if (!xy) { print("SCREENSHOT: press w/ no coords"); return true }
                _phase = "select"
                _dragStart = xy
                _dragEnd   = [xy[0], xy[1]]
                updateSelected()
                _win?.queue_draw()
                return true
            })

            self.connect("button-release-event", (_w: any, ev: any) => {
                if (!_active || _phase === "dissolve") return true
                const xy = getXY(ev)
                if (xy && _dragStart) _dragEnd = xy
                if (!_dragStart || !_dragEnd) return true
                const [sx, sy] = _dragStart, [ex, ey] = _dragEnd
                const rx = round(min(sx,ex)), ry = round(min(sy,ey))
                const rw = round(abs(ex-sx)), rh = round(abs(ey-sy))
                if (rw < 5 || rh < 5) { dismiss().catch(print); return true }
                ;(async () => {
                    await dismiss()
                    await new Promise(r => setTimeout(r, 60))
                    await captureRegion(rx, ry, rw, rh)
                })().catch(print)
                return true
            })

            self.connect("key-press-event", (_w: any, ev: any) => {
                let kv: number | undefined = ev?.keyval
                if (typeof kv !== "number") {
                    try {
                        const r = ev?.get_keyval?.()
                        kv = Array.isArray(r) ? r[1] : r
                    } catch {}
                }
                print("SCREENSHOT: key", kv)
                if (kv === Gdk.KEY_Escape || kv === 65307) {
                    _dragStart = _dragEnd = null
                    dismiss().catch(print)
                    return true
                }
                return false
            })
        },
    })
    return _win
}
