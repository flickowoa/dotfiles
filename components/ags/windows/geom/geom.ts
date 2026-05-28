import { App, Window, EventBox, Box, Overlay, Scrollable, Anchor, Layer, Exclusivity } from "../../widget.ts"
import Gtk from "gi://Gtk?version=3.0"
import Gdk from "gi://Gdk?version=3.0"
import { Variable, timeout } from "astal"
import { SCREEN_WIDTH, SCREEN_HEIGHT, rand_int, get_cursor, STYLE_CSS } from "../../env.ts"

const { min, max, round, abs, sqrt, random } = Math

// ── Helpers ───────────────────────────────────────────────────────────────
const dist_from_center = (x: number, y: number, cx: number, cy: number) =>
    ((abs(x - cx) / 2) ** 2 + abs(y - cy) ** 2) ** 0.5

const pos_mapper = (x: number, y: number, sw: number, sh: number, cols: number, rows: number): [number, number] => [
    (x / sw) * cols,
    (y / sh) * rows,
]

// ── Triangle drawing ──────────────────────────────────────────────────────
const draw_triangle = (
    ctx: any, cx: number, cy: number, w: number, h: number,
    color: number[], inverted: boolean,
    leftratio: number, rightratio: number, yratio: number
) => {
    if (leftratio <= 0.001 || rightratio <= 0.001 || yratio <= 0.001) return
    ctx.setSourceRGBA(...color)

    let leftpoint: [number, number], rightpoint: [number, number], ypoint: [number, number]
    if (inverted) {
        leftpoint = [cx - w / 2, cy + h / 2]
        rightpoint = [cx + w / 2, cy + h / 2]
        ypoint = [cx, cy - h / 2]
    } else {
        leftpoint = [cx - w / 2, cy - h / 2]
        rightpoint = [cx + w / 2, cy - h / 2]
        ypoint = [cx, cy + h / 2]
    }

    if (leftratio < 0.9) {
        const vx = (rightpoint[0] - leftpoint[0]) * (1 - leftratio)
        const vy = (rightpoint[1] - leftpoint[1]) * (1 - leftratio)
        const vx2 = (ypoint[0] - leftpoint[0]) * (1 - leftratio)
        const vy2 = (ypoint[1] - leftpoint[1]) * (1 - leftratio)
        leftpoint = [leftpoint[0] + vx / 2 + vx2 / 2, leftpoint[1] + vy / 2 + vy2 / 2]
    }
    if (rightratio < 0.9) {
        const vx = (leftpoint[0] - rightpoint[0]) * (1 - rightratio)
        const vy = (leftpoint[1] - rightpoint[1]) * (1 - rightratio)
        const vx2 = (ypoint[0] - rightpoint[0]) * (1 - rightratio)
        const vy2 = (ypoint[1] - rightpoint[1]) * (1 - rightratio)
        rightpoint = [rightpoint[0] + vx / 2 + vx2 / 2, rightpoint[1] + vy / 2 + vy2 / 2]
    }
    if (yratio < 0.9) {
        const vx = (leftpoint[0] - ypoint[0]) * (1 - yratio)
        const vy = (leftpoint[1] - ypoint[1]) * (1 - yratio)
        const vx2 = (rightpoint[0] - ypoint[0]) * (1 - yratio)
        const vy2 = (rightpoint[1] - ypoint[1]) * (1 - yratio)
        ypoint = [ypoint[0] + vx / 2 + vx2 / 2, ypoint[1] + vy / 2 + vy2 / 2]
    }

    ctx.moveTo(...leftpoint)
    ctx.lineTo(...rightpoint)
    ctx.lineTo(...ypoint)
    ctx.fill()
}

// ── Main window ───────────────────────────────────────────────────────────
const cell_width = 200
const cell_height = round(sqrt(cell_width ** 2 - (cell_width / 2) ** 2))
const gap = 3
const rows = round(SCREEN_HEIGHT / cell_height) + 1
const cols = round(SCREEN_WIDTH * 2 / cell_width) + 1

