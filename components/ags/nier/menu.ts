import { Box, EventBox, DrawingArea, Astal } from "../widget.ts"
import Gdk from "gi://Gdk?version=3.0"
import GLib from "gi://GLib"
import { interval } from "astal"
import { dark } from "../env.ts"

const toRGB = (s: string): [number, number, number] => {
    const [r, g, b] = s.split(",").map(n => parseFloat(n) / 255)
    return [r, g, b]
}

export const MENU_FONT = `"FOT-Rodin Pro M","Noto Sans Mono",monospace`

export const menuPalette = () => dark.get()
    ? { bg: "28,26,21", fg: "234,228,210" }   // dark: cream on near-black
    : { bg: "194,189,166", fg: "72,70,61" }   // light: brown on tan

export const menuPanelCss = () => {
    const p = menuPalette()
    return `
        background: rgba(${p.bg},0.97);
        border: 2px solid rgba(${p.fg},0.85);
        padding: 18px 22px;
        color: rgba(${p.fg},1);
    `
}

type State = "idle" | "hover" | "active"

const RAIL_H = 3
const GAP_H  = 3
export const FRAME_BODY_H = 32
export const FRAME_TOTAL_H = FRAME_BODY_H + (RAIL_H + GAP_H) * 2   // 44
const ACTIVE_BODY_H = 38

