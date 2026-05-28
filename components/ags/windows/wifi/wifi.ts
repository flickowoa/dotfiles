// wifi popup - nier styled network list + scanner modal
import {
    Window, Box, Label, Scrollable, Astal,
    Anchor, Layer, Exclusivity, Keymode,
} from "../../widget.ts"
import { execAsync } from "astal"
import Gdk from "gi://Gdk?version=3.0"
import { dark } from "../../env.ts"
import { menuPalette, menuPanelCss, MENU_FONT, NierTab } from "../../nier/menu.ts"
import { RevealBox, type Reveal } from "../../nier/anim.ts"
import { modalOpen, modalClose, addDragDismiss } from "../../nier/stack.ts"

interface Network {
    inUse: boolean
    ssid: string
    signal: number
    security: string
    bssid: string
}

let _win: any = null
let _listBox: any = null
let _statusLbl: any = null
let _panel: any = null
let _reveal: Reveal | null = null
let _rescan: any = null
let _close: any = null
let _scanning = false
let _lastNets: Network[] = []

const signalBars = (s: number) => {
    if (s >= 75) return "▮▮▮▮"
    if (s >= 50) return "▮▮▮▯"
    if (s >= 25) return "▮▮▯▯"
    if (s >= 10) return "▮▯▯▯"
    return "▯▯▯▯"
}

const parseNetworks = (out: string): Network[] => {
    const seen = new Set<string>()
    const list: Network[] = []
    for (const line of out.split("\n")) {
        if (!line.trim()) continue
        const safe = line.replace(/\\:/g, "\x00")
        const parts = safe.split(":").map(p => p.replace(/\x00/g, ":"))
        if (parts.length < 5) continue
        const ssid = parts[1].trim()
        if (!ssid || seen.has(ssid)) continue
        seen.add(ssid)
        list.push({
            inUse: parts[0].trim() === "*",
            ssid,
            signal: parseInt(parts[2]) || 0,
            security: parts[3].trim(),
            bssid: parts[4].trim(),
        })
    }
    list.sort((a, b) => (a.inUse !== b.inUse) ? (a.inUse ? -1 : 1) : b.signal - a.signal)
    return list
}

const networkRow = (n: Network): any => {
    const secured = n.security && n.security !== "--" && n.security.toLowerCase() !== "open"
    const lock = secured ? "🔒" : "  "
    const sym  = n.inUse ? "◆" : "■"
    const sig  = signalBars(n.signal)
    const text = `${sym}  ${sig}  ${lock}  ${n.ssid.slice(0, 26).padEnd(26, " ")}  ${String(n.signal).padStart(3, "0")}%`

    const { box } = NierTab({
        child: Label({ label: text, xalign: 0 }),
        active: n.inUse,
        onClick: () => {
            if (n.inUse) return
            if (secured) {
                execAsync([
                    "kitty", "-e", "sh", "-c",
                    `nmcli dev wifi connect "${n.ssid.replace(/"/g, '\\"')}" --ask; sleep 1`,
                ]).catch(print)
            } else {
                execAsync(["nmcli", "dev", "wifi", "connect", n.ssid]).catch(print)
            }
            setTimeout(() => scan(), 1500)
        },
    })
    return box
}

const scan = async () => {
    if (_scanning) return
    _scanning = true
    if (_statusLbl) _statusLbl.label = "◆ SCANNING…"
    try {
        await execAsync(["nmcli", "dev", "wifi", "rescan"]).catch(() => {})
        const out = await execAsync([
            "nmcli", "-t", "-f", "IN-USE,SSID,SIGNAL,SECURITY,BSSID",
            "dev", "wifi", "list",
        ])
        _lastNets = parseNetworks(out)
        if (_listBox) _listBox.children = _lastNets.map(networkRow)
        if (_statusLbl) {
            _statusLbl.label = _lastNets.length === 0
                ? "◆ NO NETWORKS"
                : `◆ ${_lastNets.length} NETWORK${_lastNets.length === 1 ? "" : "S"} DETECTED`
        }
    } catch (e) {
        if (_statusLbl) _statusLbl.label = "◆ SCAN FAILED"
        print("wifi scan:", e)
    } finally {
        _scanning = false
    }
}

// re-skin the static chrome for the current theme
const restyle = () => {
    const p = menuPalette()
    if (_panel) _panel.css = menuPanelCss()
    if (_statusLbl) _statusLbl.css =
        `font-family:${MENU_FONT};font-size:11px;color:rgba(${p.fg},0.65);letter-spacing:3px;`
    _rescan?.refresh()
    _close?.refresh()
    if (_listBox && _lastNets.length) _listBox.children = _lastNets.map(networkRow)
}

export const isWifiOpen = () => !!_win?.visible

const close = () => {
    if (!_win || !_reveal) return
    modalClose("wifi")
    _reveal.close(() => { _win.visible = false })
}

export const toggleWifi = () => {
    if (!_win) return
    if (_win.visible) {
        close()
        return
    }
    try { _win.marginRight = 18 } catch {}
    restyle()
    _win.visible = true
    _reveal?.open()
    modalOpen("wifi", _win)
    scan().catch(print)
}

export const WifiWindow = () => {
    const p = menuPalette()
    _statusLbl = Label({
        label: "◆ READY",
        css: `font-family:${MENU_FONT};font-size:11px;color:rgba(${p.fg},0.65);letter-spacing:3px;`,
        xalign: 0, hexpand: true,
    })

    _rescan = NierTab({ child: Label({ label: "↻ RESCAN" }), hexpand: false, onClick: () => scan().catch(print) })
    _close  = NierTab({ child: Label({ label: "✕ CLOSE"  }), hexpand: false, onClick: () => toggleWifi() })

    const header = Box({
        spacing: 10,
        css: "padding: 0 0 10px 0;",
        children: [
            Label({
                label: "◆ WIRELESS NETWORKS",
                css: `font-family:${MENU_FONT};font-size:14px;color:rgba(${p.fg},1);letter-spacing:4px;font-weight:700;`,
                xalign: 0,
            }),
            Box({ hexpand: true }),
            _rescan.box,
            _close.box,
        ],
    })

    _listBox = Box({ vertical: true, spacing: 4 })

    const scroll = Scrollable({
        hscroll: "never",
        vscroll: "automatic",
        css: "min-width: 480px; min-height: 380px;",
        child: _listBox,
    })

    _panel = Box({
        vertical: true,
        spacing: 8,
        css: menuPanelCss(),
        children: [header, _statusLbl, scroll],
    })

    _reveal = RevealBox(_panel)

    dark.subscribe(restyle)

    _win = Window({
        name: "wifi",
        className: "wifi",
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
            self.add_events(
                Gdk.EventMask.KEY_PRESS_MASK |
                Gdk.EventMask.BUTTON_PRESS_MASK |
                Gdk.EventMask.BUTTON_RELEASE_MASK |
                Gdk.EventMask.POINTER_MOTION_MASK,
            )
            self.connect("key-press-event", (_w: any, ev: any) => {
                const kv = ev?.keyval ?? ev?.get_keyval?.()?.[1]
                if (kv === Gdk.KEY_Escape || kv === 65307) {
                    close()
                    return true
                }
                return false
            })
            addDragDismiss(self, close, 18)
        },
    })

    return _win
}
