//// traybar with open app notifications and properties tab 
// kinda buggy.. properties alt menu might not be working properly across all apps, or not show all open apps actually..



import {
    App, Window, Box, Label, Scrollable, Icon, CenterBox, EventBox, Astal,
    Anchor, Layer, Exclusivity, Keymode,
} from "../../widget.ts"
import Gio from "gi://Gio"
import Gtk from "gi://Gtk?version=3.0"
import Gdk from "gi://Gdk?version=3.0"
import GLib from "gi://GLib"
import DbusmenuGtk3 from "gi://DbusmenuGtk3?version=0.4"
import { Variable, interval, execAsync } from "astal"
import { dark } from "../../env.ts"
import { menuPalette, menuPanelCss, MENU_FONT, RailTab } from "../../nier/menu.ts"
import { RevealBox, type Reveal } from "../../nier/anim.ts"
import AstalBluetooth from "gi://AstalBluetooth"
import { setBluetoothPowered, openBluetoothActions, isDeviceConnected, refreshAudioMacs, connectDevice } from "../bluetooth/bluetooth.ts"

const WATCHER_DEST  = "org.kde.StatusNotifierWatcher"
const WATCHER_PATH  = "/StatusNotifierWatcher"
const WATCHER_IFACE = "org.kde.StatusNotifierWatcher"
const ITEM_IFACE    = "org.kde.StatusNotifierItem"
const bluetooth = AstalBluetooth.get_default()

interface TrayItem {
    key: string
    service: string
    path: string
    id: string
    title: string
    category: string
    status: string
    iconName: string
    attentionIconName: string
    iconThemePath: string
    menuPath: string
    itemIsMenu: boolean
    proxy: any
    menu?: any
    menuClient?: any
    signalIds: number[]
}

const trayItems = Variable<TrayItem[]>([])
const themePaths = new Set<string>()
// we host the StatusNotifierWatcher ourselves. nothing else provides one here
// (waybar's off and ags 1.x's built-in tray service is gone), so without this the
// tray was always empty. hostedRefs is the list of "busname/path" item refs.
let watcherStarted = false
let watcherConn: any = null
let watcherOwnId: number | null = null
let watcherNodeInfo: any = null
let hostRegistered = false
const hostedRefs: string[] = []
const itemNameWatch = new Map<string, number>()
let refreshQueued = false
let refreshSource: number | null = null
const items = new Map<string, TrayItem>()

let _tileContent: any = null
let _win: any = null
let _panel: any = null
let _listBox: any = null
let _statusLbl: any = null
let _reveal: Reveal | null = null
let _close: any = null
let _appInfos: any[] | null = null
let _btWin: any = null
let _btPanel: any = null
let _btList: any = null
let _btStatus: any = null
let _btScanning = false
let _btReveal: Reveal | null = null
let _propsWin: any = null
let _propsPanel: any = null
let _propsReveal: Reveal | null = null
let _propsList: any = null
let _propsHeader: any = null
let _propsItem: TrayItem | null = null
let _propsMenuStack: any[] = []   // drill-in stack of Dbusmenu.Menuitem

const bluetoothEnabled = () => !!bluetooth.is_powered

const later = (fn: () => void) => {
    GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
        try { fn() } catch (e) { print(e) }
        return false
    })
}

const unpack = (v: any): any => {
    try { return v?.deepUnpack?.() } catch {}
    try { return v?.deep_unpack?.() } catch {}
    try { return v?.recursiveUnpack?.() } catch {}
    try { return v?.recursive_unpack?.() } catch {}
    try { return v?.unpack?.() } catch {}
    return null
}

const getProp = (proxy: any, key: string, fallback: any = ""): any => {
    try {
        const v = proxy?.get_cached_property?.(key)
        const out = unpack(v)
        return out ?? fallback
    } catch { return fallback }
}

const queueRefresh = () => {
    if (refreshQueued) return
    refreshQueued = true
    refreshSource = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 120, () => {
        refreshQueued = false
        refreshSource = null
        refreshItems()
        return false
    })
}

const parseItemRef = (ref: string): { service: string; path: string } => {
    const idx = ref.indexOf("/")
    if (idx === -1) return { service: ref, path: "/StatusNotifierItem" }
    return { service: ref.slice(0, idx), path: ref.slice(idx) || "/StatusNotifierItem" }
}

const priority = (status: string): number => {
    switch ((status || "").toLowerCase()) {
        case "needsattention": return 0
        case "active": return 1
        case "passive": return 2
        default: return 3
    }
}

const sortItems = (list: TrayItem[]) =>
    [...list].sort((a, b) =>
        priority(a.status) - priority(b.status) ||
        a.title.localeCompare(b.title) ||
        a.id.localeCompare(b.id))

const ensureThemePath = (path: string) => {
    if (!path || themePaths.has(path)) return
    themePaths.add(path)
    try { Gtk.IconTheme.get_default()?.append_search_path(path) } catch {}
}

const createItemProxy = (service: string, path: string): any => {
    return Gio.DBusProxy.new_for_bus_sync(
        Gio.BusType.SESSION,
        Gio.DBusProxyFlags.NONE,
        null,
        service,
        path,
        ITEM_IFACE,
        null,
    )
}

