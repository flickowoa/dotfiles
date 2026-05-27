import {
    Window, Box, Label, Entry, DrawingArea, Scrollable, EventBox, Astal,
    Anchor, Layer, Exclusivity, Keymode,
} from "../../widget.ts"
import { execAsync, Variable } from "astal"
import Gdk from "gi://Gdk?version=3.0"
import GLib from "gi://GLib"
import Gio from "gi://Gio"
import { dark } from "../../env.ts"
import { menuPalette, menuPanelCss, MENU_FONT } from "../../nier/menu.ts"
import { RevealBox, type Reveal } from "../../nier/anim.ts"
import { drawWeatherIcon } from "../../widgets/weather_icon.ts"
import { modalOpen, modalClose, addDragDismiss } from "../../nier/stack.ts"

const { min, round } = Math

export interface WxLocation { name: string; lat: number; lon: number }

const STORE = `${GLib.get_user_cache_dir()}/yorha_weather.json`

const loadLocation = (): WxLocation => {
    try {
        const f = Gio.File.new_for_path(STORE)
        const [, data] = f.load_contents(null)
        const o = JSON.parse(new TextDecoder().decode(data))
        if (o && typeof o.lat === "number" && typeof o.lon === "number")
            return { name: o.name || "Porto", lat: o.lat, lon: o.lon }
    } catch {}
    return { name: "London, UK", lat: 51.5074, lon: -0.1278 }
}

const saveLocation = (loc: WxLocation) => {
    try {
        const f = Gio.File.new_for_path(STORE)
        f.replace_contents(
            new TextEncoder().encode(JSON.stringify(loc)),
            null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null,
        )
    } catch (e) { print("weather save:", e) }
}

export const weatherLocation = Variable<WxLocation>(loadLocation())

const WMO_KINDS: Record<number, string> = {
    0: "clear", 1: "partly", 2: "partly", 3: "cloud",
    45: "fog", 48: "fog",
    51: "rain", 53: "rain", 55: "rain", 56: "snow", 57: "snow",
    61: "rain", 63: "rain", 65: "rain", 66: "snow", 67: "snow",
    71: "snow", 73: "snow", 75: "snow", 77: "snow",
    80: "rain", 81: "rain", 82: "rain", 85: "snow", 86: "snow",
    95: "thunder", 96: "thunder", 99: "thunder",
}

const wmoToCondition = (code: number): string => {
    const c = WMO_KINDS[code] || "cloud"
    if (c === "clear") return "Clear"
    if (c === "partly") return "Partly cloudy"
    if (c === "cloud") return "Overcast"
    if (c === "fog") return "Fog"
    if (c === "rain") return "Light rain"
    if (c === "snow") return "Light snow"
    if (c === "thunder") return "Thunderstorm"
    return "Cloudy"
}

let _win: any = null
let _reveal: Reveal | null = null
let _panel: any = null
let _entry: any = null
let _curLbl: any = null
let _resultsBox: any = null
let _hint: any = null
let _searchTimer: number | null = null
let _forecastBox: any = null
let _cachedForecast: any[] | null = null

const setLocation = (loc: WxLocation) => {
    weatherLocation.set(loc)
    saveLocation(loc)
}

const resultRow = (label: string, loc: WxLocation): any => {
    const p = menuPalette()
    const lbl = Label({
        label,
        xalign: 0,
        css: `font-family:${MENU_FONT};font-size:12px;color:rgba(${p.fg},1);padding:6px 10px;`,
    })
    const ev = EventBox({
        hexpand: true,
        child: lbl,
        css: `background: rgba(${p.fg},0.12); border-radius:2px;`,
        setup: (self: any) => {
            self.set_size_request(-1, 32)
            self.connect("button-press-event", () => {
                setLocation(loc); if (_curLbl) _curLbl.label = `◆ ${loc.name}`; toggleWeather(); return true
            })
            self.connect("enter-notify-event", () => { self.css = `background: rgba(${menuPalette().fg},0.28); border-radius:2px;`; return false })
            self.connect("leave-notify-event", () => { self.css = `background: rgba(${menuPalette().fg},0.12); border-radius:2px;`; return false })
            dark.subscribe(() => {
                const p2 = menuPalette()
                self.css = `background: rgba(${p2.fg},0.12); border-radius:2px;`
                lbl.css = `font-family:${MENU_FONT};font-size:12px;color:rgba(${p2.fg},1);padding:6px 10px;`
            })
        },
    })
    return ev
}

