// Three-phase geometric triangle-grid theme transition
// Port to AGS 3.0

import { Window, DrawingArea, Overlay, Scrollable, Anchor, Layer, Exclusivity } from "../../widget.ts"
import Gdk from "gi://Gdk?version=3.0"
import Gtk from "gi://Gtk?version=3.0"
import { SCREEN_WIDTH, SCREEN_HEIGHT, dark, get_cursor } from "../../env.ts"

const { max, min, round, sqrt, abs, random } = Math

const CELL_W = 350
const CELL_H = round(sqrt(CELL_W ** 2 - (CELL_W / 2) ** 2))
const ROWS = round(SCREEN_HEIGHT / CELL_H) + 1
const COLS = round(SCREEN_WIDTH * 2 / CELL_W) + 1
const N = ROWS * COLS

const cellGridX = new Float32Array(N)
const cellGridY = new Float32Array(N)
const cellDrawX = new Float32Array(N)
const cellDrawY = new Float32Array(N)
const cellInverted = new Uint8Array(N)

for (let i = 0; i < N; i++) {
    const x = i % COLS
    const y = (i - x) / COLS
    cellGridX[i] = x
    cellGridY[i] = y
    cellDrawX[i] = x * CELL_W / 2
    cellDrawY[i] = y * CELL_H
    cellInverted[i] = (x % 2 === 0 ? y % 2 === 1 : y % 2 === 0) ? 1 : 0
}

const randInt = (a: number, b: number) => round(random() * (b - a) + a)

const distFromCenter = (x: number, y: number, cx: number, cy: number) => {
    const xo = abs(x - cx) / 2
    const yo = abs(y - cy)
    return sqrt(xo * xo + yo * yo)
}

const posMapper = (x: number, y: number, sw: number, sh: number, cw: number, ch: number): [number, number] =>
    [x / sw * cw, y / sh * ch]

const drawTriangle = (ctx: any, cx: number, cy: number, w: number, h: number,
    color: [number, number, number, number], inverted: boolean,
    lr: number, rr: number, yr: number) => {
    if (lr <= 0.001 || rr <= 0.001 || yr <= 0.001) return
    ctx.setSourceRGBA(...color)

    let left = [cx - w / 2, cy + (inverted ? h / 2 : -h / 2)]
    let right = [cx + w / 2, cy + (inverted ? h / 2 : -h / 2)]
    let yp = [cx, cy + (inverted ? -h / 2 : h / 2)]

    if (lr < 0.9) {
        const vx = (right[0] - left[0]) * (1 - lr)
        const vy = (right[1] - left[1]) * (1 - lr)
        const vx2 = (yp[0] - left[0]) * (1 - lr)
        const vy2 = (yp[1] - left[1]) * (1 - lr)
        left = [left[0] + vx / 2 + vx2 / 2, left[1] + vy / 2 + vy2 / 2]
    }
    if (rr < 0.9) {
        const vx = (left[0] - right[0]) * (1 - rr)
        const vy = (left[1] - right[1]) * (1 - rr)
        const vx2 = (yp[0] - right[0]) * (1 - rr)
        const vy2 = (yp[1] - right[1]) * (1 - rr)
        right = [right[0] + vx / 2 + vx2 / 2, right[1] + vy / 2 + vy2 / 2]
    }
    if (yr < 0.9) {
        const vx = (left[0] - yp[0]) * (1 - yr)
        const vy = (left[1] - yp[1]) * (1 - yr)
        const vx2 = (right[0] - yp[0]) * (1 - yr)
        const vy2 = (right[1] - yp[1]) * (1 - yr)
        yp = [yp[0] + vx / 2 + vx2 / 2, yp[1] + vy / 2 + vy2 / 2]
    }

    ctx.moveTo(...left)
    ctx.lineTo(...right)
    ctx.lineTo(...yp)
    ctx.fill()
}

let _win: any = null
let _running = false