const materializeItem = (key: string, proxy: any, service: string, path: string, existing?: TrayItem): TrayItem => {
    const iconThemePath = String(getProp(proxy, "IconThemePath", ""))
    ensureThemePath(iconThemePath)
    return {
        key,
        service,
        path,
        id: String(getProp(proxy, "Id", key)),
        title: String(getProp(proxy, "Title", "")) || String(getProp(proxy, "Id", key)),
        category: String(getProp(proxy, "Category", "")),
        status: String(getProp(proxy, "Status", "Active")),
        iconName: String(getProp(proxy, "IconName", "")),
        attentionIconName: String(getProp(proxy, "AttentionIconName", "")),
        iconThemePath,
        menuPath: String(getProp(proxy, "Menu", "")),
        itemIsMenu: !!getProp(proxy, "ItemIsMenu", false),
        proxy,
        menu: existing?.menu,
        signalIds: existing?.signalIds ?? [],
    }
}

const destroyItem = (item: TrayItem) => {
    for (const id of item.signalIds) {
        try { item.proxy.disconnect(id) } catch {}
    }
    try { item.menu?.destroy?.() } catch {}
}

const clearQueuedRefresh = () => {
    if (refreshSource === null) return
    try { GLib.source_remove(refreshSource) } catch {}
    refreshSource = null
    refreshQueued = false
}

const refreshItems = () => {
    if (!watcherStarted) {
        trayItems.set([])
        rebuildTile()
        rebuildModal()
        return
    }

    const raw = hostedRefs.slice()
    const seen = new Set<string>()
    const next: TrayItem[] = []

    for (const ref of raw) {
        if (!ref) continue
        seen.add(ref)
        const { service, path } = parseItemRef(ref)
        const existing = items.get(ref)
        try {
            const proxy = existing?.proxy ?? createItemProxy(service, path)
            const item = materializeItem(ref, proxy, service, path, existing)

            if (!existing) {
                item.signalIds = [
                    proxy.connect("g-signal", () => queueRefresh()),
                    proxy.connect("g-properties-changed", () => queueRefresh()),
                ]
            }

            items.set(ref, item)
            next.push(item)
        } catch (e) {
            print("tray item proxy:", ref, e)
        }
    }

    for (const [key, item] of items.entries()) {
        if (!seen.has(key)) {
            destroyItem(item)
            items.delete(key)
        }
    }

    trayItems.set(sortItems(next))
    rebuildTile()
    rebuildModal()
}

// ── StatusNotifierWatcher host ─────────────────────────────────────────────
// we own org.kde.StatusNotifierWatcher and answer for the tray apps. apps like
// spotify / nm-applet watch this name and re-register their items so should be updated and shown in traybar.

const WATCHER_XML = `
<node>
  <interface name="org.kde.StatusNotifierWatcher">
    <method name="RegisterStatusNotifierItem">
      <arg name="service" type="s" direction="in"/>
    </method>
    <method name="RegisterStatusNotifierHost">
      <arg name="service" type="s" direction="in"/>
    </method>
    <property name="RegisteredStatusNotifierItems" type="as" access="read"/>
    <property name="IsStatusNotifierHostRegistered" type="b" access="read"/>
    <property name="ProtocolVersion" type="i" access="read"/>
    <signal name="StatusNotifierItemRegistered">
      <arg name="service" type="s"/>
    </signal>
    <signal name="StatusNotifierItemUnregistered">
      <arg name="service" type="s"/>
    </signal>
    <signal name="StatusNotifierHostRegistered"/>
    <signal name="StatusNotifierHostUnregistered"/>
  </interface>
</node>`

let watcherImpl: any = null

const emitWatcherSignal = (name: string, variant: any) => {
    try { watcherImpl?.emit_signal(name, variant) } catch (e) { print("tray watcher signal:", e) }
}

const removeHostedRef = (ref: string) => {
    const idx = hostedRefs.indexOf(ref)
    if (idx === -1) return
    hostedRefs.splice(idx, 1)
    const wid = itemNameWatch.get(ref)
    if (wid != null) {
        try { Gio.bus_unwatch_name(wid) } catch {}
        itemNameWatch.delete(ref)
    }
    emitWatcherSignal("StatusNotifierItemUnregistered",
        GLib.Variant.new_tuple([GLib.Variant.new_string(ref)]))
    queueRefresh()
}

const addHostedRef = (ref: string) => {
    if (hostedRefs.includes(ref)) { queueRefresh(); return }
    hostedRefs.push(ref)
    const { service } = parseItemRef(ref)
    if (service && !itemNameWatch.has(ref)) {
        // Drop the item if its owner falls off the bus.
        const wid = Gio.bus_watch_name(
            Gio.BusType.SESSION,
            service,
            Gio.BusNameWatcherFlags.NONE,
            null,
            () => removeHostedRef(ref),
        )
        itemNameWatch.set(ref, wid)
    }
    emitWatcherSignal("StatusNotifierItemRegistered",
        GLib.Variant.new_tuple([GLib.Variant.new_string(ref)]))
    queueRefresh()
}

const WatcherImpl = {
    // *Async form so we get the invocation -> the sender's bus name. the arg is
    // either the full bus name or just an object path; if its a path the real
    // owner is whoever sent the message.
    RegisterStatusNotifierItemAsync(params: any[], invocation: any) {
        try {
            const service = String(params?.[0] ?? "")
            let busName: string, path: string
            if (service.startsWith("/")) {
                busName = invocation.get_sender()
                path = service
            } else if (service.includes("/")) {
                const i = service.indexOf("/")
                busName = service.slice(0, i)
                path = service.slice(i)
            } else {
                busName = service || invocation.get_sender()
                path = "/StatusNotifierItem"
            }
            if (busName) addHostedRef(`${busName}${path}`)
        } catch (e) { print("tray RegisterItem:", e) }
        try { invocation.return_value(null) } catch {}
    },
    RegisterStatusNotifierHostAsync(_params: any[], invocation: any) {
        hostRegistered = true
        emitWatcherSignal("StatusNotifierHostRegistered", null)
        try { invocation.return_value(null) } catch {}
    },
    get RegisteredStatusNotifierItems() { return hostedRefs.slice() },
    get IsStatusNotifierHostRegistered() { return true },
    get ProtocolVersion() { return 0 },
}

