// the top/bottom bar widgets. reshaped these from the original a bit - boxed
// frames with the detached top/bottom rails, uppercase headings, the nier look.
import { Box, Label, DrawingArea, EventBox } from "../widget.ts"
import { execAsync, interval, timeout } from "astal"
import Gio from "gi://Gio"
import Gdk from "gi://Gdk?version=3.0"
import GLib from "gi://GLib"
import { dark, SCREEN_WIDTH } from "../env.ts"
import { toggleGraph, currentGraphType } from "../windows/graph/graph.ts"
import { toggleDisk, isDiskOpen } from "../windows/disk/disk.ts"
import { toggleCalendar, isCalendarOpen } from "../windows/calendar/calendar.ts"
import { toggleWifi, isWifiOpen } from "../windows/wifi/wifi.ts"
import { toggleWeather, isWeatherOpen, weatherLocation } from "../windows/weather/weather.ts"
import { toggleSlider, isSliderOpen } from "../windows/sliders/sliders.ts"
import { toggleBattery, isBatteryOpen } from "../windows/battery/battery.ts"
import { drawWeatherIcon } from "./weather_icon.ts"
import { RailTab } from "../nier/menu.ts"

const TXT_DIM    = "rgba(72,70,61,0.70)"     // brown @ 70%
const TXT_MID    = "rgba(72,70,61,0.95)"     // brown @ 95%
const TXT_BRIGHT = "rgba(72,70,61,1.00)"     // full brown #48463d

const FONT = `"FOT-Rodin Pro M","Noto Sans Mono",monospace`

// bumped the fonts a touch bigger/bolder than stock. no colours here on purpose -
// they inherit the frame's `color:` so one label works across light/dark + states
const lblHeading = `font-family:${FONT};font-size:14px;letter-spacing:3px;font-weight:600;`
const lblValue   = `font-family:${FONT};font-size:16px;letter-spacing:1px;font-weight:600;`
const lblTime    = `font-family:${FONT};font-size:18px;letter-spacing:4px;font-weight:700;`
const lblTitle   = `font-family:${FONT};font-size:16px;letter-spacing:2px;font-weight:600;`

// brown #48463d -> rgba(72,70,61), tan #c2bda6 -> rgba(194,189,166), + dark pair
const BROWN     = "72,70,61"
const TAN       = "194,189,166"
const DARK_BG   = "28,26,21"     // dark-mode background base
const CREAM     = "234,228,210"  // dark-mode foreground

// frame css per state. idle = faint fill, no border. hover = stronger fill + the
// detached top/bottom rails. active = full fill with inverted text.
const mkFrameCss = (
    bg: string, fg: string, borderColor: string,
) => `
    background: ${bg};
    background-image: none;
    border-top: 3px solid ${borderColor};
    border-bottom: 3px solid ${borderColor};
    border-left: none;
    border-right: none;
    padding: 4px 14px;
    margin: 0 4px;
    color: ${fg};
`

// light-mode states
const FRAME_IDLE_L   = mkFrameCss(`rgba(${BROWN},0.20)`, `rgba(${BROWN},1)`, "transparent")
const FRAME_HOVER_L  = mkFrameCss(`rgba(${BROWN},0.32)`, `rgba(${BROWN},1)`, `rgba(${BROWN},1)`)
const FRAME_ACTIVE_L = mkFrameCss(`rgba(${BROWN},1)`,    `rgba(${TAN},1)`,   `rgba(${BROWN},1)`)

// dark-mode states (inverted)
const FRAME_IDLE_D   = mkFrameCss(`rgba(${CREAM},0.18)`, `rgba(${CREAM},1)`, "transparent")
const FRAME_HOVER_D  = mkFrameCss(`rgba(${CREAM},0.30)`, `rgba(${CREAM},1)`, `rgba(${CREAM},1)`)
const FRAME_ACTIVE_D = mkFrameCss(`rgba(${CREAM},1)`,    `rgba(${DARK_BG},1)`, `rgba(${CREAM},1)`)

