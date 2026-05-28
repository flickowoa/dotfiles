import { App, Window, Box } from "./widget.ts"
import { Anchor, Layer, Exclusivity } from "./widget.ts"
import Gio from "gi://Gio"
import { execAsync, timeout } from "astal"
import {
    dark, HOME, SCREEN_WIDTH, SCREEN_HEIGHT,
    YORHA_DIR, AGS_DIR, assetsDir,
} from "./env.ts"
import { WorkspaceTiles } from "./widgets/workspace.ts"
import { PlayerWindow, togglePlayer } from "./windows/player/player.ts"
import { SettingsWindow } from "./windows/settings/settings.ts"
import { SettingsBgWindow } from "./windows/settingsbg/settingsbg.ts"
import { toggleSettings } from "./windows/settings/control.ts"
import { NotificationsWindow, dismissAllNotifications } from "./windows/notifications/notifications.ts"
import { BannerWindow, triggerBanner } from "./windows/banner/banner.ts"
import { WsAnimWindow, triggerWsAnim, triggerSwitch, triggerThemeWipe, isAnimating, triggerRecordAnim } from "./windows/ws_anim/ws_anim.ts"
import { ScreenshotWindow, triggerScreenshot } from "./windows/screenshot/screenshot.ts"
import { OsdWindow } from "./windows/osd/osd.ts"
import { CalendarWindow } from "./windows/calendar/calendar.ts"
import { GraphWindow } from "./windows/graph/graph.ts"
import { DiskWindow } from "./windows/disk/disk.ts"
import { BatteryWindow } from "./windows/battery/battery.ts"
import { WifiWindow } from "./windows/wifi/wifi.ts"
import { BluetoothWindow, BluetoothActionWindow } from "./windows/bluetooth/bluetooth.ts"
import { WeatherWindow } from "./windows/weather/weather.ts"
import { TrayTile, TrayWindow, TrayBluetoothWindow, TrayPropsWindow } from "./windows/tray/tray.ts"
import {
    HudClock, HudStats, HudPatternBar,
    HudBrightness, HudTemp, HudVolume,
} from "./widgets/hud.ts"
import { SpinningLogo } from "./widgets/spinning_logo.ts"
import { top_icon_size } from "./scaling.ts"


const OLD_AGS = AGS_DIR.replace("/ags3", "/ags")
const SCSS = `${OLD_AGS}/style/style.scss`
const CSS = `${OLD_AGS}/style/style.css`
const DATA_SCSS = `${OLD_AGS}/style/data.scss`
const COLOR_SCSS = `${OLD_AGS}/style/color.scss`
const KITTY_THEME_DIR = `${YORHA_DIR}/components/kitty`
const KITTY_CONF_DIR = `${HOME}/.config/kitty`
const KITTY_CONF = `${KITTY_CONF_DIR}/kitty.conf`
const KITTY_LISTEN = "unix:/tmp/kitty-yorha"

const writeFile = (path: string, content: string) => {
    const file = Gio.File.new_for_path(path)
    file.replace_contents(
        new TextEncoder().encode(content),
        null, false,
        Gio.FileCreateFlags.REPLACE_DESTINATION,
        null
    )
}

const readFile = (path: string): string => {
    const file = Gio.File.new_for_path(path)
    const [, data] = file.load_contents(null)
    return new TextDecoder().decode(data)
}

let _cachedDarkCss = ""
let _cachedLightCss = ""

const compile_css = async () => {
    writeFile(DATA_SCSS, `$screen_width:${SCREEN_WIDTH}px;$screen_height:${SCREEN_HEIGHT}px;`)
    await execAsync(["sassc", SCSS, CSS]).catch(e => print("sassc error:", e))
}

const cacheBothCss = async () => {
    writeFile(DATA_SCSS, `$screen_width:${SCREEN_WIDTH}px;$screen_height:${SCREEN_HEIGHT}px;`)
    try {
        // Dark
        writeFile(COLOR_SCSS, readFile(`${OLD_AGS}/style/color-dark.scss`))
        await execAsync(["sassc", SCSS, CSS])
        _cachedDarkCss = readFile(CSS)
        // Light
        writeFile(COLOR_SCSS, readFile(`${OLD_AGS}/style/color-light.scss`))
        await execAsync(["sassc", SCSS, CSS])
        _cachedLightCss = readFile(CSS)
    } catch (e) { print("cacheBothCss error:", e) }
}

