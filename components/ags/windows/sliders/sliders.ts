import { Window, Box, Label, EventBox, DrawingArea, Anchor, Layer, Exclusivity } from "../../widget.ts"
import { execAsync } from "astal"
import Gdk from "gi://Gdk?version=3.0"
import { dark } from "../../env.ts"
import { RevealBox, type Reveal } from "../../nier/anim.ts"
import { MENU_FONT, menuPanelCss, menuPalette } from "../../nier/menu.ts"
import { modalOpen, modalClose, addDragDismiss } from "../../nier/stack.ts"

const { round, min, max } = Math

const N_BARS = 20
const BAR_W = 5
const BAR_GAP = 3
const BAR_MAX_H = 18
const BAR_MIN_H = 2
const SLIDER_W = 40 + N_BARS * (BAR_W + BAR_GAP) - BAR_GAP
const SLIDER_H = 36

interface SliderState {
    win: any
    reveal: Reveal
    area: any
    valLbl: any
    kind: "brt" | "vol"
    value: number
    dragging: boolean
    pendingSet: number | null
    readFn: () => Promise<number>
    writeFn: (v: number) => Promise<void>
}

let s: SliderState | null = null

const readBrightness = async (): Promise<number> => {
    try {
        const raw = await execAsync(["brightnessctl", "get"]).catch(() => "0")
        const maxRaw = await execAsync(["brightnessctl", "max"]).catch(() => "1")
        const cur = parseInt(raw.trim())
        const maxV = parseInt(maxRaw.trim()) || 1
        return cur / maxV
    } catch { return 0 }
}

const writeBrightness = async (v: number) => {
    const pct = round(v * 100)
    await execAsync(["brightnessctl", "set", `${pct}%`]).catch(print)
}

const readVolume = async (): Promise<number> => {
    try {
        const raw = await execAsync(["sh", "-c", "wpctl get-volume @DEFAULT_AUDIO_SINK@"])
        const m = raw.match(/Volume:\s*([\d.]+)/)
        return m ? parseFloat(m[1]) : 0
    } catch { return 0 }
}

const writeVolume = async (v: number) => {
    const pct = round(v * 100)
    await execAsync(["wpctl", "set-volume", "@DEFAULT_AUDIO_SINK@", `${pct}%`]).catch(print)
}

const drawBars = (ctx: any, width: number, height: number, value: number) => {
    const p = menuPalette()
    const [r, g, b] = dark.get()
        ? [218/255, 212/255, 187/255]
        : [87/255,  84/255,  74/255]

    ctx.setSourceRGBA(14/255, 12/255, 9/255, 0.92)
    ctx.rectangle(0, 0, width, height)
    ctx.fill()

    ctx.setSourceRGBA(r, g, b, 0.10)
    ctx.setLineWidth(1)
    ctx.rectangle(0.5, 0.5, width - 1, height - 1)
    ctx.stroke()

    const totalBW = N_BARS * (BAR_W + BAR_GAP) - BAR_GAP
    const startX = (width - totalBW) / 2

    const filledCount = value * N_BARS
    const fullBars = Math.floor(filledCount)
    const frac = filledCount - fullBars

    for (let i = 0; i < N_BARS; i++) {
        const x = startX + i * (BAR_W + BAR_GAP)
        const isFilled = i < fullBars
        const isPartial = i === fullBars && frac > 0.01

        if (isFilled) {
            const barH = BAR_MAX_H
            const y = (height - barH) / 2
            ctx.setSourceRGBA(r, g, b, 0.90)
            ctx.rectangle(x, y, BAR_W, barH)
            ctx.fill()
        } else if (isPartial) {
            const barH = BAR_MAX_H * frac + BAR_MIN_H * (1 - frac)
            const y = (height - barH) / 2
            ctx.setSourceRGBA(r, g, b, 0.90)
            ctx.rectangle(x, y, BAR_W, barH)
            ctx.fill()
        } else {
            const y = (height - BAR_MIN_H) / 2
            ctx.setSourceRGBA(r, g, b, 0.12)
            ctx.rectangle(x, y, BAR_W, BAR_MIN_H)
            ctx.fill()
        }
    }
}

