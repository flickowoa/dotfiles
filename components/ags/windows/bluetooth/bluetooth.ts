/// bluetooth module modal


import {
    Window, Box, Label, Scrollable, Icon, Overlay, DrawingArea, Astal,
    Anchor, Layer, Exclusivity, Keymode,
} from "../../widget.ts"
import Gdk from "gi://Gdk?version=3.0"
import AstalBluetooth from "gi://AstalBluetooth"
import { execAsync, interval } from "astal"
import { dark } from "../../env.ts"
import { menuPalette, menuPanelCss, MENU_FONT, RailTab } from "../../nier/menu.ts"
import { RevealBox, type Reveal } from "../../nier/anim.ts"

const bluetooth = AstalBluetooth.get_default()

let _win: any = null
let _listBox: any = null
let _statusLbl: any = null
let _panel: any = null
let _reveal: Reveal | null = null
let _rescan: any = null
let _close: any = null
let _scanning = false
let _actWin: any = null
let _actPanel: any = null
let _actList: any = null
let _actReveal: Reveal | null = null
let _actBackdrop: any = null

const ACT_TILE_W = 160
const ACT_TILE_H = Math.round(Math.sqrt(ACT_TILE_W ** 2 - (ACT_TILE_W / 2) ** 2))

const isBluetoothEnabled = () => !!bluetooth.is_powered

export const setBluetoothPowered = (want: boolean) => {
    try { bluetooth.adapter.powered = want } catch {}
    try { bluetooth.is_powered = want } catch {}
    if (bluetooth.is_powered !== want) {
        try { bluetooth.toggle?.() } catch {}
        try { bluetooth.is_powered = want } catch {}
    }
}

const audioMacs = new Set<string>()
let _audioRefreshing = false
export const refreshAudioMacs = (onChange?: () => void) => {
    if (_audioRefreshing) return
    _audioRefreshing = true
    const done = () => { _audioRefreshing = false }
    // pactl list shortdumps everything, sinks + sources included
    execAsync(["pactl", "list", "short"])
        .then((out: string) => {
            const next = new Set<string>()
            // node name uses underscores (bluez_output) or colons (bluez_input)
            const re = /bluez_(?:output|input)\.([0-9A-Fa-f]{2}(?:[_:][0-9A-Fa-f]{2}){5})/g
            let m: RegExpExecArray | null
            while ((m = re.exec(out)) !== null) next.add(m[1].replace(/_/g, ":").toUpperCase())
            const changed = next.size !== audioMacs.size || [...next].some(x => !audioMacs.has(x))
            audioMacs.clear()
            next.forEach(x => audioMacs.add(x))
            done()
            if (changed) { try { onChange?.() } catch (e) { print(e) } }
        })
        .catch(() => done())
}

export const isDeviceConnected = (device: any): boolean => {
    try { if (device?.connected) return true } catch {}
    try {
        const addr = String(device?.address ?? device?.get_address?.() ?? "").toUpperCase()
        return !!addr && audioMacs.has(addr)
    } catch { return false }
}

// connect_device / disconnect_device are async (they have a _finish pair), so
// calling them without a callback was kinda flaw. passin one so it actually fires anany bluez error shows up in the log instead of just doing nothing.
export const connectDevice = (device: any, then?: () => void) => {
    const after = () => { refreshAudioMacs(() => {}); try { then?.() } catch (e) { print(e) } }
    try {
        device.connect_device((src: any, res: any) => {
            try { src.connect_device_finish(res) } catch (e: any) { print("bt connect:", e?.message ?? e) }
            after()
        })
    } catch (e) { print("bt connect(call):", e); try { device.connect_device?.() } catch {} ; after() }
}

export const disconnectDevice = (device: any, then?: () => void) => {
    const after = () => { refreshAudioMacs(() => {}); try { then?.() } catch (e) { print(e) } }
    try {
        device.disconnect_device((src: any, res: any) => {
            try { src.disconnect_device_finish(res) } catch (e: any) { print("bt disconnect:", e?.message ?? e) }
            after()
        })
    } catch (e) { print("bt disconnect(call):", e); try { device.disconnect_device?.() } catch {} ; after() }
}