const frameCss = (state: "idle" | "hover" | "active", isDark: boolean): string => {
    if (state === "active") return isDark ? FRAME_ACTIVE_D : FRAME_ACTIVE_L
    if (state === "hover")  return isDark ? FRAME_HOVER_D  : FRAME_HOVER_L
    return isDark ? FRAME_IDLE_D : FRAME_IDLE_L
}

// just the idle css, used by HudIdentifier
const FRAME_CSS = FRAME_IDLE_L

// ── helpers ──────────────────────────────────────────────────────────────────

// const pct3 = (n: number) => String(Math.round(n)).padStart(3, "0") + "%"
const pct = (n: number) => String(Math.round(n)) + "%"
const pad2 = (n: number) => String(n).padStart(2, "0")

const readFile = (path: string): string => {
    try {
        const f = Gio.File.new_for_path(path)
        const [, data] = f.load_contents(null)
        return new TextDecoder().decode(data)
    } catch { return "" }
}

// cpu usage
let _prevIdle = 0, _prevTotal = 0
const cpuPercent = (): number => {
    const line = readFile("/proc/stat").split("\n")[0]
    const nums = line.split(/\s+/).slice(1).map(Number)
    const idle  = nums[3] + (nums[4] || 0)
    const total = nums.reduce((a, b) => a + b, 0)
    const dI = idle - _prevIdle, dT = total - _prevTotal
    _prevIdle = idle; _prevTotal = total
    if (dT === 0) return 0
    return Math.max(0, Math.min(100, (1 - dI / dT) * 100))
}

const ramPercent = (): number => {
    const lines = readFile("/proc/meminfo").split("\n")
    const get = (key: string): number => {
        const l = lines.find(l => l.startsWith(key))
        return l ? parseInt(l.split(/\s+/)[1]) : 0
    }
    const total = get("MemTotal:")
    const avail = get("MemAvailable:")
    return total ? (1 - avail / total) * 100 : 0
}

// ── NierFrame — the little box around each hud item ─────────────────────────
// three states (idle/hover/active), follows the theme toggle. optional click
// handlers + a getActive() poll (so the CPU/MEM etc box lights up while its graphpopup is open).
const NierFrame = ({ heading, value, onSingle, onDouble, getActive, symbol }: {
    heading: string
    value: any
    onSingle?: () => void
    onDouble?: () => void
    getActive?: () => boolean
    symbol?: string
}) => {
    // the leading square is a real box from RailTab (square:true) so it lines up
    // with the text. no explicit colour on the labels so they flip with the state.
    const headingLbl = Label({ label: heading, css: lblHeading, vpack: "center" })
    const content = Box({
        spacing: 8,
        vpack: "center",
        hexpand: true,
        children: heading ? [headingLbl, value] : [value],
    })

    const { box } = RailTab({
        content, onSingle, onDouble, getActive, hexpand: true,
        square: true, squareSize: 14,
    })
    return box
}

// ── HudPatternBar — redrew the nier "pattern" divider in cairo ──────────────
//   - a 2px full-width line at the top
//   - 10px bars every 50px just under it
//   - two rows of fine tick clusters with an alpha ramp
const drawPattern = (ctx: any, width: number, height: number, isDark: boolean) => {
    const [r, g, b] = isDark
        ? [194/255, 189/255, 166/255]   
        : [77/255,  73/255,  62/255]    // #4D493E for light mode

    // 1. solid 2px line across the top
    ctx.setSourceRGBA(r, g, b, 1)
    ctx.rectangle(0, 0, width, 2)
    ctx.fill()

    // 2. little 10x3 bars every 50px, just under the line
    ctx.setSourceRGBA(r, g, b, 1)
    for (let x = 0; x < width; x += 50) ctx.rectangle(x, 4, 10, 3)
    ctx.fill()

    // one cluster of tick marks - two 4px dash groups per 50px, with an alpha ramp
    const dashAlpha = [0.4, 0.8, 0.9, 0.4]
    const cluster = (xOff: number, baseY: number, h: number) => {
        for (let x = xOff; x < width; x += 50) {
            for (const groupX of [x, x + 12]) {
                for (let k = 0; k < 4; k++) {
                    ctx.setSourceRGBA(r, g, b, dashAlpha[k])
                    ctx.rectangle(groupX + k, baseY, 1, h)
                    ctx.fill()
                }
            }
        }
    }

    // upper + lower tick clusters
    cluster(22, 10, 4)
    cluster(28, 18, 4)
}