type Cell = [number, number, number, number, number, number, number, number, number, number]
const makeCell = (): Cell => [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

let cells1: Cell[] = []
let cells2: Cell[] = []

let colors: [number, number, number] = [218 / 255, 212 / 255, 187 / 255]
let colors2: [number, number, number] = [87 / 255, 84 / 255, 74 / 255]

let grid1: any = null
let grid2: any = null
let wf1 = false, wf2 = false
let wcf1 = false, wcf2 = false
let resolveDraw1: (() => void) | null = null
let resolveDraw2: (() => void) | null = null
let finalDraw1 = true, finalDraw2 = true
const opacityStep = 10
let vertexStep = 10

const makeDrawHandler = (idx: 1 | 2) => (_self: any, ctx: any) => {
    const cells = idx === 1 ? cells1 : cells2
    const useColors = idx === 1 ? colors2 : colors

    let stable = true
    for (let i = 0; i < N; i++) {
        const c = cells[i]
        if (c[9] === 1) continue

        let [op, tgOp, le, tgLe, ri, tgRi, cyv, tgCy] = c

        if (abs(op - tgOp) > 0.01) { stable = false; op += (tgOp - op) / opacityStep }
        if (abs(le - tgLe) > 0.001) { stable = false; le += (tgLe - le) / vertexStep }
        if (abs(ri - tgRi) > 0.001) { stable = false; ri += (tgRi - ri) / vertexStep }
        if (abs(cyv - tgCy) > 0.001) { stable = false; cyv += (tgCy - cyv) / vertexStep }

        drawTriangle(ctx, cellDrawX[i], cellDrawY[i], CELL_W, CELL_H,
            [useColors[0], useColors[1], useColors[2], op], !!cellInverted[i], le, ri, cyv)

        cells[i] = [op, tgOp, le, tgLe, ri, tgRi, cyv, tgCy, c[8], c[9]]
    }

    if (idx === 1) wf1 = false; else wf2 = false
    if (idx === 1 && resolveDraw1) { const r = resolveDraw1; resolveDraw1 = null; r() }
    if (idx === 2 && resolveDraw2) { const r = resolveDraw2; resolveDraw2 = null; r() }
    if (idx === 1) {
        if (finalDraw1 && !stable) grid1.queue_draw()
        else if (finalDraw1 && stable) wcf1 = false
    } else {
        if (finalDraw2 && !stable) grid2.queue_draw()
        else if (finalDraw2 && stable) wcf2 = false
    }
}

const waitDraw = (idx: 1 | 2): Promise<void> => new Promise(resolve => {
    if (idx === 1) resolveDraw1 = resolve
    else resolveDraw2 = resolve
})

const queueAndWait = async (idx: 1 | 2) => {
    const wait = waitDraw(idx)
    if (idx === 1) grid1.queue_draw()
    else grid2.queue_draw()
    await wait
}

const queueBothAndWait = async () => {
    const wait1 = waitDraw(1)
    const wait2 = waitDraw(2)
    grid1.queue_draw()
    grid2.queue_draw()
    await Promise.all([wait1, wait2])
}

const runAnimation = async () => {
    if (_running || !_win) { print("banner: skipped"); return }
    _running = true
    print("banner: animation started")

    try {
        if (dark.get()) {
            colors = [218 / 255, 212 / 255, 187 / 255]
            colors2 = [87 / 255, 84 / 255, 74 / 255]
        } else {
            colors = [87 / 255, 84 / 255, 74 / 255]
            colors2 = [218 / 255, 212 / 255, 187 / 255]
        }

        cells1 = Array.from({ length: N }, makeCell)
        cells2 = Array.from({ length: N }, makeCell)

        grid1 = new Gtk.DrawingArea()
        grid2 = new Gtk.DrawingArea()
        grid1.connect("draw", makeDrawHandler(1))
        grid2.connect("draw", makeDrawHandler(2))

        wf1 = false; wf2 = false; wcf1 = false; wcf2 = false
        finalDraw1 = true; finalDraw2 = true

        const overlay = Overlay({
            child: Scrollable({ child: grid1, vscroll: "never", hscroll: "never" }),
            overlays: [grid2],
        })
        const prev = _win.get_child()
        if (prev) _win.remove(prev)
        _win.add(overlay)
        _win.show_all()
        _win.visible = true

        const [rx, ry] = await get_cursor()
        const [centerX, centerY] = posMapper(rx, ry, SCREEN_WIDTH, SCREEN_HEIGHT, COLS, ROWS)
        const maxDist = sqrt(max(centerX, ROWS - centerX) ** 2 + max(centerY, COLS - centerY) ** 2) + 1
        const dist = new Float32Array(N)
        for (let i = 0; i < N; i++) {
            dist[i] = distFromCenter(cellGridX[i], cellGridY[i], centerX, centerY)
        }

        // ── Phase 1 ──
        {
            const start = Date.now()
            const duration = 400
            const fps = 60
            vertexStep = 10
            let drawT = start
            finalDraw1 = false

            while (true) {
                const frameStart = Date.now()
                const tr = (drawT - start) / duration

                for (let i = 0; i < N; i++) {
                    const x = cellGridX[i]
                    const d = dist[i]
                    if ((tr > 1 ? 1 : d) < maxDist * tr * (randInt(50, 100) / 100)) {
                        const c = cells1[i]
                        c[8] = 1
                        c[0] = 0.6; c[1] = 0.6
                        if (d < 2) {
                            c[7] = 1
                            c[2] = 1; c[3] = 1; c[4] = 1; c[5] = 1
                        } else if (x < centerX) {
                            c[3] = 1
                            c[4] = 1; c[5] = 1; c[6] = 1; c[7] = 1
                        } else {
                            c[5] = 1
                            c[2] = 1; c[3] = 1; c[6] = 1; c[7] = 1
                        }
                    }
                }

                finalDraw1 = true
                wcf1 = true
                wf1 = true
                await queueAndWait(1)

                if (tr > 0.5) break

                drawT = Date.now()
                await new Promise(r => setTimeout(r, max(0, 1000 / fps - (drawT - frameStart))))
            }
        }

        // ── Phase 2 ──
        {
            const start = Date.now()
            const duration = 400
            const fps = 60
            vertexStep = 10
            let drawT = start
            finalDraw2 = false

            while (true) {
                const frameStart = Date.now()
                const tr = (drawT - start) / duration

                for (let i = 0; i < N; i++) {
                    const x = cellGridX[i]
                    const d = dist[i]
                    if ((tr > 1 ? 1 : d) > maxDist * (1 - tr) * (randInt(50, 100) / 100)) {
                        const c = cells2[i]
                        c[8] = 1
                        c[0] = 1; c[1] = 1
                        if (d < 2) {
                            c[7] = 1
                            c[2] = 1; c[3] = 1; c[4] = 1; c[5] = 1
                        } else if (x < centerX) {
                            c[5] = 1
                            c[2] = 1; c[3] = 1; c[6] = 1; c[7] = 1
                        } else {
                            c[3] = 1
                            c[4] = 1; c[5] = 1; c[6] = 1; c[7] = 1
                        }
                    }
                }

                finalDraw2 = true
                wcf2 = true
                wf2 = true
                await queueAndWait(2)

                if (tr > 1) break

                drawT = Date.now()
                await new Promise(r => setTimeout(r, max(0, 1000 / fps - (drawT - frameStart))))
            }
        }

        await new Promise(r => setTimeout(r, 100))
        dark.set(!dark.get())
        await new Promise(r => setTimeout(r, 1500))

        // ── Phase 3 ──
        {
            const start = Date.now()
            const duration = 5000
            const fps = 15
            vertexStep = 2
            let drawT = start
            finalDraw2 = false
            finalDraw1 = false

            while (true) {
                const frameStart = Date.now()
                const tr = (drawT - start) / duration

                for (let i = 0; i < N; i++) {
                    const x = cellGridX[i]
                    const d = dist[i]

                    {
                        const c = cells2[i]
                        if ((tr > 1 ? 1 : d) < maxDist * tr * (randInt(50, 100) / 100)) {
                            c[8] = 1
                            c[0] = 0.6; c[1] = 0.6
                            if (x < centerX) { c[5] = 0; c[2] = 1; c[3] = 1; c[6] = 1; c[7] = 1 }
                            else { c[3] = 0; c[4] = 1; c[5] = 1; c[6] = 1; c[7] = 1 }
                        }
                    }

                    {
                        const c = cells1[i]
                        if ((tr > 1 ? 1 : d) < maxDist * tr * (randInt(50, 100) / 100)) {
                            c[8] = 1
                            c[0] = 1; c[1] = 1
                            if (x < centerX) { c[5] = 0; c[2] = 1; c[3] = 1; c[6] = 1; c[7] = 1 }
                            else { c[3] = 0; c[4] = 1; c[5] = 1; c[6] = 1; c[7] = 1 }
                        }
                    }
                }

                finalDraw2 = true
                finalDraw1 = true
                wcf1 = true; wcf2 = true
                wf1 = true; wf2 = true
                await queueBothAndWait()

                if (tr > 0.5) break

                drawT = Date.now()
                await new Promise(r => setTimeout(r, max(0, 1000 / fps - (drawT - frameStart))))
            }
        }

        _win.visible = false
    } catch (e) { print("banner error: " + e)
    } finally {
        _running = false
        print("banner: complete")
    }
}

export const BannerWindow = () => {
    const rgbaVisual = Gdk.Screen.get_default()?.get_rgba_visual()

    _win = Window({
        name: "banner",
        className: "banner",
        margin: [0, 0, 0, 0],
        anchor: Anchor.TOP | Anchor.LEFT | Anchor.BOTTOM | Anchor.RIGHT,
        exclusivity: Exclusivity.IGNORE,
        layer: Layer.OVERLAY,
        focusable: false,
        visible: false,
        setup: (self: any) => {
            self.set_app_paintable(true)
            if (rgbaVisual) self.set_visual(rgbaVisual)
        },
    })

    return _win
}

export const triggerBanner = () => {
    print("banner: triggerBanner called")
    runAnimation()
}