const ensureWatcher = () => {
    if (watcherStarted || watcherOwnId !== null) return
    try {
        const node = Gio.DBusNodeInfo.new_for_xml(WATCHER_XML)
        watcherNodeInfo = node.interfaces[0]
        watcherImpl = Gio.DBusExportedObject.wrapJSObject(watcherNodeInfo, WatcherImpl)
        watcherOwnId = Gio.bus_own_name(
            Gio.BusType.SESSION,
            WATCHER_DEST,
            Gio.BusNameOwnerFlags.REPLACE,
            (conn: any) => {
                watcherConn = conn
                try { watcherImpl.export(conn, WATCHER_PATH) }
                catch (e) { print("tray watcher export:", e) }
            },
            () => {
                // got the name, we're the watcher now. apps will re-register so
                // refresh from our (empty) list.
                watcherStarted = true
                hostRegistered = true
                refreshItems()
            },
            () => {
                // couldnt grab it (something else owns it) - just stay empty
                print("tray watcher: name unavailable")
            },
        )
    } catch (e) {
        print("tray watcher host:", e)
    }
}

const callMethod = (proxy: any, method: string, params: GLib.Variant) =>
    new Promise<any>((resolve, reject) => {
        try {
            proxy.call(
                method, params, Gio.DBusCallFlags.NONE, -1, null,
                (_p: any, res: any) => {
                    try { resolve(proxy.call_finish(res)) }
                    catch (e) { reject(e) }
                },
            )
        } catch (e) { reject(e) }
    })

const eventPos = (ev: any): [number, number] => {
    try {
        const [, x, y] = ev.get_root_coords()
        return [Math.round(x), Math.round(y)]
    } catch {}
    try {
        const [, x, y] = ev.get_coords()
        return [Math.round(x), Math.round(y)]
    } catch {}
    return [0, 0]
}

