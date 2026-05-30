// calendar popup - nier styled month grid. opens from the clock frame, prev/next

import { Window, Box, Label, Anchor, Layer, Exclusivity, Keymode, Astal } from "../../widget.ts"
import Gdk from "gi://Gdk?version=3.0"
import { dark } from "../../env.ts"
import { menuPalette, menuPanelCss, MENU_FONT, NierTab } from "../../nier/menu.ts"
import { RevealBox, type Reveal } from "../../nier/anim.ts"

let _win: any = null
let _gridBox: any = null
let _headerLbl: any = null
let _panel: any = null
let _reveal: Reveal | null = null
let _prev: any = null
let _next: any = null
let _viewedYear  = 0
let _viewedMonth = 0   // 0..11

const monthName = (m: number) =>
    ["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE","JULY",
     "AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"][m]

const dayCellCss = (state: "today" | "dim" | "norm") => {
    const p = menuPalette()
    const base = `
        min-width: 34px; min-height: 30px;
        padding: 2px 0;
        font-family: ${MENU_FONT};
        font-size: 12px;
        background: transparent;
        border: 1px solid transparent;
        letter-spacing: 1px;
    `
    if (state === "today") return base + `
        background: rgba(${p.fg},1);
        border-color: rgba(${p.fg},1);
        color: rgba(${p.bg},1);
        font-weight: bold;
    `
    if (state === "dim") return base + `color: rgba(${p.fg},0.40);`
    return base + `color: rgba(${p.fg},0.95);`
}

const rebuildGrid = () => {
    if (!_gridBox || !_headerLbl) return
    const p = menuPalette()
    _headerLbl.label = `◆ ${monthName(_viewedMonth)} ${_viewedYear}`

    const firstOfMonth = new Date(_viewedYear, _viewedMonth, 1)
    const startDow = firstOfMonth.getDay()   // 0=Sun
    const daysInMonth = new Date(_viewedYear, _viewedMonth + 1, 0).getDate()
    const daysInPrev  = new Date(_viewedYear, _viewedMonth, 0).getDate()

    const now = new Date()
    const isCurrentMonth = now.getFullYear() === _viewedYear && now.getMonth() === _viewedMonth
    const today = now.getDate()

    const dowRow = Box({
        spacing: 4,
        hpack: "center",
        children: ["SUN","MON","TUE","WED","THU","FRI","SAT"].map(d =>
            Label({
                label: d,
                css: `
                    min-width: 34px;
                    color: rgba(${p.fg},0.50);
                    font-family: ${MENU_FONT};
                    font-size: 9px;
                    letter-spacing: 2px;
                `,
                xalign: 0.5,
            })),
    })

    const rows: any[] = [dowRow]
    let day = 1
    let prevDay = daysInPrev - startDow + 1
    let nextDay = 1

    for (let row = 0; row < 6; row++) {
        const rowChildren: any[] = []
        for (let col = 0; col < 7; col++) {
            const idx = row * 7 + col
            let lbl: any
            if (idx < startDow) {
                lbl = Label({ label: String(prevDay++), css: dayCellCss("dim"),  xalign: 0.5 })
            } else if (day <= daysInMonth) {
                const today_ = isCurrentMonth && day === today
                lbl = Label({ label: String(day), css: dayCellCss(today_ ? "today" : "norm"), xalign: 0.5 })
                day++
            } else {
                lbl = Label({ label: String(nextDay++), css: dayCellCss("dim"), xalign: 0.5 })
            }
            rowChildren.push(lbl)
        }
        rows.push(Box({ spacing: 4, hpack: "center", children: rowChildren }))
        if (day > daysInMonth && nextDay > 7) break
    }

    _gridBox.children = rows
}

const stepMonth = (delta: number) => {
    _viewedMonth += delta
    while (_viewedMonth < 0)  { _viewedMonth += 12; _viewedYear-- }
    while (_viewedMonth > 11) { _viewedMonth -= 12; _viewedYear++ }
    rebuildGrid()
}

const restyle = () => {
    const p = menuPalette()
    if (_panel) _panel.css = menuPanelCss()
    if (_headerLbl) _headerLbl.css =
        `font-family:${MENU_FONT};font-size:14px;color:rgba(${p.fg},1);letter-spacing:4px;font-weight:700;`
    _prev?.refresh()
    _next?.refresh()
    rebuildGrid()
}

export const isCalendarOpen = () => !!_win?.visible

export const toggleCalendar = () => {
    if (!_win) return
    if (_win.visible) {
        _reveal?.close(() => { _win.visible = false })
        return
    }
    const now = new Date()
    _viewedYear  = now.getFullYear()
    _viewedMonth = now.getMonth()
    restyle()
    _win.visible = true
    _reveal?.open()
}

export const CalendarWindow = () => {
    const p = menuPalette()
    _headerLbl = Label({
        label: "◆ ---",
        css: `font-family:${MENU_FONT};font-size:14px;color:rgba(${p.fg},1);letter-spacing:4px;font-weight:700;`,
        xalign: 0.5, hexpand: true,
    })

    _gridBox = Box({ vertical: true, spacing: 3, hpack: "center" })

    _prev = NierTab({ child: Label({ label: "◀" }), hexpand: false, size: 14, onClick: () => stepMonth(-1) })
    _next = NierTab({ child: Label({ label: "▶" }), hexpand: false, size: 14, onClick: () => stepMonth(+1) })

    const header = Box({
        spacing: 10, hpack: "fill",
        css: "padding: 0 0 10px 0;",
        children: [_prev.box, _headerLbl, _next.box],
    })

    _panel = Box({
        vertical: true,
        spacing: 10,
        css: menuPanelCss(),
        children: [header, _gridBox],
    })

    _reveal = RevealBox(_panel)

    dark.subscribe(restyle)

    _win = Window({
        name: "calendar",
        className: "calendar",
        anchor: Anchor.TOP | Anchor.RIGHT,
        marginTop: 70,
        marginRight: 18,
        exclusivity: Exclusivity.IGNORE,
        layer: Layer.OVERLAY,
        keymode: Keymode.ON_DEMAND,
        focusable: true,
        visible: false,
        child: _reveal.container,
        setup: (self: any) => {
            try { Astal.widget_set_click_through?.(self, false) } catch {}
            self.add_events(Gdk.EventMask.KEY_PRESS_MASK)
            self.connect("key-press-event", (_w: any, ev: any) => {
                const kv = ev?.keyval ?? ev?.get_keyval?.()?.[1]
                if (kv === Gdk.KEY_Escape || kv === 65307) {
                    _reveal?.close(() => { self.visible = false })
                    return true
                }
                return false
            })
        },
    })

    return _win
}