export const HudPatternBar = ({ height = 26 }: { height?: number } = {}) => {
    const area = DrawingArea({ hexpand: true })
    // need an explicit size or the drawingarea gets 0 height and never draws
    area.set_size_request(-1, height)
    area.connect("draw", (_w: any, ctx: any) => {
        const alloc = area.get_allocation()
        drawPattern(ctx, alloc.width || SCREEN_WIDTH, alloc.height || height, dark.get())
        return false
    })
    dark.subscribe(() => area.queue_draw())
    // kick a draw
    timeout(50, () => area.queue_draw())
    return area
}

// ── top-bar widgets ─────────────────────────────────────────────────────────

export const HudClock = () => {
    const lbl = Label({ css: lblTime, label: "00:00:00" })
    const update = () => {
        const now = new Date()
        lbl.label = `${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`
    }
    update()
    const t = interval(1000, update)
    lbl.connect("destroy", () => t.cancel())
    // NierFrame so it gets the same hover/dark styling as the rest
    return NierFrame({ heading: "", symbol: "■", value: lbl,
        onSingle: () => toggleCalendar(),
        getActive: () => isCalendarOpen() })
}

// ── utility frames — battery, brightness, temp, uptime, volume  and others ──────────────

const findFirst = (paths: string[]): string | null => {
    for (const p of paths) {
        try {
            const f = Gio.File.new_for_path(p)
            if (f.query_exists(null)) return p
        } catch {}
    }
    return null
}

const findBatteryDir = (): string | null => {
    try {
        const root = Gio.File.new_for_path("/sys/class/power_supply")
        const iter = root.enumerate_children("standard::name,standard::type", Gio.FileQueryInfoFlags.NONE, null)
        let info: any
        while ((info = iter.next_file(null))) {
            const name = info.get_name?.() ?? info.get_attribute_string?.("standard::name")
            if (!name) continue
            const dir = `/sys/class/power_supply/${name}`
            if (readFile(`${dir}/type`).trim() === "Battery") return dir
        }
    } catch {}
    return findFirst([
        "/sys/class/power_supply/BAT0",
        "/sys/class/power_supply/BAT1",
        "/sys/class/power_supply/BATC",
    ])
}

export const HudBattery = () => {
    const val = Label({ css: lblValue, label: "---" })
    const batDir = findBatteryDir()
    if (!batDir) val.label = "AC"
    else {
        const update = () => {
            const cap = parseInt(readFile(`${batDir}/capacity`).trim()) || 0
            val.label = `${Math.round(cap)}%`
        }
        update()
        const t = interval(10_000, update)
        val.connect("destroy", () => t.cancel())
    }
    return NierFrame({
        heading: "BAT",
        value: val,
        onSingle: () => toggleBattery(),
        getActive: () => isBatteryOpen(),
    })
}

export const HudBrightness = () => {
    const val = Label({ css: lblValue, label: "---" })
    const dir = findFirst([
        "/sys/class/backlight/intel_backlight",
        "/sys/class/backlight/amdgpu_bl0",
        "/sys/class/backlight/acpi_video0",
    ])
    if (!dir) val.label = "---"
    else {
        const maxB = parseInt(readFile(`${dir}/max_brightness`).trim()) || 1
        const update = () => {
            const cur = parseInt(readFile(`${dir}/brightness`).trim()) || 0
            val.label = String(Math.round(cur / maxB * 100)).padStart(3, "0") + "%"
        }
        update()
        const t = interval(5_000, update)   
        val.connect("destroy", () => t.cancel())
    }
    return NierFrame({ heading: "BRT", value: val, onSingle: () => toggleSlider("brt"), getActive: () => isSliderOpen() === "brt" })
}