const eventTime = (ev: any): number => {
    try { return ev.get_time() } catch {}
    return Gtk.get_current_event_time?.() ?? 0
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()

const DESKTOP_HINTS: Array<{ match: RegExp; ids: string[]; execs: string[] }> = [
    {
        match: /(proton\s+vpn|proton\.vpn|protonvpn)/,
        ids: ["proton.vpn.app.gtk.desktop"],
        execs: ["protonvpn-app"],
    },
    {
        match: /(telegram|org\.telegram\.desktop)/,
        ids: ["org.telegram.desktop.desktop"],
        execs: ["telegram-desktop"],
    },
    {
        match: /(spotify|spotify_client)/,
        ids: ["spotify.desktop"],
        execs: ["spotify"],
    },
    {
        match: /(networkmanager|nm\s*applet|nm_applet)/,
        ids: ["nm-applet.desktop"],
        execs: ["nm-applet"],
    },
]

const appInfos = (): any[] => {
    if (_appInfos) return _appInfos
    try { _appInfos = Gio.AppInfo.get_all() } catch { _appInfos = [] }
    return _appInfos
}

const desktopApp = (id: string): any => {
    try { return Gio.DesktopAppInfo.new(id) } catch {}
    return null
}

const launchDesktopApp = (app: any): boolean => {
    if (!app) return false
    try {
        const ctx = Gdk.Display.get_default?.()?.get_app_launch_context?.() ?? null
        try { ctx?.set_timestamp?.(Gtk.get_current_event_time?.() ?? 0) } catch {}
        app.launch([], ctx)
        return true
    } catch (e) {
        try {
            const exec = String(app.get_executable?.() ?? "").trim()
            if (!exec) throw e
            GLib.spawn_async(null, [exec], null, GLib.SpawnFlags.SEARCH_PATH, null)
            return true
        } catch { return false }
    }
}

const launchExec = (exec: string): boolean => {
    if (!exec) return false
    try {
        GLib.spawn_async(null, [exec], null, GLib.SpawnFlags.SEARCH_PATH, null)
        return true
    } catch {}
    return false
}

const openItemApp = (item: TrayItem): boolean => {
    const raw = [
        item.id,
        item.title,
        item.iconName,
        item.service,
    ].filter(Boolean)
    const blob = norm(raw.join(" "))

    for (const hint of DESKTOP_HINTS) {
        if (!hint.match.test(blob)) continue
        for (const id of hint.ids) {
            if (launchDesktopApp(desktopApp(id))) return true
        }
        for (const exec of hint.execs) {
            if (launchExec(exec)) return true
        }
    }

    const tokens = new Set<string>()
    for (const s of raw) {
        for (const t of norm(String(s)).split(/\s+/)) {
            if (t.length >= 3) tokens.add(t)
        }
    }

    const candidates = appInfos().map((app: any) => {
        const id = String(app.get_id?.() ?? "")
        const name = String(app.get_name?.() ?? "")
        const exec = String(app.get_executable?.() ?? "")
        const blob = norm(`${id} ${name} ${exec}`)
        let score = 0
        for (const t of tokens) {
            if (blob.includes(t)) score++
        }
        return { app, score, idLen: id.length }
    }).filter((x: any) => x.score > 0)

    candidates.sort((a: any, b: any) => b.score - a.score || a.idLen - b.idLen)
    const best = candidates[0]?.app
    if (!best) return false
    if (launchDesktopApp(best)) return true
    print("tray launch fallback:", item.title, "no launch candidate worked")
    return false
}

const itemTokens = (item: TrayItem): Set<string> => {
    const set = new Set<string>()
    for (const s of [item.id, item.title, item.iconName].filter(Boolean))
        for (const t of norm(String(s)).split(/\s+/)) if (t.length >= 3) set.add(t)
    return set
}

// find the running hyprland window for a tray item and pull it to the current
// workspace + focus it. resolves true if it found one.
const focusItemWindow = (item: TrayItem): Promise<boolean> => {
    const tokens = itemTokens(item)
    if (tokens.size === 0) return Promise.resolve(false)
    return execAsync(["hyprctl", "clients", "-j"]).then((out: string) => {
        let clients: any[] = []
        try { clients = JSON.parse(out) } catch { return false }
        let best: any = null, bestScore = 0
        for (const c of clients) {
            if (!c?.address || c.mapped === false) continue
            const blob = norm(`${c.class ?? ""} ${c.initialClass ?? ""} ${c.title ?? ""} ${c.initialTitle ?? ""}`)
            let score = 0
            for (const t of tokens) if (blob.includes(t)) score++
            if (score > bestScore) { bestScore = score; best = c }
        }
        if (!best || bestScore === 0) return false
        const sel = `address:${best.address}`
        return execAsync(["hyprctl", "activeworkspace", "-j"]).then((wout: string) => {
            let ws = 0
            try { ws = JSON.parse(wout).id } catch {}
            // silent move (no flicker) to the current ws, then focus it
            return execAsync(["hyprctl", "dispatch", "movetoworkspacesilent", `${ws},${sel}`])
                .then(() => execAsync(["hyprctl", "dispatch", "focuswindow", sel]))
                .then(() => true)
                .catch(() => true)
        })
    }).catch(() => false)
}

// open app: if it already has a window, pull it to the current workspace + focus.

const openOrActivateItem = (item: TrayItem) => {
    focusItemWindow(item).then(found => {
        if (found) return
        if (!openItemApp(item)) {
            later(() => {
                callMethod(item.proxy, "Activate", new GLib.Variant("(ii)", [0, 0]))
                    .catch(() => callMethod(item.proxy, "SecondaryActivate", new GLib.Variant("(ii)", [0, 0])).catch(print))
            })
        }
    }).catch(print)
    if (_win?.visible) _reveal?.close(() => { _win.visible = false })
}

const popupMenu = (item: TrayItem, ev: any, anchor?: any): boolean => {
    if (!item.menuPath || item.menuPath === "/") return false
    try {
        item.menu ??= DbusmenuGtk3.Menu.new(item.service, item.menuPath)
        try {
            const attached = item.menu.get_attach_widget?.()
            if (anchor && attached !== anchor) {
                if (attached) item.menu.detach?.()
                item.menu.attach_to_widget?.(anchor, null)
            }
        } catch {}
        item.menu.show_all?.()
        if (ev && item.menu.popup_at_pointer) {
            item.menu.popup_at_pointer(ev)
            return true
        }
        if (anchor && item.menu.popup_at_widget) {
            item.menu.popup_at_widget(anchor, Gdk.Gravity.SOUTH_WEST, Gdk.Gravity.NORTH_WEST, null)
            return true
        }
        item.menu.popup?.(
            null,
            null,
            null,
            null,
            ev?.button ?? ev?.get_button?.()?.[1] ?? 0,
            eventTime(ev),
        )
        return true
    } catch (e) {
        print("tray popup menu:", item.title, e)
        return false
    }
}

const activateItem = async (item: TrayItem, ev: any, anchor?: any) => {
    const [x, y] = eventPos(ev)
    try {
        await callMethod(item.proxy, "Activate", new GLib.Variant("(ii)", [x, y]))
        if (_win?.visible) _reveal?.close(() => { _win.visible = false })
        return
    } catch {}
    try {
        await callMethod(item.proxy, "SecondaryActivate", new GLib.Variant("(ii)", [x, y]))
        if (_win?.visible) _reveal?.close(() => { _win.visible = false })
        return
    } catch {}
    try {
        await callMethod(item.proxy, "XAyatanaSecondaryActivate", new GLib.Variant("(u)", [eventTime(ev)]))
        if (_win?.visible) _reveal?.close(() => { _win.visible = false })
        return
    } catch {}
    // gtkmenu
    try { openPropsModal(item) } catch (e) { print(e) }
}

const activateOrLaunchItem = async (item: TrayItem, ev: any, anchor?: any) => {
    const launched = openItemApp(item)
    if (launched) {
        if (_win?.visible) _reveal?.close(() => { _win.visible = false })
        return
    }
    await activateItem(item, ev, anchor)
}

const secondaryItem = async (item: TrayItem, ev: any, anchor?: any) => {
    const [x, y] = eventPos(ev)
    // no gtk menu popup (it leaks the pointer grab, see above) - use the props modal
    try { openPropsModal(item); return } catch (e) { print(e) }
    try {
        await callMethod(item.proxy, "ContextMenu", new GLib.Variant("(ii)", [x, y]))
        return
    } catch {}
    print("tray secondary: no menu/context path for", item.title)
}

const iconNameFor = (item: TrayItem) => item.iconName || item.attentionIconName || "applications-system-symbolic"

const trayIcon = (item: TrayItem, size: number, dim: boolean = false) =>
    Icon({
        icon: iconNameFor(item),
        size,
        css: dim ? "opacity: 0.85;" : "",
    })

const tileChildren = (list: TrayItem[]) => {
    if (list.length === 0) {
        return [Label({
            label: "TRAY",
            css: `font-family:${MENU_FONT};font-size:12px;letter-spacing:3px;font-weight:700;`,
        })]
    }

    const p = menuPalette()
    const kids = list.slice(0, 3).map(item => trayIcon(item, 20))
    if (list.length > 3) {
        kids.push(Label({
            label: "+",
            css: `font-family:${MENU_FONT};font-size:17px;letter-spacing:1px;font-weight:700;color:rgba(${p.bg},1);`,
        }))
    }
    return kids
}

const rebuildTile = () => {
    if (!_tileContent) return
    _tileContent.children = tileChildren(trayItems.get())
}

const rowFor = (item: TrayItem) => {
    const title = item.title || item.id
    const subtitle = [item.category, item.status].filter(Boolean).join(" · ").toUpperCase()
    const p = menuPalette()
    const titleLbl = Label({
        label: title,
        xalign: 0,
    })
    const subtitleLbl = Label({
        label: subtitle || item.id.toUpperCase(),
        xalign: 0,
    })
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
            trayIcon(item, 18, item.status.toLowerCase() === "passive"),
            Box({
                vertical: true,
                hexpand: true,
                spacing: 2,
                children: [titleLbl, subtitleLbl],
            }),
        ],
    })
    applyTextState("idle")

    const tab = RailTab({
        content,
        hexpand: true,
        bodyPadding: "8px 14px",
        // double clicks opens the app, 
        // right opens the props/context modal
        onDouble: () => openOrActivateItem(item),
        onButton: (button: number, _ev: any) => {
            if (button === 3) { later(() => openPropsModal(item)); return true }
            return false
        },
        onState: (state: any) => applyTextState(state),
    })
    return tab.box
}