const scheduleRefresh = () => setTimeout(() => rebuildList(), 350)

const closeBluetoothActions = () => {
    if (!_actWin?.visible) return
    _actReveal?.close(() => { _actWin.visible = false })
}

const actionButton = (label: string, fn: () => void) =>
    RailTab({
        content: Label({ label }),
        hexpand: true,
        fontSize: 13,
        bodyPadding: "8px 14px",
        onSingle: () => {
            try { fn() } catch (e) { print("bt action:", e) }
            scheduleRefresh()
            closeBluetoothActions()
        },
    }).box

export const openBluetoothActions = (device: any) => {
    if (!_actWin || !_actList) return
    const rows: any[] = [
        Label({
            label: String(device.alias ?? device.name ?? "DEVICE").toUpperCase(),
            xalign: 0,
            css: `font-family:${MENU_FONT};font-size:14px;letter-spacing:3px;font-weight:700;color:rgba(${menuPalette().fg},1);`,
        }),
    ]
    const connected = isDeviceConnected(device)
    if (!device.paired) rows.push(actionButton("Pair", () => device.pair?.()))
    if (device.paired && !connected) rows.push(actionButton("Connect", () => connectDevice(device)))
    if (connected) rows.push(actionButton("Disconnect", () => disconnectDevice(device)))
    if (device.paired) rows.push(actionButton("Unpair", () => bluetooth.adapter?.remove_device?.(device)))
    _actList.children = rows
    if (_actWin.visible) return
    _actWin.visible = true
    _actReveal?.open()
}

const deviceRow = (device: any) => {
    const title = String(device.alias ?? device.name ?? "Device")
    const connected = isDeviceConnected(device)
    const subtitle = connected ? "CONNECTED" : (device.paired ? "PAIRED" : "AVAILABLE")
    const p = menuPalette()
    const titleLbl = Label({ label: title, xalign: 0 })
    const subtitleLbl = Label({ label: subtitle, xalign: 0 })
    const applyTextState = (state: "idle" | "hover" | "active") => {
        const sel = state !== "idle"
        const fg = sel ? p.bg : p.fg
        titleLbl.css = `font-family:${MENU_FONT};font-size:13px;letter-spacing:1px;font-weight:700;color:rgba(${fg},1);`
        subtitleLbl.css = `font-family:${MENU_FONT};font-size:9px;letter-spacing:2px;color:rgba(${fg},${sel ? "0.78" : "0.55"});`
    }
    const content = Box({
        spacing: 12,
        hexpand: true,
        children: [
            Icon({ icon: "bluetooth-active-symbolic", size: 18, css: connected ? "" : "opacity:0.7;" }),
            Box({ vertical: true, spacing: 2, hexpand: true, children: [titleLbl, subtitleLbl] }),
        ],
    })
    applyTextState("idle")
    const tab = RailTab({
        content,
        hexpand: true,
        bodyPadding: "8px 14px",
        getActive: () => isDeviceConnected(device),
        onSingle: () => openBluetoothActions(device),
        onState: (state: any) => applyTextState(state),
    })
    try {
        tab.box.add_events(Gdk.EventMask.BUTTON_PRESS_MASK | Gdk.EventMask.BUTTON_RELEASE_MASK)
        tab.box.connect("button-release-event", (_w: any, ev: any) => {
            const btn = ev?.button ?? ev?.get_button?.()?.[1] ?? 0
            if (btn === 3) {
                openBluetoothActions(device)
                return true
            }
            return false
        })
    } catch {}
    return tab.box
}

