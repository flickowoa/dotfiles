import { Window, Box, Label, DrawingArea, Anchor, Layer, Exclusivity } from "../../widget.ts"
import { execAsync } from "astal"
import Gdk from "gi://Gdk?version=3.0"
import GLib from "gi://GLib"
import Gio from "gi://Gio"
import { dark } from "../../env.ts"
import { RevealBox, type Reveal } from "../../nier/anim.ts"
import { MENU_FONT, menuPalette, menuPanelCss } from "../../nier/menu.ts"
import { modalOpen, modalClose, addDragDismiss } from "../../nier/stack.ts"

const { round, min } = Math

const W = 380

let _win: any = null
let _reveal: Reveal | null = null
let _panel: any = null
let _useLbl: any = null
let _totalLbl: any = null
let _availLbl: any = null
let _topBox: any = null
let _area: any = null
let _loadingLbl: any = null
let _cache: { ts: number; usePct: number; total: string; used: string; avail: string; lines: string[] } | null = null

const readDisk = async () => {
    if (_cache && Date.now() - _cache.ts < 30_000) return _cache
    try {
        const dfOut = await execAsync(["df", "-h", "/"])
        const lines = dfOut.trim().split("\n")
        const parts = lines[1]?.split(/\s+/) || []
        const total = parts[1] || "?"
        const used = parts[2] || "?"
        const avail = parts[3] || "?"
        const usePct = parseInt(parts[4]) || 0

        const bigOut = await execAsync([
            "sh", "-c",
            "du -sh /home/* /var/* /opt/* 2>/dev/null | sort -rh | head -12",
        ])
        const raw = bigOut.trim()
        const bigLines = raw ? raw.split("\n") : []

        _cache = { ts: Date.now(), usePct, total, used, avail, lines: bigLines }
    } catch (e) {
        print("disk modal:", e)
        _cache = { ts: Date.now(), usePct: 0, total: "?", used: "?", avail: "?", lines: [] }
    }
    return _cache!
}

const drawBar = (ctx: any, width: number, height: number, pct: number) => {
    const p = menuPalette()
    const [r, g, b] = dark.get()
        ? [218/255, 212/255, 187/255]
        : [87/255,  84/255,  74/255]

    ctx.setSourceRGBA(14/255, 12/255, 9/255, 0.92)
    ctx.rectangle(0, 0, width, height)
    ctx.fill()

    ctx.setSourceRGBA(r, g, b, 0.10)
    ctx.setLineWidth(1)
    ctx.rectangle(0.5, 0.5, width - 1, height - 1)
    ctx.stroke()

    const barH = 16
    const barY = (height - barH) / 2
    ctx.setSourceRGBA(r, g, b, 0.15)
    ctx.rectangle(10, barY, width - 20, barH)
    ctx.fill()

    ctx.setSourceRGBA(r, g, b, 0.85)
    ctx.rectangle(10, barY, (width - 20) * min(pct / 100, 1), barH)
    ctx.fill()
}

const renderTopDirs = async () => {
    if (!_topBox) return
    const d = await readDisk()
    const p = dark.get()
        ? { fg: "234,228,210", dim: "234,228,210,0.5" }
        : { fg: "72,70,61", dim: "72,70,61,0.5" }
    _topBox.children = d.lines.map((line: string) => {
        const sep = line.indexOf("\t")
        const size = sep >= 0 ? line.slice(0, sep) : ""
        const path = sep >= 0 ? line.slice(sep + 1) : line
        return Box({
            spacing: 8,
            children: [
                Label({
                    label: size,
                    css: `font-family:${MENU_FONT};font-size:10px;color:rgba(${p.fg},0.8);letter-spacing:1px;min-width:50px;`,
                    xalign: 0,
                }),
                Label({
                    label: path,
                    css: `font-family:${MENU_FONT};font-size:10px;color:rgba(${p.dim},1);letter-spacing:1px;`,
                    xalign: 0, hexpand: true,
                }),
            ],
        })
    })
}