const rebuildModal = () => {
    if (_listBox) _listBox.children = trayItems.get().map(rowFor)
    if (_statusLbl) {
        const count = trayItems.get().length
        _statusLbl.label = count === 0
            ? "◆ NO STATUS ITEMS"
            : `◆ ${count} STATUS ITEM${count === 1 ? "" : "S"}`
    }
}

const btDeviceRow = (device: any) => {
    const title = String(device.alias ?? device.name ?? "Device")
    const connected = isDeviceConnected(device)
    const subtitle = connected ? "CONNECTED" : "DISCONNECTED"
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
            Box({ vertical: true, hexpand: true, spacing: 2, children: [titleLbl, subtitleLbl] }),
        ],
    })
    applyTextState("idle")
    const tab = RailTab({
        content,
        hexpand: true,
        bodyPadding: "8px 14px",
        //  double clicks connects, right opens the pair/connect/
        // disconnect/unpair menu (disconnect lives there)
        onDouble: () => connectDevice(device, () => rebuildBluetoothModal()),
        onButton: (button: number) => {
            if (button === 3) { later(() => openBluetoothActions(device)); return true }
            return false
        },
        getActive: () => isDeviceConnected(device),
        onState: (state: any) => applyTextState(state),
    })
    return tab.box
}

const btStatusText = (): string => {
    if (!bluetoothEnabled()) return "◆ BLUETOOTH OFF"
    if (_btScanning || btDiscovering()) return "◆ SCANNING…"
    const n = Array.from(bluetooth.devices ?? []).length
    return n ? `◆ ${n} DEVICE${n === 1 ? "" : "S"}` : "◆ NO DEVICES"
}

const rebuildBluetoothModal = () => {
    if (_btStatus) _btStatus.label = btStatusText()
    if (!_btList) return
    if (!bluetoothEnabled()) {
        _btList.children = [
            Label({
                label: "BLUETOOTH IS OFF",
                xalign: 0,
                css: `font-family:${MENU_FONT};font-size:13px;letter-spacing:2px;color:rgba(${menuPalette().fg},0.8);`,
            }),
            RailTab({
                content: Label({ label: "ENABLE BLUETOOTH" }),
                hexpand: false,
                fontSize: 13,
                onSingle: () => {
                    try { bluetooth.toggle?.() } catch {}
                    bluetooth.is_powered = true
                    rebuildBluetoothModal()
                },
            }).box,
        ]
        return
    }
    const devices = Array.from(bluetooth.devices ?? [])
    _btList.children = devices.length
        ? devices.map(btDeviceRow)
        : [Label({
            label: btDiscovering() ? "SCANNING…" : "NO BLUETOOTH DEVICES",
            xalign: 0,
            css: `font-family:${MENU_FONT};font-size:11px;letter-spacing:3px;color:rgba(${menuPalette().fg},0.65);`,
        })]
}

const btAdapter = () => { try { return (bluetooth as any).adapter ?? null } catch { return null } }
const btDiscovering = () => { try { return !!btAdapter()?.discovering } catch { return false } }

const startBtDiscovery = () => {
    if (!bluetoothEnabled()) setBluetoothPowered(true)
    const ad = btAdapter()
    if (!ad) { print("bt: no adapter for discovery"); return }
    try { ad.set_pairable?.(true) } catch {}
    try { if (!ad.discovering) ad.start_discovery() } catch (e) { print("bt start_discovery:", e) }
}

const stopBtDiscovery = () => {
    const ad = btAdapter()
    if (!ad) return
    try { if (ad.discovering) ad.stop_discovery() } catch (e) { print("bt stop_discovery:", e) }
}