const reload_css = async (isDark: boolean) => {
    try {
        const css = isDark ? _cachedDarkCss : _cachedLightCss
        if (!css) {
            // Fallback — compile on-demand if cache is empty
            const colorContent = readFile(`${OLD_AGS}/style/color-${isDark ? "dark" : "light"}.scss`)
            writeFile(COLOR_SCSS, colorContent)
            await execAsync(["sassc", SCSS, CSS])
            App.reset_css()
            App.apply_css(CSS, false)
        } else {
            writeFile(CSS, css)
            App.reset_css()
            App.apply_css(CSS, false)
        }
    } catch (e) { print("reload_css error:", e) }
}

const applyKittyTheme = async (isDark: boolean) => {
    try {
        const theme = `${KITTY_THEME_DIR}/yorha_${isDark ? "dark" : "light"}.conf`
        const confDir = Gio.File.new_for_path(KITTY_CONF_DIR)
        if (!confDir.query_exists(null)) confDir.make_directory_with_parents(null)
        writeFile(KITTY_CONF, readFile(theme))

        await execAsync([
            "sh", "-c",
            `kitty @ --to ${KITTY_LISTEN} set-colors --all --configured ${theme} >/dev/null 2>&1 || true; ` +
            `pkill -USR1 -x kitty >/dev/null 2>&1 || true`,
        ])
    } catch (e) { print("kitty theme error:", e) }
}

let top_bar_height = 0
let bottom_bar_height = 0
let last_reserved_t = -1
let last_reserved_b = -1

const reserveSpace = async () => {
    const t = Math.max(top_bar_height, 0)
    const b = Math.max(bottom_bar_height, 0)
    if (t === 0 && b === 0) return
    // only re-issue when the values actually change. every addreserved makes hypr
    // recompute all the window decoration stuff, and spamming it every 5s was
    // enough to crash the compositor on me once. bar height is basically constant
    // so after the first call this is a no-op.
    if (t === last_reserved_t && b === last_reserved_b) return
    last_reserved_t = t
    last_reserved_b = b
    await execAsync([
        "hyprctl", "keyword", "monitor",
        `,addreserved,${t},${b},0,0`,
    ]).catch(print)
}

const Bar = () => {
    const settingsBtn = SpinningLogo({
        iconPath: `${assetsDir()}/yorha.png`,
        size: 24,                           // fits inside the frame-height button
        onClicked: () => {
            try {
                toggleSettings()
            } catch (e) { print("settings toggle:", e) }
        },
    })

    const top = Box({
        vertical: true,
        hexpand: false,
        className: "top",
        css: `min-width: ${SCREEN_WIDTH}px;`,
        children: [
            // one horizontal bar across the whole screen width. every frame hexpands
            // so they spread evenly instead of bunching, like the in-game tab strip.
            Box({
                hexpand: true,
                vpack: "center", hpack: "fill",
                spacing: 8,                  // one uniform gap between frames
                css: "padding: 1px 8px 0 8px;",   // no bottom pad so active frames reach the separator
                children: [
                    WorkspaceTiles(),
                    ...HudStats(),
                    HudBrightness(),
                    HudVolume(),
                    HudTemp(),
                    HudClock(),
                    TrayTile(),
                    settingsBtn,
                ],
            }),
            HudPatternBar({ height: 26 }),
        ],
        setup: (self: any) => timeout(1000, async () => {
            top_bar_height = self.get_allocation().height + 8
            while (true) {
                await reserveSpace()
                await new Promise(r => timeout(5000, r))
            }
        }),
    })

    return Window({
        name: "bar",
        className: "bar",
        margin: [0, 0],
        anchor: Anchor.TOP | Anchor.LEFT | Anchor.RIGHT,
        exclusivity: Exclusivity.IGNORE,
        layer: Layer.BOTTOM,
        child: Box({ css: "margin-top: 10px;", children: [top] }),
    })
}


