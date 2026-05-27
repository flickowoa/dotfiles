import { Window, Anchor, Layer, Exclusivity } from "../../widget.ts"
import Gdk from "gi://Gdk?version=3.0"
import { SCREEN_WIDTH, SCREEN_HEIGHT, dark } from "../../env.ts"

const { round, sqrt } = Math

const cell_w = 200
const cell_h = round(sqrt(cell_w ** 2 - (cell_w / 2) ** 2))
const rows = round(SCREEN_HEIGHT / cell_h) + 2
const cols = round(SCREEN_WIDTH * 2 / cell_w) + 2
const N = rows * cols
const BG_ALPHA = 0.62
const alphas = new Float32Array(N)
const span = SCREEN_WIDTH + SCREEN_HEIGHT

const cellX = new Float32Array(N)
const cellY = new Float32Array(N)
const cellDiag = new Float32Array(N)
const cellInv = new Uint8Array(N)

for (let i = 0; i < N; i++) {
    const x = i % cols
    const y = (i - x) / cols
    const cx = x * cell_w / 2
    const cy = y * cell_h
    cellX[i] = cx
    cellY[i] = cy
    cellDiag[i] = (cx + cy) / span
    cellInv[i] = (x % 2 === 0 ? y % 2 === 1 : y % 2 === 0) ? 1 : 0
}

const color = () => dark.get()
    ? [218 / 255, 212 / 255, 187 / 255] as const
    : [87 / 255, 84 / 255, 74 / 255] as const

let _win: any = null
let _wave = 0
let _visible = false

const step = () => new Promise(r => setTimeout(r, 16))

const fillIn = async () => {
    const wave = ++_wave
    const steps = 18
    alphas.fill(0)
    for (let s = 0; s <= steps && wave === _wave; s++) {
        const t = s / steps
        for (let i = 0; i < N; i++) {
            if (cellDiag[i] < t) alphas[i] = BG_ALPHA
        }
        _win?.queue_draw()
        await step()
    }
    if (wave !== _wave) return
    alphas.fill(BG_ALPHA)
    _win?.queue_draw()
}

const dissolve = async () => {
    const wave = ++_wave
    const steps = 18
    for (let s = 0; s <= steps && wave === _wave; s++) {
        const t = s / steps
        for (let i = 0; i < N; i++) {
            if (cellDiag[i] < t) alphas[i] = 0
        }
        _win?.queue_draw()
        await step()
    }
    if (wave !== _wave) return
    alphas.fill(0)
    _win?.queue_draw()
}

export const showSettingsBg = async () => {
    if (!_win) return
    if (!_visible) {
        _visible = true
        _win.visible = true
    }
    await fillIn().catch(print)
}

export const hideSettingsBg = async () => {
    if (!_win || !_visible) return
    await dissolve().catch(print)
    _visible = false
    _win.visible = false
}

export const SettingsBgWindow = () => {
    const rgbaVisual = Gdk.Screen.get_default()?.get_rgba_visual()

    _win = Window({
        name: "bg_settings",
        className: "bg_settings",
        anchor: Anchor.TOP | Anchor.LEFT | Anchor.BOTTOM | Anchor.RIGHT,
        exclusivity: Exclusivity.IGNORE,
        layer: Layer.OVERLAY,
        focusable: false,
        visible: false,
        setup: (self: any) => {
            self.set_app_paintable(true)
            if (rgbaVisual) self.set_visual(rgbaVisual)
            self.connect("draw", (_s: any, ctx: any) => {
                ctx.setOperator(0)
                ctx.paint()
                ctx.setOperator(2)
                const [r, g, b] = color()
                for (let i = 0; i < N; i++) {
                    const a = alphas[i]
                    if (a < 0.005) continue
                    ctx.setSourceRGBA(r, g, b, a)
                    const cx = cellX[i]
                    const cy = cellY[i]
                    if (cellInv[i]) {
                        ctx.moveTo(cx - cell_w / 2, cy + cell_h / 2)
                        ctx.lineTo(cx + cell_w / 2, cy + cell_h / 2)
                        ctx.lineTo(cx, cy - cell_h / 2)
                    } else {
                        ctx.moveTo(cx - cell_w / 2, cy - cell_h / 2)
                        ctx.lineTo(cx + cell_w / 2, cy - cell_h / 2)
                        ctx.lineTo(cx, cy + cell_h / 2)
                    }
                    ctx.fill()
                }
                return false
            })
        },
    })

    return _win
}