const search = async (query: string) => {
    const q = query.trim()
    if (q.length < 2) { if (_resultsBox) _resultsBox.children = []; return }
    if (_hint) _hint.label = "◆ SEARCHING…"
    try {
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=8&language=en&format=json`
        const out = await execAsync(["curl", "-sf", "--max-time", "6", url])
        const data = JSON.parse(out)
        const results: any[] = data.results || []
        if (_resultsBox) {
            _resultsBox.children = results.map((r: any) => {
                const parts = [r.name, r.admin1, r.country].filter(Boolean)
                return resultRow(parts.join(", "), {
                    name: parts.join(", "), lat: r.latitude, lon: r.longitude,
                })
            })
            _resultsBox.queue_resize()
        }
        if (_hint) _hint.label = results.length ? `◆ ${results.length} MATCHES` : "◆ NO MATCHES"
    } catch (e) {
        if (_hint) _hint.label = "◆ SEARCH FAILED"
        print("weather geocode:", e)
    }
}

const queueSearch = (q: string) => {
    if (_searchTimer !== null) GLib.source_remove(_searchTimer)
    _searchTimer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 380, () => {
        _searchTimer = null
        search(q).catch(print)
        return false
    })
}

const dayName = (dateStr: string): string => {
    const d = new Date(dateStr + "T12:00:00")
    return ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][d.getDay()] || ""
}

const CARD_W = 75

const makeForecastCard = (d: any, p: ReturnType<typeof menuPalette>): any => {
    const cond = wmoToCondition(d.code)
    const icon = DrawingArea({ hexpand: false, vexpand: false })
    icon.set_size_request(28, 28)
    try { icon.set_valign(3) } catch {}
    try { icon.set_halign(3) } catch {}
    icon.connect("draw", (_w: any, ctx: any) => {
        const a = icon.get_allocation()
        const S = min(a.width || 28, a.height || 28)
        const fg: readonly [number, number, number] = dark.get()
            ? [234 / 255, 228 / 255, 210 / 255]
            : [72 / 255, 70 / 255, 61 / 255]
        drawWeatherIcon(ctx, cond, S, fg[0], fg[1], fg[2])
        return false
    })
    dark.subscribe(() => icon.queue_draw())

    const card = Box({
        vertical: true,
        spacing: 3,
        css: `border: 1px solid rgba(${p.fg},0.25); padding: 8px 4px;`,
        children: [
            Label({
                label: d.day,
                css: `font-family:${MENU_FONT};font-size:10px;color:rgba(${p.fg},0.85);letter-spacing:1px;text-align:center;font-weight:700;`,
                xalign: 0.5,
            }),
            Label({
                label: cond.toUpperCase(),
                css: `font-family:${MENU_FONT};font-size:8px;color:rgba(${p.fg},0.5);letter-spacing:1px;text-align:center;`,
                xalign: 0.5,
            }),
            icon,
            Label({
                label: `MAX ${round(d.hi)}°`,
                css: `font-family:${MENU_FONT};font-size:12px;color:rgba(${p.fg},1);letter-spacing:1px;text-align:center;font-weight:700;`,
                xalign: 0.5,
            }),
            Label({
                label: `MIN ${round(d.lo)}°`,
                css: `font-family:${MENU_FONT};font-size:10px;color:rgba(${p.fg},0.55);letter-spacing:1px;text-align:center;font-weight:700;`,
                xalign: 0.5,
            }),
        ],
    })
    card.set_size_request(CARD_W, -1)
    return card
}

const fetchForecast = async () => {
    const { lat, lon } = weatherLocation.get()
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min&forecast_days=7&timezone=auto`
        const out = await execAsync(["curl", "-sf", "--max-time", "8", url])
        const data = JSON.parse(out)
        const daily = data.daily || {}
        _cachedForecast = []
        for (let i = 0; i < (daily.time?.length || 0); i++) {
            _cachedForecast.push({
                day: dayName(daily.time[i]),
                code: (daily.weathercode || [])[i] ?? 0,
                hi: (daily.temperature_2m_max || [])[i] ?? "--",
                lo: (daily.temperature_2m_min || [])[i] ?? "--",
            })
        }
        rebuildForecastCards()
    } catch (e) { print("forecast fetch:", e) }
}

