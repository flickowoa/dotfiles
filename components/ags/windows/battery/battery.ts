import { Window, Box, Label, Anchor, Layer, Exclusivity } from "../../widget.ts"
import { execAsync } from "astal"
import Gdk from "gi://Gdk?version=3.0"
import Gio from "gi://Gio"
import GLib from "gi://GLib"
import { dark } from "../../env.ts"
import { RevealBox, type Reveal } from "../../nier/anim.ts"
import { MENU_FONT, menuPalette, menuPanelCss, RailTab } from "../../nier/menu.ts"
import { modalOpen, modalClose, addDragDismiss } from "../../nier/stack.ts"

const { round } = Math

const W = 360

let _win: any = null
let _reveal: Reveal | null = null
let _panel: any = null
let _pctLbl: any = null
let _statusLbl: any = null
let _procBox: any = null
let _profileBtns: any[] = []

const readFile = (path: string): string => {
    try {
        const f = Gio.File.new_for_path(path)
        const [, data] = f.load_contents(null)
        return new TextDecoder().decode(data)
    } catch { return "" }
}

const findBatteryDir = (): string | null => {
    const paths = [
        "/sys/class/power_supply/BAT0",
        "/sys/class/power_supply/BAT1",
        "/sys/class/power_supply/BATC",
    ]
    for (const p of paths) {
        try {
            if (Gio.File.new_for_path(p).query_exists(null)) return p
        } catch {}
    }
    return null
}

const getBatteryPct = (): number | null => {
    const dir = findBatteryDir()
    if (!dir) return null
    const cap = parseInt(readFile(`${dir}/capacity`).trim())
    return isNaN(cap) ? null : cap
}

const refresh = async () => {
    const p = menuPalette()

    const pct = getBatteryPct()
    if (_pctLbl) {
        _pctLbl.label = pct !== null ? `${pct}%` : "AC"
        const pctColor = pct !== null
            ? (pct > 20 ? `rgba(${p.fg},1)` : "rgba(220,60,50,1)")
            : `rgba(${p.fg},1)`
        _pctLbl.css = `font-family:${MENU_FONT};font-size:24px;color:${pctColor};letter-spacing:3px;font-weight:700;`
    }

    if (_statusLbl) {
        _statusLbl.label = pct !== null ? `◆ BATTERY ${pct}%` : "◆ AC POWER"
    }

    try {
        const raw = await execAsync(["sh", "-c", "ps aux --sort=-%cpu 2>/dev/null | head -6"])
        const lines = raw.trim().split("\n").slice(1)
        if (_procBox) {
            _procBox.children = lines.map((line: string) => {
                const parts = line.split(/\s+/)
                const cpu = parts[2] || "0"
                const mem = parts[3] || "0"
                const cmd = parts.slice(10).join(" ") || "?"
                return Box({
                    spacing: 6,
                    children: [
                        Label({
                            label: `${cpu}%`,
                            css: `font-family:${MENU_FONT};font-size:10px;color:rgba(${p.fg},0.9);letter-spacing:1px;min-width:40px;`,
                            xalign: 1,
                        }),
                        Label({
                            label: cmd.slice(0, 35),
                            css: `font-family:${MENU_FONT};font-size:10px;color:rgba(${p.fg},0.5);letter-spacing:1px;`,
                            xalign: 0, hexpand: true,
                        }),
                    ],
                })
            })
        }
    } catch (e) { print("battery procs:", e) }
}

const setProfile = async (profile: string) => {
    try {
        await execAsync(["powerprofilesctl", "set", profile])
    } catch (e) { print("profile set:", e) }
    for (const btn of _profileBtns) {
        btn.setActive?.(btn.profile === profile)
    }
}

const profileBtn = (label: string, profile: string): any => {
    let active = false
    const text = Label({
        label,
        css: `font-family:${MENU_FONT};font-size:10px;letter-spacing:2px;`,
        xalign: 0.5, hexpand: true,
    })
    const { box } = RailTab({
        content: text,
        square: true,
        squareSize: 10,
        hexpand: true,
        getActive: () => active,
        onSingle: () => setProfile(profile),
    })
    ;(box as any).profile = profile
    ;(box as any).setActive = (v: boolean) => { active = v; box.queue_draw() }
    _profileBtns.push(box)
    return box
}

const open = async () => {
    if (!_win || !_reveal) return
    try { _win.marginRight = 20 } catch {}
    await refresh()

    try {
        const cur = (await execAsync(["powerprofilesctl", "get"])).trim()
        for (const btn of _profileBtns) {
            btn.setActive?.(btn.profile === cur)
        }
    } catch {}

    _win.visible = true
    _reveal.open()
    modalOpen("battery", _win)
}

const close = () => {
    if (!_win || !_reveal) return
    modalClose("battery")
    _reveal.close(() => { _win.visible = false })
}

export const toggleBattery = () => {
    if (!_win) return
    if (_win.visible) { close(); return }
    open().catch(print)
}

export const isBatteryOpen = () => !!_win?.visible

export const BatteryWindow = () => {
    const p = menuPalette()

    _statusLbl = Label({
        label: "◆ BATTERY",
        css: `font-family:${MENU_FONT};font-size:11px;color:rgba(${p.fg},0.55);letter-spacing:3px;`,
        xalign: 0,
    })
    _pctLbl = Label({
        label: "---",
        css: `font-family:${MENU_FONT};font-size:24px;color:rgba(${p.fg},1);letter-spacing:3px;font-weight:700;`,
        xalign: 1, hexpand: true,
    })

    const profileRow = Box({
        spacing: 6,
        homogeneous: true,
        children: [
            profileBtn("PERFORMANCE", "performance"),
            profileBtn("BALANCED", "balanced"),
            profileBtn("POWER SAVER", "power-saver"),
        ],
    })

    _procBox = Box({ vertical: true, spacing: 3 })

    const panel = Box({
        vertical: true,
        spacing: 8,
        css: menuPanelCss(),
        children: [
            Box({ children: [_statusLbl, _pctLbl] }),
            Label({
                label: "POWER PROFILE",
                css: `font-family:${MENU_FONT};font-size:9px;color:rgba(${p.fg},0.55);letter-spacing:3px;margin-top:4px;`,
                xalign: 0,
            }),
            profileRow,
            Label({
                label: "TOP PROCESSES",
                css: `font-family:${MENU_FONT};font-size:9px;color:rgba(${p.fg},0.55);letter-spacing:3px;margin-top:8px;`,
                xalign: 0,
            }),
            _procBox,
        ],
    })
    _panel = panel
    _reveal = RevealBox(panel)

    _win = Window({
        name: "battery",
        className: "battery",
        anchor: Anchor.TOP | Anchor.RIGHT,
        marginTop: 70,
        marginRight: 20,
        exclusivity: Exclusivity.IGNORE,
        layer: Layer.OVERLAY,
        focusable: false,
        visible: false,
        child: _reveal.container,
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

    return _win
}