let pendingTarget: string | null = null

const queueWsSwitch = (target: string): void => {
    if (isAnimating()) {
        pendingTarget = target
        return
    }
    pendingTarget = null
    triggerSwitch(target).then(() => {
        if (pendingTarget !== null) {
            const next = pendingTarget
            pendingTarget = null
            // tiny gap so the compositor settles before the next one
            timeout(40, () => queueWsSwitch(next))
        }
    }).catch(print)
}

// force-hide every modal/overlay (not the bar). these are fullscreen overlay
// surfaces and if one ever gets stuck visible it eats all the input while the
// clock keeps ticking. bound to CTRL SHIFT ALT,c so i can recover without killing
// ags. prints what it hid too.
const MODAL_WINDOWS = [
    "tray", "tray_props", "tray_bluetooth",
    "settings", "bg_settings", "player",
    "calendar", "wifi", "bluetooth", "bluetooth_actions",
    "screenshot",
]
const closeAllModals = () => {
    const stuck: string[] = []
    for (const name of MODAL_WINDOWS) {
        try {
            const w: any = App.get_window(name)
            if (w?.visible) { w.visible = false; stuck.push(name) }
        } catch (e) { print(`[closeall] ${name}: ${e}`) }
    }
    print(`[closeall] hid ${stuck.length} modal(s): ${stuck.join(", ") || "(none)"}`)
}

App.start({
    instanceName: "yorha",
    requestHandler(request: string, res: (r: any) => void) {
        const reply = (r: any) => { try { res(r) } catch {} }
        if (request === "toggle-dark") {
            triggerBanner()
            reply("ok")
        } else if (request === "toggle-player") {
            togglePlayer()
            reply("ok")
        } else if (request === "toggle-settings") {
            try { toggleSettings() } catch (e) { print(e) }
            reply("ok")
        } else if (request === "dismiss-notifs") {
            dismissAllNotifications()
            reply("ok")
        } else if (request === "screenshot") {
            triggerScreenshot()
            reply("ok")
        } else if (request === "record-start" || request === "record-stop") {
            triggerRecordAnim(() => reply("ok"))
            return
        } else if (request === "closeall") {
            try { closeAllModals() } catch (e) { print(e) }
            reply("ok")
        } else if (request === "ws-anim") {
            triggerWsAnim()
            reply("ok")
        } else if (request.startsWith("ws-go ") || request.startsWith("ws-rel ")) {
            // build the workspace arg - either "N" or "e+1"/"e-1"
            const target = request.startsWith("ws-go ")
                ? request.slice(6).trim()
                : `e${request.slice(7).trim()}`

            if (target) queueWsSwitch(target)
            reply("ok")
        } else {
            reply("unknown request")
        }
    },
    main() {
        cacheBothCss().then(() => {
            writeFile(COLOR_SCSS, readFile(`${OLD_AGS}/style/color-light.scss`))
            writeFile(CSS, _cachedLightCss)
            App.apply_css(CSS, false)
            applyKittyTheme(false).catch(print)
        }).catch(print)

        dark.subscribe((isDark) => {
            triggerThemeWipe()
            timeout(16, () => reload_css(isDark).catch(print))
            timeout(32, () => applyKittyTheme(isDark).catch(print))

            timeout(2000, () => {
                execAsync([
                    "awww", "img",
                    `${YORHA_DIR}/wallpapers/nier_${isDark ? "dark" : "light"}.png`,
                    "--transition-type", "simple", "--transition-step", "255",
                ]).catch(print)
            })

            timeout(1000, () => reserveSpace())
        })

        // windows - bg_settings has to come before settings (settings shows/hides it)
        Bar()
        WsAnimWindow()
        PlayerWindow()
        NotificationsWindow()
        BannerWindow()
        ScreenshotWindow()
        OsdWindow()
        CalendarWindow()
        GraphWindow()
        DiskWindow()
        BatteryWindow()
        WifiWindow()
        BluetoothWindow()
        BluetoothActionWindow()
        WeatherWindow()
        TrayWindow()
        TrayBluetoothWindow()
        TrayPropsWindow()
        SettingsBgWindow()
        SettingsWindow()
    },
})