const rebuildForecastCards = () => {
    if (!_cachedForecast || !_forecastBox) return
    const p = menuPalette()
    _forecastBox.children = _cachedForecast.map(d => makeForecastCard(d, p))
    _forecastBox.show_all()
    _forecastBox.queue_resize()
}

const restyle = () => {
    const p = menuPalette()
    if (_panel) _panel.css = menuPanelCss()
    if (_curLbl) _curLbl.css =
        `font-family:${MENU_FONT};font-size:13px;color:rgba(${p.fg},1);letter-spacing:2px;font-weight:700;`
    if (_hint) _hint.css =
        `font-family:${MENU_FONT};font-size:10px;color:rgba(${p.fg},0.6);letter-spacing:3px;`
    if (_entry) _entry.css = `
        font-family:${MENU_FONT}; font-size:13px;
        color: rgba(${p.fg},1);
        background: rgba(${p.fg},0.10); background-image:none;
        border-top: 2px solid rgba(${p.fg},0.7);
        border-bottom: 2px solid rgba(${p.fg},0.7);
        border-left:none; border-right:none;
        padding: 6px 10px; margin: 0;
        caret-color: rgba(${p.fg},1);
    `
}

const close = () => {
    if (!_win || !_reveal) return
    modalClose("weather")
    _reveal.close(() => { _win.visible = false })
}

export const isWeatherOpen = () => !!_win?.visible

export const toggleWeather = () => {
    if (!_win) return
    if (_win.visible) { close(); return }
    try { _win.marginRight = 18 } catch {}
    restyle()
    if (_curLbl) _curLbl.label = `◆ ${weatherLocation.get().name}`
    if (_resultsBox) _resultsBox.children = []
    if (_entry) _entry.text = ""
    if (_hint) _hint.label = "◆ TYPE A CITY"
    if (_forecastBox) _forecastBox.children = []
    fetchForecast().catch(print)
    _win.visible = true
    _reveal?.open()
    modalOpen("weather", _win)
    try { _entry?.grab_focus() } catch {}
}

export const WeatherWindow = () => {
    const p = menuPalette()

    const header = Label({
        label: "◆ FORECAST",
        css: `font-family:${MENU_FONT};font-size:14px;color:rgba(${p.fg},1);letter-spacing:4px;font-weight:700;`,
        xalign: 0,
    })

    _forecastBox = Box({ spacing: 2 })
    const forecastScroll = Scrollable({
        hscroll: "automatic", vscroll: "never",
        css: "min-width: 540px; min-height: 150px;",
        child: _forecastBox,
    })

    _curLbl = Label({
        label: `◆ ${weatherLocation.get().name}`,
        css: `font-family:${MENU_FONT};font-size:13px;color:rgba(${p.fg},1);letter-spacing:2px;font-weight:700;`,
        xalign: 0,
    })

    _entry = Entry({ placeholder_text: "Search city…", hexpand: true })
    _entry.connect("changed", () => queueSearch(_entry.text || ""))
    _entry.connect("activate", () => { if (_searchTimer !== null) { GLib.source_remove(_searchTimer); _searchTimer = null } search(_entry.text || "").catch(print) })

    _hint = Label({
        label: "◆ TYPE A CITY",
        css: `font-family:${MENU_FONT};font-size:10px;color:rgba(${p.fg},0.6);letter-spacing:3px;`,
        xalign: 0,
    })

    _resultsBox = Box({ vertical: true, spacing: 4, hexpand: true, css: "min-height: 100px;" })

    _panel = Box({
        vertical: true,
        spacing: 10,
        css: menuPanelCss(),
        children: [
            header,
            forecastScroll,
            Label({ label: "CURRENT", xalign: 0, css: `font-family:${MENU_FONT};font-size:9px;color:rgba(${p.fg},0.5);letter-spacing:3px;` }),
            _curLbl,
            _entry,
            _hint,
            _resultsBox,
        ],
    })

    _reveal = RevealBox(_panel)
    dark.subscribe(() => { restyle(); rebuildForecastCards() })

    _win = Window({
        name: "weather",
        className: "weather",
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
                if (kv === Gdk.KEY_Escape || kv === 65307) { close(); return true }
                return false
            })
            addDragDismiss(self, close, 18)
        },
    })

    return _win
}