const open = async () => {
    if (!_win || !_reveal || !_panel) return

    try { _win.marginRight = 20 } catch {}

    if (_loadingLbl) _loadingLbl.visible = true
    if (_topBox) _topBox.children = []
    if (_useLbl) _useLbl.label = "--%"
    if (_totalLbl) _totalLbl.label = "-- / --"
    if (_availLbl) _availLbl.label = "-- free"

    const pctColor = () => {
        const [r, g, b] = dark.get()
            ? [218, 212, 187]
            : [87, 84, 74]
        return `rgba(${r},${g},${b},0.55)`
    }
    if (_availLbl) _availLbl.css =
        `font-family:${MENU_FONT};font-size:11px;color:${pctColor()};letter-spacing:2px;`

    _win.visible = true
    _reveal.open()
    modalOpen("disk", _win)

    const d = await readDisk()
    if (_loadingLbl) _loadingLbl.visible = false
    if (_useLbl) _useLbl.label = `${d.usePct}%`
    if (_totalLbl) _totalLbl.label = `${d.used} / ${d.total}`
    if (_availLbl) _availLbl.label = `${d.avail} free`

    const pctColor2 = (pct: number) => {
        const [r, g, b] = dark.get()
            ? [218, 212, 187]
            : [87, 84, 74]
        if (pct > 90) return `rgba(220,60,50,1)`
        if (pct > 75) return `rgba(220,180,40,1)`
        return `rgba(${r},${g},${b},1)`
    }
    if (_availLbl) _availLbl.css =
        `font-family:${MENU_FONT};font-size:11px;color:${pctColor2(d.usePct)};letter-spacing:2px;`

    if (_area) _area.queue_draw()
    await renderTopDirs()
}

const close = () => {
    if (!_win || !_reveal) return
    modalClose("disk")
    _reveal.close(() => { _win.visible = false })
}

export const toggleDisk = () => {
    if (!_win) return
    if (_win.visible) { close(); return }
    open().catch(print)
}

export const isDiskOpen = () => !!_win?.visible

export const DiskWindow = () => {
    const p = menuPalette()

    _area = DrawingArea({})
    _area.set_size_request(W, 40)
    _area.connect("draw", (_w: any, ctx: any) => {
        const a = _area.get_allocation()
        drawBar(ctx, a.width, a.height, _cache?.usePct ?? 0)
        return false
    })

    _useLbl = Label({
        label: "--%",
        css: `font-family:${MENU_FONT};font-size:18px;color:rgba(${p.fg},1);letter-spacing:2px;`,
        xalign: 1, hexpand: true,
    })
    _totalLbl = Label({
        label: "-- / --",
        css: `font-family:${MENU_FONT};font-size:11px;color:rgba(${p.fg},0.55);letter-spacing:2px;`,
        xalign: 0,
    })
    _availLbl = Label({
        label: "-- free",
        css: `font-family:${MENU_FONT};font-size:11px;color:rgba(${p.fg},0.55);letter-spacing:2px;`,
        xalign: 1, hexpand: true,
    })

    _loadingLbl = Label({
        label: "LOADING…",
        css: `font-family:${MENU_FONT};font-size:10px;color:rgba(${p.fg},0.4);letter-spacing:3px;`,
        xalign: 0,
    })

    _topBox = Box({ vertical: true, spacing: 3 })

    const panel = Box({
        vertical: true,
        spacing: 8,
        css: menuPanelCss(),
        children: [
            Box({ children: [
                Label({
                    label: "◆ DISK USAGE",
                    css: `font-family:${MENU_FONT};font-size:11px;color:rgba(${p.fg},0.55);letter-spacing:3px;`,
                    xalign: 0,
                }),
                _useLbl,
            ]}),
            _area,
            Box({ children: [_totalLbl, _availLbl] }),
            _loadingLbl,
            Label({
                label: "LARGEST DIRECTORIES",
                css: `font-family:${MENU_FONT};font-size:9px;color:rgba(${p.fg},0.55);letter-spacing:3px;margin-top:6px;`,
                xalign: 0,
            }),
            _topBox,
        ],
    })
    _panel = panel
    _reveal = RevealBox(panel)

    _win = Window({
        name: "disk",
        className: "disk",
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