const rebuildList = () => {
    if (!_listBox) return
    if (!isBluetoothEnabled()) {
        _listBox.children = [
            RailTab({
                content: Label({ label: "ENABLE BLUETOOTH" }),
                hexpand: false,
                fontSize: 13,
                onSingle: () => {
                    setBluetoothPowered(true)
                    rebuildList()
                },
            }).box,
        ]
        if (_statusLbl) _statusLbl.label = "◆ BLUETOOTH OFF"
        return
    }

    const devices = Array.from(bluetooth.devices ?? [])
    _listBox.children = devices.length
        ? devices.map(deviceRow)
        : [Label({
            label: "◆ NO DEVICES FOUND",
            xalign: 0,
            css: `font-family:${MENU_FONT};font-size:11px;color:rgba(${menuPalette().fg},0.65);letter-spacing:3px;`,
        })]
    if (_statusLbl) {
        _statusLbl.label = devices.length === 0
            ? "◆ NO DEVICES"
            : `◆ ${devices.length} DEVICE${devices.length === 1 ? "" : "S"}`
    }
}

const rescan = async () => {
    if (_scanning) return
    if (!isBluetoothEnabled()) {
        setBluetoothPowered(true)
        rebuildList()
        return
    }
    _scanning = true
    if (_statusLbl) _statusLbl.label = "◆ SCANNING…"
    try {
        try { bluetooth.adapter?.set_pairable?.(true) } catch {}
        try { bluetooth.adapter?.start_discovery?.() } catch {}
        rebuildList()
        setTimeout(() => {
            try { bluetooth.adapter?.stop_discovery?.() } catch {}
            rebuildList()
        }, 4000)
    } finally {
        _scanning = false
    }
}

const restyle = () => {
    const p = menuPalette()
    if (_panel) _panel.css = menuPanelCss()
    if (_statusLbl) _statusLbl.css =
        `font-family:${MENU_FONT};font-size:11px;color:rgba(${p.fg},0.65);letter-spacing:3px;`
    _rescan?.refresh?.()
    _close?.refresh?.()
    rebuildList()
}

export const isBluetoothModalOpen = () => !!_win?.visible

export const toggleBluetoothModal = () => {
    if (!_win) return
    if (_win.visible) {
        _reveal?.close(() => { _win.visible = false })
        return
    }
    restyle()
    _win.visible = true
    _reveal?.open()
    rebuildList()
}

export const openBluetoothModal = () => {
    if (isBluetoothModalOpen()) return
    toggleBluetoothModal()
}