let _btScanTimer: number | null = null
const rescanBt = () => {
    // show SCANNING right away (the discovering flag flips a beat later over dbus),
    // refresh as devices show up, and stop after a bit.
    _btScanning = true
    startBtDiscovery()
    rebuildBluetoothModal()
    if (_btScanTimer !== null) { try { GLib.source_remove(_btScanTimer) } catch {} ; _btScanTimer = null }
    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1500, () => { if (_btWin?.visible) rebuildBluetoothModal(); return false })
    _btScanTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 12000, () => {
        _btScanning = false
        _btScanTimer = null
        stopBtDiscovery()
        if (_btWin?.visible) rebuildBluetoothModal()
        return false
    })
}

const closeBluetoothDevices = () => {
    if (!_btWin?.visible) return
    stopBtDiscovery()
    _btReveal?.close(() => { _btWin.visible = false })
}

const openBluetoothDevices = () => {
    if (!_btWin) return
    // grab the audio state up front so earbuds bluez wrongly calls disconnected
    // still show CONNECTED right away
    refreshAudioMacs(() => { if (_btWin?.visible) rebuildBluetoothModal() })
    rebuildBluetoothModal()
    startBtDiscovery()
    if (_btWin.visible) return
    _btWin.visible = true
    _btReveal?.open()
}

const restyle = () => {
    const p = menuPalette()
    if (_panel) _panel.css = menuPanelCss()
    if (_statusLbl) _statusLbl.css =
        `font-family:${MENU_FONT};font-size:11px;color:rgba(${p.fg},0.65);letter-spacing:3px;`
    _close?.refresh?.()
    rebuildModal()
    rebuildBluetoothModal()
    if (_btStatus) _btStatus.css =
        `font-family:${MENU_FONT};font-size:11px;color:rgba(${p.fg},0.65);letter-spacing:3px;`
    if (_btPanel) _btPanel.css = menuPanelCss()
}

// ── props / context-menu modal (centered, dimmed) ──────────────────────────
// right-clicking a tray row opens this instead of a native popup: a dimmed
// fullscreen overlay with a centered panel showing the app actions + the item's
// dbus menuin same nier UI style (a bit buggy still)
const mExist = (mi: any, k: string): boolean => { try { return !!mi.property_exist(k) } catch { return false } }
const mStr = (mi: any, k: string): string => { try { return String(mi.property_get(k) ?? "") } catch { return "" } }
const mFlag = (mi: any, k: string, dflt: boolean): boolean =>
    mExist(mi, k) ? (() => { try { return !!mi.property_get_bool(k) } catch { return dflt } })() : dflt
const mInt = (mi: any, k: string): number => { try { return mi.property_get_int(k) ?? 0 } catch { return 0 } }

const propDivider = () =>
    Box({ css: `min-height:1px;background-color:rgba(${menuPalette().fg},0.18);margin:4px 6px;` })

const propRow = (label: string, enabled: boolean, onClick: () => void) => {
    const p = menuPalette()
    const lbl = Label({ label, xalign: 0, hexpand: true })
    const apply = (state: any) => {
        const sel = state !== "idle"
        const fg = sel ? p.bg : p.fg
        lbl.css = `font-family:${MENU_FONT};font-size:13px;letter-spacing:1px;font-weight:700;color:rgba(${fg},${enabled ? 1 : 0.4});`
    }
    apply("idle")
    const tab = RailTab({
        content: Box({ hexpand: true, children: [lbl] }),
        hexpand: true,
        bodyPadding: "8px 14px",
        onSingle: enabled ? () => later(onClick) : undefined,
        onState: (state: any) => apply(state),
    })
    return tab.box
}

const buildPropsRows = (item: TrayItem, mi: any): any[] => {
    const rows: any[] = []
    rows.push(propRow("▸ OPEN APP", true, () => { openOrActivateItem(item); closePropsModal() }))
    if (_propsMenuStack.length > 1)
        rows.push(propRow("‹ BACK", true, () => { _propsMenuStack.pop(); rebuildPropsModal() }))
    rows.push(propDivider())

    const kids: any[] = (() => { try { return mi?.get_children?.() ?? [] } catch { return [] } })()
    let shown = 0
    for (const c of kids) {
        if (!mFlag(c, "visible", true)) continue
        if (mStr(c, "type") === "separator") { rows.push(propDivider()); continue }
        const enabled = mFlag(c, "enabled", true)
        const sub = mStr(c, "children-display") === "submenu"
        const tType = mStr(c, "toggle-type")
        const checked = mInt(c, "toggle-state") === 1
        const rawLabel = mStr(c, "label").replace(/_/g, "") || "—"
        // nm-applet's "Enable Wi-Fi" etc checkmark items read the same whether on
        // or off, so show the verb the click will do (Enable/Disable) and skip the ◆/◇ since the word already says it.
        let prefix = tType ? (checked ? "◆ " : "◇ ") : ""
        let display = rawLabel
        if (tType && /^enable\s+/i.test(rawLabel)) {
            prefix = ""
            display = (checked ? "Disable " : "Enable ") + rawLabel.replace(/^enable\s+/i, "")
        }
        const label = prefix + display + (sub ? "  ›" : "")
        rows.push(propRow(prefix + label, enabled, () => {
            if (sub) { _propsMenuStack.push(c); rebuildPropsModal(); return }
            try { c.handle_event("clicked", GLib.Variant.new_int32(0), Math.floor(GLib.get_real_time() / 1000000)) }
            catch (e) { print("tray menu click:", e) }
            closePropsModal()
        }))
        shown++
    }
    if (shown === 0)
        rows.push(Label({
            label: "NO CONTEXT MENU",
            xalign: 0,
            css: `font-family:${MENU_FONT};font-size:11px;letter-spacing:3px;color:rgba(${menuPalette().fg},0.6);`,
        }))
    return rows
}