// Each cell: [c_opacity, t_opacity, c_left, t_left, c_right, t_right, c_y, t_y, inited, s_override]
type Cell = [number, number, number, number, number, number, number, number, boolean, boolean]
const cells: Cell[] = Array.from({ length: rows * cols }, () =>
    [0, 0, 0, 0, 0, 0, 0, 0, false, false] as Cell
)

// Colors (dark mode aware — standalone geom always starts with current state)
const colors = [87 / 255, 84 / 255, 74 / 255]  // light mode triangles

let wait_for_draw = false
let final_draw = true
let draw_t = 0
let draw_duration = 3000
let opacity_step = 10
let vertex_step = 3
let entered = false
let DESTRUCTION = false

const anchor_x1 = new Variable(-2)
const anchor_y1 = new Variable(-2)
const anchor_x2 = new Variable(-2)
const anchor_y2 = new Variable(-2)

const cell_grid = new Gtk.DrawingArea()

const update_selection = async (self: any) => {
    try {
        const [tx1, ty1] = pos_mapper(anchor_x1.get(), anchor_y1.get(), SCREEN_WIDTH, SCREEN_HEIGHT, cols, rows)
        const [tx2, ty2] = pos_mapper(anchor_x2.get(), anchor_y2.get(), SCREEN_WIDTH, SCREEN_HEIGHT, cols, rows)

        const rx1 = min(tx1, tx2), ry1 = min(ty1, ty2)
        const rx2 = max(tx1, tx2), ry2 = max(ty1, ty2)

        const cell_x1 = rx1 - 2, cell_y1 = ry1 - 2
        const cell_x2 = rx2 + 1, cell_y2 = ry2 + 1
        const center_x = (cell_x1 + cell_x2) / 2
        const center_y = (cell_y1 + cell_y2) / 2
        const x_dist = abs(cell_x2 - cell_x1) / 2
        const y_dist = abs(cell_y2 - cell_y1) / 2

        vertex_step = 2
        for (let i = 0; i < rows * cols; i++) {
            const x = i % cols, y = (i - x) / cols
            let [co, to, cl, tl, cr, tr, cy, ty, inited, s_override] = cells[i]

            const leftside = x < cell_x2 && dist_from_center(x, y, rx1 + y_dist, center_y) < y_dist
            const rightside = x > cell_x1 && dist_from_center(x, y, rx2 - y_dist, center_y) < y_dist
            const topside = x > cell_x1 && x < cell_x2 && y < cell_y2 && dist_from_center(x, y, center_x, ry1 + x_dist - 2) < x_dist
            const bottomside = x > cell_x1 && x < cell_x2 && y > cell_y1 && dist_from_center(x, y, center_x, ry2 - x_dist + 1) < x_dist
            const inside = leftside || rightside || topside || bottomside

            if ([tl, tr, ty].includes(0) && inside) continue

            if (inside) {
                if (!inited || !entered) s_override = true
                const inverted = (x % 2 === 0 ? y % 2 === 1 : y % 2 === 0)
                if ((y > (cell_y2 - 1) && inverted) || (y < (cell_y1 + 1) && !inverted)) {
                    [ty, tl, tr] = [0, 1, 1]
                } else if (x > (cell_x2 - 1) || x > center_x) {
                    [ty, tl, tr] = [1, 0, 1]
                } else {
                    [ty, tl, tr] = [1, 1, 0]
                }
            } else {
                s_override = false
                tr = tl = ty = 1
                to = 0.7
            }
            cells[i] = [co, to, cl, tl, cr, tr, cy, ty, inited, s_override]
        }

        wait_for_draw = true
        cell_grid.queue_draw()
        while (wait_for_draw) await new Promise(r => setTimeout(r, 1))

        const alloc = self.get_allocation()
        self.css = `margin-left:${min(anchor_x1.get(), anchor_x2.get())}px;` +
            `margin-top:${min(anchor_y1.get(), anchor_y2.get())}px;` +
            `margin-right:${alloc.width - max(anchor_x1.get(), anchor_x2.get())}px;` +
            `margin-bottom:${alloc.height - max(anchor_y1.get(), anchor_y2.get())}px;`
    } catch (e) { print(e) }
}