export const RailTab = ({
    content, onSingle, onDouble, onButton, getActive, onState,
    active = false, hexpand = true, bodyPadding = "0 14px", fontSize,
    square = false, squareSize = 14,
}: {
    content: any
    onSingle?: (ev?: any) => void
    onDouble?: (ev?: any) => void
    onButton?: (button: number, ev: any) => boolean | void
    getActive?: () => boolean
    onState?: (state: State) => void
    active?: boolean
    hexpand?: boolean
    bodyPadding?: string
    fontSize?: number
    square?: boolean
    squareSize?: number
}) => {
    const topRail    = Box({ hexpand: true })
    const bottomRail = Box({ hexpand: true })
    const topGap     = Box({ hexpand: true })
    const bottomGap  = Box({ hexpand: true })
    let sqRGB: [number, number, number] = [0, 0, 0]
    const sq = square ? DrawingArea({ vexpand: false, hexpand: false }) : null
    if (sq) {
        sq.set_size_request(squareSize, squareSize)
        try { sq.set_valign(3) } catch {}   // CENTER
        try { sq.set_halign(1) } catch {}   // START
        sq.connect("draw", (_w: any, ctx: any) => {
            ctx.setSourceRGBA(sqRGB[0], sqRGB[1], sqRGB[2], 1)
            ctx.rectangle(0, 0, squareSize, squareSize)
            ctx.fill()
            return false
        })
    }
    const bodyKids = sq ? [sq, content] : [content]
    const body = Box({ hexpand, vpack: "center", spacing: sq ? 9 : 0, children: bodyKids })
    body.set_size_request(-1, FRAME_BODY_H)
    const outer = Box({ vertical: true, hexpand, children: [topRail, topGap, body, bottomGap, bottomRail] })

    let hovering = false
    let isActive = active

    const apply = () => {
        const p = menuPalette()
        const state: State = isActive ? "active" : (hovering ? "hover" : "idle")
        const sel    = state !== "idle"
        const isAct  = state === "active"
        const fillA  = sel ? 1 : 0.18
        const txt    = sel ? `rgba(${p.bg},1)` : `rgba(${p.fg},1)`
        const fs     = fontSize ? `font-family:${MENU_FONT};font-size:${fontSize}px;letter-spacing:1px;` : ""
        const bodyH  = isAct ? ACTIVE_BODY_H : FRAME_BODY_H
        body.css = `
            ${fs}
            min-height: ${bodyH}px;
            background: rgba(${p.fg},${fillA});
            background-image: none;
            color: ${txt};
            padding: ${bodyPadding};
            transition: min-height 160ms ease, background-color 180ms ease, color 120ms ease;
        `
        if (sq) { sqRGB = sel ? toRGB(p.bg) : toRGB(p.fg); sq.queue_draw() }
        const railColor = state === "hover" ? `rgba(${p.fg},1)` : "transparent"
        topRail.css = `
            min-height: ${RAIL_H}px; margin: 0 3px;
            background: ${railColor}; background-image: none;
            transition: background-color 180ms ease;
        `
        bottomRail.css = `
            min-height: ${isAct ? 0 : RAIL_H}px; margin: 0 3px;
            background: ${railColor}; background-image: none;
            transition: background-color 180ms ease, min-height 160ms ease;
        `
        const tG = isAct ? (FRAME_TOTAL_H - RAIL_H - bodyH) : GAP_H
        const bG = isAct ? 0 : GAP_H
        topGap.css    = `min-height: ${tG}px; transition: min-height 160ms ease;`
        bottomGap.css = `min-height: ${bG}px; transition: min-height 160ms ease;`
        onState?.(state)
    }

    const refresh = () => apply()
    const setActive = (v: boolean) => { if (v !== isActive) { isActive = v; apply() } }
    apply()

    const unsub = dark.subscribe(apply)
    const activeTimer = getActive ? interval(200, () => {
        const a = !!getActive()
        if (a !== isActive) { isActive = a; apply() }
    }) : null

    let cleaned = false
    const cleanup = () => {
        if (cleaned) return
        cleaned = true
        try { activeTimer?.cancel() } catch {}
        try { unsub() } catch {}
    }
    outer.connect("unrealize", cleanup)

    let pendingSingle: number | null = null
    const box = EventBox({
        child: outer,
        hexpand,
        setup: (self: any) => {
            try { Astal.widget_set_click_through?.(self, false) } catch {}
            try { self.set_visible_window(true) } catch {}
            self.add_events(
                Gdk.EventMask.BUTTON_PRESS_MASK |
                Gdk.EventMask.ENTER_NOTIFY_MASK |
                Gdk.EventMask.LEAVE_NOTIFY_MASK,
            )
            self.connect("enter-notify-event", () => { hovering = true;  apply(); return false })
            self.connect("leave-notify-event", () => { hovering = false; apply(); return false })
            if (onSingle || onDouble || onButton) {
                self.connect("button-press-event", (_w: any, ev: any) => {
                    const btn = ev?.get_button?.()?.[1] ?? ev?.button?.button ?? 0
                    if (btn !== 1 && onButton) return onButton(btn, ev) ?? true

                    const dbl = ev.type === Gdk.EventType.DOUBLE_BUTTON_PRESS || ev.type === 5
                    if (onDouble && dbl) {
                        if (pendingSingle !== null) { GLib.source_remove(pendingSingle); pendingSingle = null }
                        onDouble(ev)
                        return true
                    }
                    const single = ev.type === Gdk.EventType.BUTTON_PRESS || ev.type === 4
                    if (single) {
                        if (onButton && btn === 1) {
                            const handled = onButton(btn, ev)
                            if (handled ?? true) return true
                        }
                        if (onDouble) {
                            if (pendingSingle !== null) GLib.source_remove(pendingSingle)
                            pendingSingle = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 260, () => {
                                pendingSingle = null; onSingle?.(ev); return false
                            })
                        } else {
                            onSingle?.(ev)   // immediate single-click
                        }
                        return true
                    }
                    return false
                })
            }
        },
    })

    return { box, refresh, setActive, inner: body }
}

export const NierTab = ({ child, onClick, active = false, hexpand = true, size = 13 }: {
    child: any
    onClick?: (ev?: any) => void
    active?: boolean
    hexpand?: boolean
    size?: number
}) => RailTab({ content: child, onSingle: onClick, active, hexpand, fontSize: size })