export const BluetoothWindow = () => {
    const p = menuPalette()
    _statusLbl = Label({
        label: "◆ READY",
        css: `font-family:${MENU_FONT};font-size:11px;color:rgba(${p.fg},0.65);letter-spacing:3px;`,
        xalign: 0, hexpand: true,
    })

    _rescan = RailTab({
        content: Label({ label: "↻ RESCAN" }),
        hexpand: false,
        fontSize: 13,
        onSingle: () => { rescan().catch?.(print) },
    })
    _close = RailTab({
        content: Label({ label: "✕ CLOSE" }),
        hexpand: false,
        fontSize: 13,
        onSingle: () => toggleBluetoothModal(),
    })

    _listBox = Box({ vertical: true, spacing: 4 })

    const header = Box({
        spacing: 10,
        css: "padding: 0 0 10px 0;",
        children: [
            Label({
                label: "◆ BLUETOOTH DEVICES",
                css: `font-family:${MENU_FONT};font-size:14px;color:rgba(${p.fg},1);letter-spacing:4px;font-weight:700;`,
                xalign: 0,
            }),
            Box({ hexpand: true }),
            _rescan.box,
            _close.box,
        ],
    })

    const scroll = Scrollable({
        hscroll: "never",
        vscroll: "automatic",
        css: "min-width: 420px; min-height: 320px;",
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

    try { bluetooth.connect("notify::devices", rebuildList) } catch {}
    try { bluetooth.connect("notify::is-powered", rebuildList) } catch {}

    _win = Window({
        name: "bluetooth",
        className: "bluetooth",
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

export const BluetoothActionWindow = () => {
    const closeTab = RailTab({
        content: Label({ label: "✕ CLOSE" }),
        hexpand: false,
        fontSize: 13,
        onSingle: () => closeBluetoothActions(),
    })
    _actList = Box({ vertical: true, spacing: 4 })
    _actBackdrop = DrawingArea({ hexpand: true, vexpand: true })
    _actBackdrop.connect("draw", (_w: any, ctx: any) => {
        const alloc = _actBackdrop.get_allocation()
        const width = alloc.width || 1920
        const height = alloc.height || 1080
        const p = menuPalette()
        const [r, g, b] = p.fg.split(",").map((n: string) => parseInt(n, 10) / 255)
        ctx.setSourceRGBA(r, g, b, 0.06)
        for (let y = 0, row = 0; y < height + ACT_TILE_H; y += ACT_TILE_H, row++) {
            for (let x = 0, col = 0; x < width + ACT_TILE_W; x += ACT_TILE_W / 2, col++) {
                const inv = (col % 2 === 0 ? row % 2 === 1 : row % 2 === 0)
                const cx = x
                const cy = y
                if (inv) {
                    ctx.moveTo(cx - ACT_TILE_W / 2, cy + ACT_TILE_H / 2)
                    ctx.lineTo(cx + ACT_TILE_W / 2, cy + ACT_TILE_H / 2)
                    ctx.lineTo(cx, cy - ACT_TILE_H / 2)
                } else {
                    ctx.moveTo(cx - ACT_TILE_W / 2, cy - ACT_TILE_H / 2)
                    ctx.lineTo(cx + ACT_TILE_W / 2, cy - ACT_TILE_H / 2)
                    ctx.lineTo(cx, cy + ACT_TILE_H / 2)
                }
                ctx.fill()
            }
        }
        return false
    })
    _actPanel = Box({
        vertical: true,
        spacing: 8,
        hexpand: false,
        vexpand: false,
        hpack: "center",
        vpack: "center",
        css: `${menuPanelCss()} min-width: 380px; padding: 18px 22px;`,
        children: [
            Box({
                spacing: 10,
                css: "padding: 0 0 10px 0;",
                children: [
                    Label({
                        label: "◆ BLUETOOTH ACTIONS",
                        css: `font-family:${MENU_FONT};font-size:14px;color:rgba(${menuPalette().fg},1);letter-spacing:4px;font-weight:700;`,
                        xalign: 0,
                    }),
                    Box({ hexpand: true }),
                    closeTab.box,
                ],
            }),
            _actList,
        ],
    })
    _actReveal = RevealBox(_actPanel)

    _actWin = Window({
        name: "bluetooth_actions",
        className: "bluetooth_actions",
        anchor: Anchor.TOP | Anchor.LEFT | Anchor.RIGHT | Anchor.BOTTOM,
        exclusivity: Exclusivity.IGNORE,
        layer: Layer.OVERLAY,
        keymode: Keymode.ON_DEMAND,
        focusable: true,
        visible: false,
        child: Overlay({
            child: _actBackdrop,
            overlays: [
                Box({
                    hexpand: true,
                    vexpand: true,
                    hpack: "center",
                    vpack: "center",
                    children: [_actReveal.container],
                }),
            ],
        }),
        setup: (self: any) => {
            self.add_events(Gdk.EventMask.KEY_PRESS_MASK)
            self.connect("key-press-event", (_w: any, ev: any) => {
                const kv = ev?.keyval ?? ev?.get_keyval?.()?.[1]
                if (kv === Gdk.KEY_Escape || kv === 65307) {
                    closeBluetoothActions()
                    return true
                }
                return false
            })
        },
    })
    dark.subscribe(() => {
        _actPanel.css = `${menuPanelCss()} min-width: 380px; padding: 18px 22px;`
        _actBackdrop?.queue_draw?.()
    })

    return _actWin
}

// keep the connected state fresh (bluez lies) by polling the pipewire nodes - but only
// while the modals is popen
interval(3000, () => { if (_win?.visible) refreshAudioMacs(() => rebuildList()) })
