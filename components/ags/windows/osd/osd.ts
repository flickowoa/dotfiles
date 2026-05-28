// osd - volume/brightness overlay, nier style. auto-hides 2s after the last
// change, coalesces rapid ones.
import { Window, Box, Label, Anchor, Layer, Exclusivity } from "../../widget.ts"
import { subprocess, execAsync } from "astal"
import GLib from "gi://GLib"
import Gio from "gi://Gio"
import { SCREEN_HEIGHT } from "../../env.ts"

let _win: any = null
let _hideId: number | null = null

let _mode: "volume" | "brightness" = "volume"
let _value = 0
let _muted = false
let _lastShownVolume = -1
let _lastShownMuted = false
let _haveVolumeState = false
let _lastShownBrightness = -1
let _haveBrightnessState = false

let _titleLbl: any = null
let _valueLbl: any = null
let _barLbl: any = null

const BAR_W = 30

const makeBar = (v: number): string => {
    const n = Math.max(0, Math.min(BAR_W, Math.round(v / 100 * BAR_W)))
    return "▓".repeat(n) + "░".repeat(BAR_W - n)
}

const updateUI = () => {
    if (!_titleLbl) return
    const title = _mode === "brightness" ? "DISPLAY BRIGHTNESS" : "AUDIO OUTPUT"
    _titleLbl.label = `◆ ${title}`
    _valueLbl.label = _muted ? "MUTED" : `${String(Math.round(_value)).padStart(3, "0")}%`
    _barLbl.label = _muted ? "░".repeat(BAR_W) : makeBar(_value)
}

export const showOsd = (mode: "volume" | "brightness", value: number, muted = false) => {
    _mode = mode
    _value = Math.max(0, Math.min(200, value))   // wpctl can go above 100
    _muted = muted
    updateUI()
    if (_win) _win.visible = true
    if (_hideId !== null) { GLib.source_remove(_hideId); _hideId = null }
    _hideId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 2000, () => {
        if (_win) _win.visible = false
        _hideId = null
        return GLib.SOURCE_REMOVE
    })
}

const maybeShowVolume = (value: number, muted: boolean) => {
    const v = Math.max(0, Math.min(200, Math.round(value)))
    if (!_haveVolumeState) {
        _haveVolumeState = true
        _lastShownVolume = v
        _lastShownMuted = muted
        return
    }
    if (_lastShownVolume === v && _lastShownMuted === muted) return
    _lastShownVolume = v
    _lastShownMuted = muted
    showOsd("volume", v, muted)
}

const maybeShowBrightness = (value: number) => {
    const v = Math.max(0, Math.min(100, Math.round(value)))
    if (!_haveBrightnessState) {
        _haveBrightnessState = true
        _lastShownBrightness = v
        return
    }
    if (_lastShownBrightness === v) return
    _lastShownBrightness = v
    showOsd("brightness", v)
}

const readSysInt = (path: string): number => {
    try {
        const f = Gio.File.new_for_path(path)
        const [, data] = f.load_contents(null)
        return parseInt(new TextDecoder().decode(data).trim()) || 0
    } catch { return -1 }
}

export const OsdWindow = () => {
    const panelCss = `
        background: rgba(14,12,9,0.93);
        border: 1px solid rgba(200,184,154,0.25);
        padding: 16px 28px 18px 28px;
        min-width: 440px;
    `
    const titleCss = `
        font-family: "FOT-Rodin Pro M", "Noto Sans Mono", monospace;
        font-size: 10px;
        color: rgba(200,184,154,0.60);
        letter-spacing: 3px;
    `
    const valueCss = `
        font-family: "FOT-Rodin Pro M", "Noto Sans Mono", monospace;
        font-size: 13px;
        color: #dad4bb;
        letter-spacing: 1px;
    `
    const barCss = `
        font-family: "Noto Sans Mono", monospace;
        font-size: 14px;
        color: #c8b89a;
        margin-top: 8px;
    `

    _titleLbl = Label({ label: "◆ AUDIO OUTPUT", css: titleCss, xalign: 0 })
    _valueLbl = Label({ label: "000%",           css: valueCss, xalign: 1 })
    _barLbl   = Label({ label: "░".repeat(BAR_W), css: barCss, xalign: 0, hexpand: true })

    _win = Window({
        name: "osd",
        className: "osd",
        anchor: Anchor.BOTTOM,
        marginBottom: Math.round(SCREEN_HEIGHT * 0.12),
        exclusivity: Exclusivity.IGNORE,
        layer: Layer.OVERLAY,
        focusable: false,
        visible: false,
        child: Box({
            vertical: true,
            css: panelCss,
            children: [
                Box({
                    spacing: 12,
                    children: [_titleLbl, _valueLbl],
                }),
                _barLbl,
            ],
        }),
    })

    // ── Volume: pactl subscribe ──────────────────────────────────────────
    subprocess(
        ["pactl", "subscribe"],
        (line: string) => {
            // Only react to sink changes (not sink-input, source, etc.)
            if (!/on sink #\d/.test(line)) return
            execAsync(["sh", "-c", "wpctl get-volume @DEFAULT_AUDIO_SINK@"])
                .then((out: string) => {
                    const m = out.match(/Volume:\s*([\d.]+)/)
                    const muted = out.includes("[MUTED]")
                    if (m) maybeShowVolume(Math.round(parseFloat(m[1]) * 100), muted)
                })
                .catch(print)
        },
        (err: string) => print("osd pactl:", err)
    )

    // ── Brightness: poll /sys/class/backlight every 250 ms ───────────────
    const brightDir = "/sys/class/backlight/intel_backlight"
    const maxBright = readSysInt(`${brightDir}/max_brightness`)
    if (maxBright > 0) {
        let _lastBright = -1
        GLib.timeout_add(GLib.PRIORITY_DEFAULT_IDLE, 250, () => {
            const cur = readSysInt(`${brightDir}/brightness`)
            if (cur >= 0 && cur !== _lastBright) {
                _lastBright = cur
                maybeShowBrightness(Math.round(cur / maxBright * 100))
            }
            return GLib.SOURCE_CONTINUE
        })
    }

    return _win
}