App.start({
    instanceName: "geom",
    css: STYLE_CSS,
    main() {
        Window({
            name: "geom",
            className: "geom",
            margin: [0, 0, 0, 0],
            anchor: Anchor.TOP | Anchor.LEFT | Anchor.BOTTOM | Anchor.RIGHT,
            exclusivity: Exclusivity.IGNORE,
            layer: Layer.OVERLAY,
            focusable: true,
            setup: (self: any) => timeout(1, () => {
                cell_grid.connect("draw", (_self: any, context: any) => {
                    let stable = true
                    for (let i = 0; i < rows * cols; i++) {
                        let [co, to, cl, tl, cr, tr, cy, ty, inited, s_override] = cells[i]
                        if (s_override) continue

                        if (abs(co - to) > 0.01) { stable = false; co += (to - co) / opacity_step }
                        if (abs(cl - tl) > 0.001) { stable = false; cl += (tl - cl) / vertex_step }
                        if (abs(cr - tr) > 0.001) { stable = false; cr += (tr - cr) / vertex_step }
                        if (abs(cy - ty) > 0.001) { stable = false; cy += (ty - cy) / vertex_step }

                        draw_triangle(context, (i % cols) * cell_width / 2, ((i - i % cols) / cols) * cell_height,
                            cell_width - gap, cell_height - gap / 2,
                            [...colors, co],
                            (i % cols % 2 === 0 ? Math.floor(i / cols) % 2 === 1 : Math.floor(i / cols) % 2 === 0),
                            cl, cr, cy)

                        cells[i] = [co, to, cl, tl, cr, tr, cy, ty, inited, s_override]
                    }
                    wait_for_draw = false
                    if (final_draw && !stable) cell_grid.queue_draw()
                    else if (final_draw && stable) wait_for_draw = false
                })

                self.connect("key-press-event", async (_widget: any, event: any) => {
                    try {
                        if (event.get_keyval()[1] === Gdk.KEY_Escape) {
                            const [real_x, real_y] = await get_cursor()
                            const [center_x, center_y] = pos_mapper(real_x, real_y, SCREEN_WIDTH, SCREEN_HEIGHT, cols, rows)
                            const max_dist = (max(center_x, rows - center_x) ** 2 + max(center_y, cols - center_y) ** 2) ** 0.5 + 1

                            const start = Date.now()
                            draw_duration = 1000
                            const fps = 15
                            draw_t = start
                            final_draw = false
                            vertex_step = 3
                            opacity_step = 2

                            while (true) {
                                const frame_start = Date.now()
                                const time_ratio = (draw_t - start) / draw_duration
                                for (let i = 0; i < rows * cols; i++) {
                                    let [co, to, cl, tl, cr, tr, cy, ty, inited, s_override] = cells[i]
                                    if (s_override) { entered = true; return }
                                    const x = i % cols, y = (i - x) / cols
                                    const dist = dist_from_center(x, y, center_x, center_y)
                                    if (time_ratio > 1 ? true : dist < max_dist * time_ratio * (rand_int(10, 100) / 100)) {
                                        inited = true; to = 0
                                    }
                                    cells[i] = [co, to, cl, tl, cr, tr, cy, ty, inited, s_override]
                                }
                                final_draw = true
                                wait_for_draw = true
                                cell_grid.queue_draw()
                                while (wait_for_draw) await new Promise(r => setTimeout(r, 1))
                                if (time_ratio > 0.6) { entered = true; App.quit(); return }
                                draw_t = Date.now()
                                await new Promise(r => setTimeout(r, max(0, 1000 / fps - (draw_t - frame_start))))
                            }
                        }
                        // ctrl swaps the anchors
                        if (event.get_keyval()[1] === 65507) {
                            const [tx1, ty1] = [anchor_x1.get(), anchor_y1.get()]
                            anchor_x1.set(anchor_x2.get()); anchor_y1.set(anchor_y2.get())
                            anchor_x2.set(tx1); anchor_y2.set(ty1)
                            await execAsync(`hyprctl dispatch movecursor ${round(tx1)} ${round(ty1)}`)
                        }
                    } catch (e) { print(e) }
                })
            }),
            child: EventBox({
                className: "nier-geom-container",
                setup: (self: any) => timeout(1, () => {
                    self.connect("button-press-event", (_self: any, event: any) => {
                        const [, x, y] = event.get_coords()
                        anchor_x1.set(x); anchor_y1.set(y)
                        anchor_x2.set(x); anchor_y2.set(y)
                    })
                    self.connect("button-release-event", (_self: any, event: any) => {
                        const [, x, y] = event.get_coords()
                        anchor_x2.set(x); anchor_y2.set(y)
                        DESTRUCTION = true
                        self.css = "opacity: 0; transition: opacity 0s linear;"
                        timeout(10, () => {
                            print(`${round(min(anchor_x1.get(), anchor_x2.get()))},${round(min(anchor_y1.get(), anchor_y2.get()))} ${abs(round(anchor_x2.get() - anchor_x1.get())) + 1}x${abs(round(anchor_y2.get() - anchor_y1.get())) + 1}`)
                            App.quit()
                        })
                    })
                    self.connect("motion-notify-event", (_self: any, event: any) => {
                        const [, x, y] = event.get_coords()
                        anchor_x2.set(x); anchor_y2.set(y)
                    })
                }),
                child: Overlay({
                    child: Scrollable({ child: cell_grid }),
                    overlays: [
                        Box({
                            vertical: true,
                            hexpand: false,
                            vexpand: false,
                            className: "nier-geom-select",
                            setup: (self: any) => {
                                anchor_x1.subscribe(() => update_selection(self))
                                anchor_x2.subscribe(() => update_selection(self))
                                anchor_y1.subscribe(() => update_selection(self))
                                anchor_y2.subscribe(() => update_selection(self))
                            },
                        }),
                    ],
                }),
            }),
        })

        // Animate in
        ;(async () => {
            try {
                const [real_x, real_y] = await get_cursor()
                const [center_x, center_y] = pos_mapper(real_x, real_y, SCREEN_WIDTH, SCREEN_HEIGHT, cols, rows)
                const max_dist = (max(center_x, rows - center_x) ** 2 + max(center_y, cols - center_y) ** 2) ** 0.5 + 1

                const start = Date.now()
                draw_duration = 3000
                const fps = 15
                draw_t = start
                final_draw = false
                vertex_step = 3
                opacity_step = 10

                while (true) {
                    const frame_start = Date.now()
                    const time_ratio = (draw_t - start) / draw_duration
                    for (let i = 0; i < rows * cols; i++) {
                        let [co, to, cl, tl, cr, tr, cy, ty, inited, s_override] = cells[i]
                        if (s_override) { entered = true; return }
                        const x = i % cols, y = (i - x) / cols
                        const dist = dist_from_center(x, y, center_x, center_y)
                        if (time_ratio > 1 ? true : dist < max_dist * time_ratio * (rand_int(50, 100) / 100)) {
                            if (!inited) { inited = true; co = 1 }
                            to = 0.5
                            if (dist < 2) { ty = 1; cl = tl = cr = tr = 1 }
                            else if (x < center_x) { tl = 1; cr = tr = cy = ty = 1 }
                            else { tr = 1; cl = tl = cy = ty = 1 }
                        }
                        cells[i] = [co, to, cl, tl, cr, tr, cy, ty, inited, s_override]
                    }
                    final_draw = true
                    wait_for_draw = true
                    cell_grid.queue_draw()
                    while (wait_for_draw) await new Promise(r => setTimeout(r, 1))
                    if (time_ratio > 1) { entered = true; break }
                    draw_t = Date.now()
                    await new Promise(r => setTimeout(r, max(0, 1000 / fps - (draw_t - frame_start))))
                }
            } catch (e) { print(e) }
        })()
    }
})

async function execAsync(cmd: string) {
    const { execAsync } = await import("astal")
    return execAsync(cmd)
}