export const HudTemp = () => {
    return HudBattery()
}

export const HudUptime = () => {
    const val = Label({ css: lblValue, label: "--:--" })
    const update = async () => {
        try {
            const raw = parseInt(readFile("/proc/uptime").trim().split(" ")[0])
            const h = Math.floor(raw / 3600)
            const m = Math.floor((raw % 3600) / 60)
            val.label = `${h}h${String(m).padStart(2, "0")}m`
        } catch { val.label = "--" }
    }
    update()
    const t = interval(60_000, update)
    val.connect("destroy", () => t.cancel())
    return NierFrame({ heading: "UP", value: val })
}

export const HudVolume = () => {
    const val = Label({ css: lblValue, label: "---" })
    const update = async () => {
        try {
            const raw = await execAsync(["sh", "-c", "wpctl get-volume @DEFAULT_AUDIO_SINK@"])
            const muted = raw.includes("[MUTED]")
            const m = raw.match(/Volume:\s*([\d.]+)/)
            if (muted) { val.label = "MUTE"; return }
            if (m) val.label = String(Math.round(parseFloat(m[1]) * 100)).padStart(3, "0") + "%"
        } catch { val.label = "---" }
    }
    update()
    const t = interval(5_000, update)   // wpctl subprocess; the OSD already shows live volume
    val.connect("destroy", () => t.cancel())
    return NierFrame({ heading: "VOL", value: val, onSingle: () => toggleSlider("vol"), getActive: () => isSliderOpen() === "vol" })
}

// ── bottom-bar widgets ──────────────────────────────────────────────────────

export const HudIdentifier = () => Box({
    spacing: 10,
    vpack: "center",
    css: FRAME_CSS,
    children: [
        Label({ label: "◆",                 css: `color:${TXT_BRIGHT};font-size:11px;` }),
        Label({ label: "YoRHa No.2 Type B", css: lblTitle }),
        Label({ label: "│",                 css: `color:${TXT_DIM};` }),
        Label({ label: "UNIT ACTIVE",       css: lblHeading }),
    ],
})

export const HudDate = () => {
    const lbl = Label({ css: lblTitle, label: "----.--.-- ---" })
    const weekdays = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"]
    const update = () => {
        const now = new Date()
        lbl.label = `${now.getFullYear()}.${pad2(now.getMonth() + 1)}.${pad2(now.getDate())} ${weekdays[now.getDay()]}`
    }
    update()
    const t = interval(60_000, update)
    lbl.connect("destroy", () => t.cancel())
    return NierFrame({
        heading: "",
        symbol: "◇",
        value: lbl,
        onSingle: () => toggleCalendar(),
    })
}