const ensureMenuClient = (item: TrayItem): any => {
    if (item.menuClient) return item.menuClient
    if (!item.menuPath || item.menuPath === "/") return null
    try {
        const client = DbusmenuGtk3.Client.new(item.service, item.menuPath)
        item.menuClient = client
        const onChange = () => { if (_propsItem === item && _propsWin?.visible) rebuildPropsModal() }
        try { client.connect("layout-updated", onChange) } catch {}
        try { client.connect("root-changed", onChange) } catch {}
        return client
    } catch (e) { print("tray menu client:", e); return null }
}

const rebuildPropsModal = () => {
    if (!_propsList || !_propsItem) return
    const item = _propsItem
    if (_propsHeader) _propsHeader.label = `◆ ${(item.title || item.id).toUpperCase()}`
    if (_propsMenuStack.length === 0) {
        try { const r = item.menuClient?.get_root?.(); if (r) _propsMenuStack = [r] } catch {}
    }
    const top = _propsMenuStack[_propsMenuStack.length - 1] ?? null
    _propsList.children = buildPropsRows(item, top)
}

const closePropsModal = () => {
    if (!_propsWin?.visible) return
    _propsReveal?.close(() => { _propsWin.visible = false; _propsItem = null; _propsMenuStack = [] })
}

const openPropsModal = (item: TrayItem) => {
    if (!_propsWin) return
    _propsItem = item
    _propsMenuStack = []
    const client = ensureMenuClient(item)
    try {
        const r = client?.get_root?.()
        if (r) { _propsMenuStack = [r]; try { r.send_about_to_show?.(null) } catch {} }
    } catch {}
    rebuildPropsModal()
    if (_propsWin.visible) return
    _propsWin.visible = true
    _propsReveal?.open()
}

export const TrayPropsWindow = () => {
    _propsHeader = Label({
        label: "◆ PROPERTIES",
        xalign: 0,
        css: `font-family:${MENU_FONT};font-size:14px;color:rgba(${menuPalette().fg},1);letter-spacing:4px;font-weight:700;`,
    })
    const closeTab = RailTab({ content: Label({ label: "✕ CLOSE" }), hexpand: false, fontSize: 13, onSingle: () => closePropsModal() })
    _propsList = Box({ vertical: true, spacing: 4 })
    _propsPanel = Box({
        vertical: true,
        spacing: 8,
        css: menuPanelCss(),
        children: [
            Box({ spacing: 10, css: "padding: 0 0 10px 0;", children: [_propsHeader, Box({ hexpand: true }), closeTab.box] }),
            Scrollable({ hscroll: "never", vscroll: "automatic", css: "min-width: 360px;", child: _propsList, vexpand: false, setup: (self: any) => {
                try { self.set_kinetic_scrolling(false) } catch {}
                try { self.set_propagate_natural_height(true); self.set_max_content_height(700) } catch {}
            } }),
        ],
    })
    _propsReveal = RevealBox(_propsPanel)
    dark.subscribe(() => { if (_propsPanel) _propsPanel.css = menuPanelCss(); if (_propsItem) rebuildPropsModal() })

    // guard eventbox eats clicks on the panel so only backdrop clicks close it
    const guard = EventBox({ onButtonPressEvent: () => true })
    guard.add(_propsReveal.container)
    // center both axes + size to content, else the CenterBox stretches it to full
    // screen height
    try { guard.set_halign(3); guard.set_valign(3) } catch {}   // 3 = CENTER

    _propsWin = Window({
        name: "tray_props",
        className: "tray_props",
        anchor: Anchor.TOP | Anchor.LEFT | Anchor.RIGHT | Anchor.BOTTOM,
        exclusivity: Exclusivity.IGNORE,
        layer: Layer.OVERLAY,
        keymode: Keymode.ON_DEMAND,
        focusable: true,
        visible: false,
        child: CenterBox({
            css: "min-width: 100%; min-height: 100%; background-color: rgba(20,19,16,0.55);",
            centerWidget: guard,
        }),
        setup: (self: any) => {
            self.add_events(Gdk.EventMask.KEY_PRESS_MASK | Gdk.EventMask.BUTTON_PRESS_MASK)
            self.connect("key-press-event", (_w: any, ev: any) => {
                const kv = ev?.keyval ?? ev?.get_keyval?.()?.[1]
                if (kv === Gdk.KEY_Escape || kv === 65307) { closePropsModal(); return true }
                return false
            })
            self.connect("button-press-event", () => { closePropsModal(); return false })
        },
    })
    return _propsWin
}

export const isTrayOpen = () => !!_win?.visible

export const toggleTray = () => {
    ensureWatcher()
    if (!_win) return
    if (_win.visible) {
        _reveal?.close(() => { _win.visible = false })
        return
    }
    restyle()
    _win.visible = true
    _reveal?.open()
}

export const TrayTile = () => {
    ensureWatcher()
    _tileContent = Box({
        spacing: 8,
        vpack: "center",
        children: tileChildren(trayItems.get()),
    })

    const { box } = RailTab({
        content: _tileContent,
        hexpand: false,
        bodyPadding: "0 12px",
        onSingle: () => toggleTray(),
        getActive: () => isTrayOpen(),
    })

    trayItems.subscribe(rebuildTile)
    dark.subscribe(rebuildTile)
    return box
}

