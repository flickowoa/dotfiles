// little graph popup - a cairo line graph of cpu/mem history, opens when you
// click a stat frame on the bar
import { Window, Box, Label, DrawingArea, Anchor, Layer, Exclusivity } from "../../widget.ts"
import GLib from "gi://GLib"
import Gio from "gi://Gio"
import { dark } from "../../env.ts"
import { RevealBox, type Reveal } from "../../nier/anim.ts"

const FONT = `"FOT-Rodin Pro M","Noto Sans Mono",monospace`
const TXT_DIM    = "rgba(200,184,154,0.55)"
const TXT_BRIGHT = "rgba(218,212,187,1.00)"

const W = 360, H = 130
const HIST_LEN = 60   // 60 samples, ~1 per second → 1 min history

interface State {
    win: any
    area: any
    title: any
    valueLbl: any
    reveal: Reveal
    history: number[]
    type: "cpu" | "mem"
    timerId: number | null
}
let s: State | null = null

const readFile = (path: string): string => {
    try {
        const f = Gio.File.new_for_path(path)
        const [, data] = f.load_contents(null)
        return new TextDecoder().decode(data)
    } catch { return "" }
}

let _prevIdle = 0, _prevTotal = 0
const cpuPercent = (): number => {
    const line = readFile("/proc/stat").split("\n")[0]
    const nums = line.split(/\s+/).slice(1).map(Number)
    const idle = nums[3] + (nums[4] || 0)
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
    const total = get("MemTotal:"), avail = get("MemAvailable:")
    return total ? (1 - avail / total) * 100 : 0
}

const drawGraph = (ctx: any, width: number, height: number, history: number[]) => {
    const [r, g, b] = dark.get()
        ? [218/255, 212/255, 187/255]
        : [87/255,  84/255,  74/255]

    // Background panel
    ctx.setSourceRGBA(14/255, 12/255, 9/255, 0.92)
    ctx.rectangle(0, 0, width, height)
    ctx.fill()

    // Border
    ctx.setSourceRGBA(r, g, b, 0.30)
    ctx.setLineWidth(1)
    ctx.rectangle(0.5, 0.5, width - 1, height - 1)
    ctx.stroke()

    // Horizontal grid lines (25/50/75/100%)
    ctx.setSourceRGBA(r, g, b, 0.10)
    for (let p = 0.25; p < 1; p += 0.25) {
        const y = height * (1 - p)
        ctx.moveTo(0, y); ctx.lineTo(width, y)
    }
    ctx.stroke()

    if (history.length < 2) return

    // Plot line
    const stepX = width / (HIST_LEN - 1)
    ctx.setSourceRGBA(r, g, b, 0.90)
    ctx.setLineWidth(2)
    const offset = HIST_LEN - history.length
    for (let i = 0; i < history.length; i++) {
        const x = (offset + i) * stepX
        const y = height * (1 - history[i] / 100)
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
    }
    ctx.stroke()

    // Filled area below the line
    if (history.length >= 2) {
        ctx.setSourceRGBA(r, g, b, 0.25)
        for (let i = 0; i < history.length; i++) {
            const x = (offset + i) * stepX
            const y = height * (1 - history[i] / 100)
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
        }
        ctx.lineTo(width, height); ctx.lineTo((offset) * stepX, height)
        ctx.closePath()
        ctx.fill()
    }
}

const ensure = () => {
    if (s) return s
    const title = Label({
        label: "CPU USAGE",
        css: `font-family:${FONT};font-size:11px;color:${TXT_DIM};letter-spacing:3px;`,
        xalign: 0,
    })
    const valueLbl = Label({
        label: "---%",
        css: `font-family:${FONT};font-size:14px;color:${TXT_BRIGHT};letter-spacing:2px;`,
        xalign: 1, hexpand: true,
    })
    const area = DrawingArea({})
    area.set_size_request(W, H)

    const panel = Box({
        vertical: true,
        spacing: 6,
        css: `
            background: rgba(14,12,9,0.94);
            border: 1px solid rgba(200,184,154,0.35);
            padding: 12px 14px 14px 14px;
        `,
        children: [
            Box({ children: [title, valueLbl] }),
            area,
        ],
    })
    const reveal = RevealBox(panel)

    const win = Window({
        name: "graph",
        className: "graph",
        anchor: Anchor.TOP | Anchor.RIGHT,
        marginTop: 90,
        marginRight: 20,
        exclusivity: Exclusivity.IGNORE,
        layer: Layer.OVERLAY,
        focusable: false,
        visible: false,
        child: reveal.container,
    })

    s = { win, area, title, valueLbl, reveal, history: [], type: "cpu", timerId: null }

    area.connect("draw", (_w: any, ctx: any) => {
        const alloc = area.get_allocation()
        drawGraph(ctx, alloc.width, alloc.height, s!.history)
        return false
    })

    return s
}

// tells the bar which stat frame should look active - the one whose graph is open
export const currentGraphType = (): "cpu" | "mem" | null => {
    if (!s || !s.win?.visible) return null
    return s.type
}

export const toggleGraph = (type: "cpu" | "mem") => {
    const st = ensure()

    // Toggle off if visible AND same type — otherwise switch type / show
    if (st.win.visible && st.type === type) {
        if (st.timerId !== null) { GLib.source_remove(st.timerId); st.timerId = null }
        st.reveal.close(() => { st.win.visible = false })
        return
    }

    st.type = type
    st.history = []
    st.title.label = type === "cpu" ? "◆ CPU USAGE" : "◆ MEMORY USAGE"
    cpuPercent()   // seed

    const sample = () => {
        const v = st.type === "cpu" ? cpuPercent() : ramPercent()
        st.history.push(v)
        if (st.history.length > HIST_LEN) st.history.shift()
        st.valueLbl.label = `${Math.round(v)}%`
        st.area.queue_draw()
        return true
    }
    sample()
    if (st.timerId !== null) GLib.source_remove(st.timerId)
    st.timerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, sample)

    if (!st.win.visible) {
        st.win.visible = true
        st.reveal.open()
    } else {
        st.reveal.open()
    }
}

export const GraphWindow = () => {
    const st = ensure()
    return st.win
}