export const HudStats = () => {
    const cpuVal  = Label({ css: lblValue, label: "---%" })
    const ramVal  = Label({ css: lblValue, label: "---%" })
    const diskVal = Label({ css: lblValue, label: "----" })
    const wxVal   = Label({ css: lblValue, label: "---" })
    const wfVal   = Label({ css: lblValue, label: "----" })

    cpuPercent()   // seed

    const sysTimer = interval(2000, async () => {
        cpuVal.label = pct(cpuPercent())
        ramVal.label = pct(ramPercent())
    })

    const updateDisk = async () => {
        try {
            const out = await execAsync(["df", "-h", "--output=avail", "/"])
            diskVal.label = (out.trim().split("\n")[1] || "----").trim()
        } catch { diskVal.label = "----" }
    }
    updateDisk()
    const diskTimer = interval(30_000, updateDisk)

    // weather icon - recoloured per state (fg idle, inverted bg when selected)
    let wxCond = ""
    let wxSelected = false
    const wxIconRGB = (isDark: boolean): readonly [number, number, number] => {
        const fg: readonly [number, number, number] = isDark ? [234 / 255, 228 / 255, 210 / 255] : [72 / 255, 70 / 255, 61 / 255]
        const bg: readonly [number, number, number] = isDark ? [28 / 255, 26 / 255, 21 / 255]     : [194 / 255, 189 / 255, 166 / 255]
        return wxSelected ? bg : fg
    }
    const wxIcon = DrawingArea({ hexpand: false, vexpand: false })
    wxIcon.set_size_request(20, 20)
    try { wxIcon.set_valign(3) } catch {}
    wxIcon.connect("draw", (_w: any, ctx: any) => {
        const a = wxIcon.get_allocation()
        const S = Math.min(a.width || 20, a.height || 20)
        const [r, g, b] = wxIconRGB(dark.get())
        drawWeatherIcon(ctx, wxCond, S, r, g, b)
        return false
    })

    const updateWeather = async () => {
        try {
            const { lat, lon } = weatherLocation.get()
            if (typeof lat !== "number" || typeof lon !== "number") throw Error("invalid location")
            const raw = await execAsync([
                "curl", "-sf", "--max-time", "6", `wttr.in/${lat},${lon}?format=%t+%C`,
            ])
            const parts = raw.trim().split(" ")
            const temp  = (parts[0] || "").replace("+", "")
            wxCond = parts.slice(1).join(" ")
            wxVal.label = wxCond ? `${temp} ${wxCond.slice(0, 10)}` : (temp || "---")
            wxIcon.queue_draw()
        } catch (e) { print("weather tile:", e); wxVal.label = "---" }
    }
    updateWeather()
    const wxTimer = interval(300_000, updateWeather)
    const wxLocUnsub = weatherLocation.subscribe(() => updateWeather())
    dark.subscribe(() => wxIcon.queue_draw())

    const updateWifi = async () => {
        try {
            const ssid = (await execAsync([
                "sh", "-c",
                "iwgetid -r 2>/dev/null || nmcli -t -f active,ssid dev wifi 2>/dev/null | awk -F: '$1==\"yes\"{print $2}' | head -1",
            ])).trim()
            wfVal.label = ssid ? ssid.slice(0, 12) : "----"
        } catch { wfVal.label = "----" }
    }
    updateWifi()
    const wfTimer = interval(20000, updateWifi)   // ssid rarely changes, no need every 5s

    // launch a kitty running `cmd`
    const inKitty = (cmd: string) =>
        execAsync(["kitty", "-e", "sh", "-c", cmd]).catch(print)

    const cpuFrame = NierFrame({
        heading: "CPU", value: cpuVal,
        onSingle: () => toggleGraph("cpu"),
        onDouble: () => inKitty("btop"),
        getActive: () => currentGraphType() === "cpu",
    })
    cpuFrame.connect("destroy", () => {
        sysTimer.cancel(); diskTimer.cancel(); wxTimer.cancel(); wfTimer.cancel()
        try { wxLocUnsub() } catch {}
    })

    return [
        cpuFrame,
        NierFrame({
            heading: "MEM", value: ramVal,
            onSingle: () => toggleGraph("mem"),
            onDouble: () => inKitty("btop"),
            getActive: () => currentGraphType() === "mem",
        }),
        NierFrame({
            heading: "DISK",
            value: diskVal,
            onSingle: () => toggleDisk(),
            getActive: () => isDiskOpen(),
        }),
        // weather uses an icon in place of the leading square + heading, to show the forecast of the day.
        RailTab({
            content: Box({ spacing: 9, vpack: "center", children: [wxIcon, wxVal] }),
            onSingle: () => toggleWeather(),
            getActive: () => isWeatherOpen(),
            onState: (state: any) => {
                const sel = state !== "idle"
                if (sel !== wxSelected) { wxSelected = sel; wxIcon.queue_draw() }
            },
            hexpand: true,
        }).box,
        NierFrame({
            heading: "NET", value: wfVal,
            onSingle: () => toggleWifi(),
            getActive: () => isWifiOpen(),
        }),
    ]
}