export const TrayWindow = () => {
    ensureWatcher()
    const p = menuPalette()
    _statusLbl = Label({
        label: "◆ STATUS ITEMS",
        css: `font-family:${MENU_FONT};font-size:11px;color:rgba(${p.fg},0.65);letter-spacing:3px;`,
        xalign: 0, hexpand: true,
    })
    _close = RailTab({
        content: Label({ label: "✕ CLOSE" }),
        hexpand: false,
        fontSize: 13,
        onSingle: () => toggleTray(),
    })
    const btTab = RailTab({
        content: Icon({ icon: "bluetooth-active-symbolic", size: 16 }),
        hexpand: false,
        fontSize: 12,
        onSingle: () => {
            setBluetoothPowered(!bluetoothEnabled())
            rebuildBluetoothModal()
        },
        onButton: (button: number) => {
            if (button === 3) {
                openBluetoothDevices()
                return true
            }
            return false
        },
        getActive: () => bluetoothEnabled(),
    })

    _listBox = Box({ vertical: true, spacing: 4 })
    rebuildModal()

    const header = Box({
        spacing: 10,
        css: "padding: 0 0 10px 0;",
        children: [
            Label({
                label: "◆ STATUS NOTIFIER",
                css: `font-family:${MENU_FONT};font-size:14px;color:rgba(${p.fg},1);letter-spacing:4px;font-weight:700;`,
                xalign: 0,
            }),
            Box({ hexpand: true }),
            btTab.box,
            _close.box,
        ],
    })

    const scroll = Scrollable({
        hscroll: "never",
        vscroll: "automatic",
        css: "min-width: 420px; min-height: 280px;",
        child: _listBox,
        setup: (self: any) => { try { self.set_kinetic_scrolling(false) } catch {} },
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
        name: "tray",
        className: "tray",
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

export const TrayBluetoothWindow = () => {
    _btList = Box({ vertical: true, spacing: 4 })
    _btStatus = Label({
        label: "◆ READY",
        css: `font-family:${MENU_FONT};font-size:11px;color:rgba(${menuPalette().fg},0.65);letter-spacing:3px;`,
        xalign: 0, hexpand: true,
    })
    const rescanTab = RailTab({
        content: Label({ label: "⟳ RESCAN" }),
        hexpand: false,
        fontSize: 13,
        onSingle: () => rescanBt(),
        getActive: () => _btScanning || btDiscovering(),   // lights up while scanning
    })
    const cancelTab = RailTab({
        content: Label({ label: "✕ CANCEL" }),
        hexpand: false,
        fontSize: 13,
        onSingle: () => closeBluetoothDevices(),
    })
    _btPanel = Box({
        vertical: true,
        spacing: 8,
        css: menuPanelCss(),
        children: [
            Box({
                spacing: 10,
                css: "padding: 0 0 10px 0;",
                children: [
                    Label({
                        label: "◆ BLUETOOTH DEVICES",
                        css: `font-family:${MENU_FONT};font-size:14px;color:rgba(${menuPalette().fg},1);letter-spacing:4px;font-weight:700;`,
                        xalign: 0,
                    }),
                    Box({ hexpand: true }),
                    rescanTab.box,
                    cancelTab.box,
                ],
            }),
            _btStatus,
            Scrollable({
                hscroll: "never",
                vscroll: "automatic",
                css: "min-width: 420px; min-height: 120px;",
                child: _btList,
                vexpand: false,
                setup: (self: any) => {
                    try { self.set_kinetic_scrolling(false) } catch {}
                    try { self.set_propagate_natural_height(true); self.set_max_content_height(560) } catch {}
                },
            }),
        ],
    })
    _btReveal = RevealBox(_btPanel)
    const btGuard = EventBox({ onButtonPressEvent: () => true })
    btGuard.add(_btReveal.container)
    try { btGuard.set_halign(3); btGuard.set_valign(3) } catch {}   // 3 = CENTER
    rebuildBluetoothModal()

    _btWin = Window({
        name: "tray_bluetooth",
        className: "tray_bluetooth",
        anchor: Anchor.TOP | Anchor.LEFT | Anchor.RIGHT | Anchor.BOTTOM,
        exclusivity: Exclusivity.IGNORE,
        layer: Layer.OVERLAY,
        keymode: Keymode.ON_DEMAND,
        focusable: true,
        visible: false,
        child: CenterBox({
            css: "min-width: 100%; min-height: 100%; background-color: rgba(20,19,16,0.55);",
            centerWidget: btGuard,
        }),
        setup: (self: any) => {
            self.add_events(Gdk.EventMask.KEY_PRESS_MASK | Gdk.EventMask.BUTTON_PRESS_MASK)
            self.connect("key-press-event", (_w: any, ev: any) => {
                const kv = ev?.keyval ?? ev?.get_keyval?.()?.[1]
                if (kv === Gdk.KEY_Escape || kv === 65307) {
                    closeBluetoothDevices()
                    return true
                }
                return false
            })
            self.connect("button-press-event", () => { closeBluetoothDevices(); return false })
        },
    })

    try { bluetooth.connect("notify::is-powered", rebuildBluetoothModal) } catch {}
    // refresh the list as discovery finds / drops devices
    try { bluetooth.connect("device-added", () => { if (_btWin?.visible) rebuildBluetoothModal() }) } catch {}
    try { bluetooth.connect("device-removed", () => { if (_btWin?.visible) rebuildBluetoothModal() }) } catch {}
    return _btWin
}

interval(5000, () => {
    ensureWatcher()
    queueRefresh()
    // refresh the audio-aware connected state too, but only while the modal's open
    if (_btWin?.visible) refreshAudioMacs(() => rebuildBluetoothModal())
})