const ensure = async () => {
    if (s) return s

    const valLbl = Label({
        label: "---%",
        css: `font-family:${MENU_FONT};font-size:14px;color:rgba(218,212,187,1);letter-spacing:2px;`,
        xalign: 1, hexpand: true,
    })

    const da = DrawingArea()
    da.set_size_request(SLIDER_W, SLIDER_H)

    da.connect("draw", (_w: any, ctx: any) => {
        const a = da.get_allocation()
        drawBars(ctx, a.width || SLIDER_W, a.height || SLIDER_H, s?.value ?? 0)
        return false
    })

    const area = EventBox({
        setup: (self: any) => {
            self.add_events(
                Gdk.EventMask.BUTTON_PRESS_MASK |
                Gdk.EventMask.BUTTON_RELEASE_MASK |
                Gdk.EventMask.POINTER_MOTION_MASK,
            )
        },
        child: da,
    })

    const panel = Box({
        vertical: true,
        spacing: 6,
        css: menuPanelCss(),
        children: [
            Box({ children: [
                Label({
                    label: "◆ ADJUST",
                    css: `font-family:${MENU_FONT};font-size:11px;color:rgba(218,212,187,0.55);letter-spacing:3px;`,
                    xalign: 0,
                }),
                valLbl,
            ]}),
            area,
        ],
    })
    const reveal = RevealBox(panel)

    const win = Window({
        name: "sliders",
        className: "sliders",
        anchor: Anchor.TOP | Anchor.RIGHT,
        marginTop: 70,
        marginRight: 20,
        exclusivity: Exclusivity.IGNORE,
        layer: Layer.OVERLAY,
        focusable: false,
        visible: false,
        child: reveal.container,
        setup: (self: any) => {
            self.add_events(
                Gdk.EventMask.KEY_PRESS_MASK |
                Gdk.EventMask.BUTTON_PRESS_MASK |
                Gdk.EventMask.BUTTON_RELEASE_MASK |
                Gdk.EventMask.POINTER_MOTION_MASK,
            )
            self.connect("key-press-event", (_w: any, ev: any) => {
                const kv = ev?.keyval ?? ev?.get_keyval?.()?.[1]
                if (kv === Gdk.KEY_Escape || kv === 65307) { close(); return true }
                return false
            })
            addDragDismiss(self, close, 20)
        },
    })

    let dragging = false
    const updateFromEvent = (ev: any) => {
        try {
            const coords = ev.get_coords?.()
            const xPos = Array.isArray(coords) ? Number(coords[1] ?? 0) : 0
            const a = da.get_allocation()
            const totalBW = N_BARS * (BAR_W + BAR_GAP) - BAR_GAP
            const startX = ((a.width || SLIDER_W) - totalBW) / 2
            const rawVal = (xPos - startX) / totalBW
            const newVal = max(0, min(1, rawVal))
            if (s) {
                s.value = newVal
                s.valLbl.label = `${round(newVal * 100)}%`
                s.area.queue_draw()
                s.pendingSet = newVal
            }
        } catch (e) { print("slider update:", e) }
    }

    area.connect("button-press-event", (_w: any, ev: any) => {
        dragging = true
        s!.dragging = true
        updateFromEvent(ev)
        return true
    })
    area.connect("button-release-event", () => {
        dragging = false
        if (s) {
            s.dragging = false
            if (s.pendingSet !== null) {
                s.writeFn(s.pendingSet).catch(print)
                s.pendingSet = null
            }
        }
        return true
    })
    area.connect("motion-notify-event", (_w: any, ev: any) => {
        if (!dragging) return false
        updateFromEvent(ev)
        return true
    })

    s = { win, reveal, area: da, valLbl, kind: "brt", value: 0.5, dragging, pendingSet: null, readFn: readBrightness, writeFn: writeBrightness }
    return s
}

const open = async (kind: "brt" | "vol") => {
    const st = await ensure()
    if (!st.win || !st.reveal) return
    try { st.win.marginRight = 20 } catch {}

    st.kind = kind
    if (kind === "brt") {
        st.readFn = readBrightness
        st.writeFn = writeBrightness
    } else {
        st.readFn = readVolume
        st.writeFn = writeVolume
    }

    const v = await st.readFn()
    st.value = v
    st.valLbl.label = `${round(v * 100)}%`
    st.area.queue_draw()

    st.win.visible = true
    st.reveal.open()
    modalOpen("sliders", st.win)
}

const close = () => {
    if (!s) return
    modalClose("sliders")
    if (s.pendingSet !== null) {
        s.writeFn(s.pendingSet).catch(print)
        s.pendingSet = null
    }
    s.reveal?.close(() => { s.win.visible = false })
}

export const toggleSlider = (kind: "brt" | "vol") => {
    if (!s) { open(kind).catch(print); return }
    if (s.win.visible && s.kind === kind) { close(); return }
    open(kind).catch(print)
}

export const isSliderOpen = (): "brt" | "vol" | null => {
    if (!s || !s.win.visible) return null
    return s.kind
}

export const SlidersWindow = () => {
    ensure().catch(() => {})
    return s?.win ?? null
}
