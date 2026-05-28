import { App, Box, Label, Button, EventBox, Revealer } from "../../widget.ts"
import Gtk from "gi://Gtk?version=3.0"
import GdkPixbuf from "gi://GdkPixbuf"
import Pango from "gi://Pango"
import { Variable, execAsync, timeout, subprocess, interval } from "astal"
import { arradd, arrremove, dark, assetsDir, rand_int, AGS_DIR } from "../../env.ts"

import { mpris } from "../../lib/mpris.ts"

const currentPlayer = (): any => {
    try {
        const list = (mpris?.players ?? []) as any[]
        if (!list.length) return null
        const playing = list.find(p => p?.playback_status === "Playing")
        if (playing) return playing
        const paused = list.find(p => p?.playback_status === "Paused")
        if (paused) return paused
        return list[0]
    } catch (e) {
        try { print("mpris currentPlayer error:", e) } catch {}
        return null
    }
}

const runPlayerctl = async (args: string[], pname?: string) => {
    try {
        const cmd = pname ? ["playerctl", `--player=${pname}`, ...args] : ["playerctl", ...args]
        return (await execAsync(cmd)).trim()
    } catch (e) {
        try { print("playerctl failed:", e) } catch {}
        return ""
    }
}

const COVER_TMP = "/tmp/yorha_cover.png"
let _coverDownloadInflight = false

const playerctlNameFromBus = (busName: string): string => {
    if (!busName) return ""
    const prefix = "org.mpris.MediaPlayer2."
    return busName.startsWith(prefix) ? busName.slice(prefix.length) : busName
}

const resolveCoverPath = async (url: string): Promise<string | null> => {
    if (!url) return null
    if (_coverDownloadInflight) return null
    _coverDownloadInflight = true
    try {
        if (url.startsWith("file://")) return url.slice(7)
        if (url.startsWith("http://") || url.startsWith("https://")) {
            await execAsync(["curl", "-sLf", "--max-time", "10", "-o", COVER_TMP, url])
            return COVER_TMP
        }
        return url   // already a local path
    } catch (e) {
        print("resolveCoverPath failed:", e)
        return null
    } finally {
        _coverDownloadInflight = false
    }
}

const { round } = Math

const apple_names = [
    "【東方】Bad Apple!! ＰＶ【影絵】",
    "Bad Apple!! - Full Version w/video [Lyrics in Romaji, Translation in English]",
    "Bad Apple!!",
]

const opacity_map_len = 512
const opacity_map = Array.from({ length: opacity_map_len + 1 }, (_, i) => i / opacity_map_len)

const color_mix = (c1: number[], c2: number[], t: number) => [
    c1[0] * (1 - t) + c2[0] * t,
    c1[1] * (1 - t) + c2[1] * t,
    c1[2] * (1 - t) + c2[2] * t,
]
const color_diff = (c1: number[], c2: number[]) => [
    Math.abs(c1[0] - c2[0]),
    Math.abs(c1[1] - c2[1]),
    Math.abs(c1[2] - c2[2]),
]

const colors = () => dark.get()
    ? [218 / 255, 212 / 255, 187 / 255]
    : [87 / 255, 84 / 255, 74 / 255]

const cava = new Variable<number[]>([])
let _cavaProc: any = null
export const cavaStart = () => {
    if (_cavaProc) return
    _cavaProc = subprocess(
        AGS_DIR.replace("/ags3", "/ags") + "/windows/player/scripts/cava",
        (line) => cava.set(line.split(";").filter(Boolean).map(n => Number(n) / 1000))
    )
}
export const cavaStop = () => {
    try { _cavaProc?.kill?.() } catch {}
    _cavaProc = null
    cava.set([])
}

const image_to_matrix = async (inputPath: string, imagedat: Variable<any[]>, rows: number): Promise<[number, number]> => {
    const pixbuf = GdkPixbuf.Pixbuf.new_from_file(inputPath)
    if (!pixbuf) return [0, 1]

    const pixels = pixbuf.get_pixels()
    const rowstride = pixbuf.get_rowstride()
    const channels = pixbuf.get_n_channels()
    const isDark = dark.get()

    let maxV = 0, minV = 1
    const matrix: any[] = []

    for (let y = 0; y < pixbuf.get_height(); y++) {
        for (let x = 0; x < pixbuf.get_width(); x++) {
            const idx = y * rowstride + x * channels
            const r = pixels[idx], g = pixels[idx + 1], b = pixels[idx + 2]
            const intensity = Math.round(0.3 * r + 0.59 * g + 0.11 * b)
            const darkness = isDark ? 1 - intensity / 255 : intensity / 255
            if (darkness > maxV) maxV = darkness
            if (darkness < minV) minV = darkness
            matrix.push([r / 255, g / 255, b / 255, darkness])
        }
    }

    for (let i = 0; i < matrix.length; i++) {
        const cell = matrix[i][3] + (isDark ? -minV : 1 - maxV)
        matrix[i][3] = 1 - opacity_map[Math.round(cell * (opacity_map_len))]
    }

    imagedat.set(matrix)
    return [minV, maxV]
}

const cava_vis = () => {
    let bar1_pos = 1, bar2_pos = 1
    let last_cava_update = 0

    const bar1 = Box({ className: "cava-bar-thin" })
    const bar2 = Box({ className: "cava-bar-thick" })

    const unsub = cava.subscribe((vals) => {
        if (!bar1.get_mapped()) return  // skip CSS updates when player window is hidden
        const now = Date.now()
        if (now - last_cava_update < 33) return  // throttle to ~30fps
        last_cava_update = now

        const v1 = vals[1] ?? 0
        if (!isNaN(bar1_pos)) {
            bar1.css = `background-position: 100% ${bar1_pos}%;`
            bar1_pos -= (v1 > 0.5 ? (v1 > 0.9 ? v1 * 10 : v1 * 5) : v1) + 0.01
            if (bar1_pos < -200) bar1_pos = 0
        } else bar1_pos = 0

        const v2 = vals[Math.round(vals.length / 2)] ?? 0
        if (!isNaN(bar2_pos)) {
            bar2.css = `background-position: 100% ${bar2_pos}%;`
            bar2_pos += (v2 > 0.5 ? (v2 > 0.9 ? v2 * 10 : v2 * 5) : v2) + 0.01
            if (bar2_pos > 200) bar2_pos = 0
        } else bar2_pos = 0
    })

    const vis = Box({ className: "cava-vis", children: [bar1, bar2] })
    vis.connect("destroy", unsub)
    return vis
}

export const NowPlaying = () => {
    const rows = 64
    const cell_width = 10, cell_height = 10

    type SigBucket = {
        seen: WeakMap<object, Set<string>>
        refs: Array<[any, number]>
    }
    const makeSigBucket = (): SigBucket => ({ seen: new WeakMap(), refs: [] })
    const connectOnce = (bucket: SigBucket, obj: any, signal: string, cb: (...args: any[]) => void) => {
        if (!obj?.connect) return
        let signals = bucket.seen.get(obj)
        if (!signals) {
            signals = new Set<string>()
            bucket.seen.set(obj, signals)
        }
        if (signals.has(signal)) return
        try {
            bucket.refs.push([obj, obj.connect(signal, cb)])
            signals.add(signal)
        } catch {}
    }
    const disconnectBucket = (bucket: SigBucket) => {
        for (const [obj, id] of bucket.refs) {
            try { obj.disconnect(id) } catch {}
        }
        bucket.refs = []
        bucket.seen = new WeakMap()
    }

    type ShowCell = [number, number, number, number, number, number]  // r,g,b, current_opacity, opacity, offset
    const showingdat = new Variable<ShowCell[]>(
        Array.from({ length: rows * rows }, () => [0, 0, 0, 0, 0, 0] as ShowCell)
    )
    const imagedat = new Variable<any[]>(
        Array.from({ length: rows * rows }, () => [1, 1, 1, 1])
    )

    let prevdat = ""
    let preparing_cover = false
    let draw_t = 0
    let draw_duration = 1000
    let drawing_rn = false
    let current_info = ""
    let current_cover_info = ""
    let badappling = false
    let wait_for_apples = false
    let prev_apples = 0
    let apples = 0
    let wait_for_draw = false

    const drawingArea = new Gtk.DrawingArea()

    const ripple_from = async (cell_x: number, cell_y: number) => {
        const max_thick = 10
        const max_dist = (Math.max(cell_x, rows - cell_x) ** 2 + Math.max(cell_y, rows - cell_y) ** 2) ** 0.5 + max_thick
        for (let t = 0; t < max_dist; t++) {
            const dat = showingdat.get()
            for (let i = 0; i < rows * rows; i++) {
                const tx = i % rows, ty = Math.floor(i / rows)
                const dist = ((tx - cell_x) ** 2 + (ty - cell_y) ** 2) ** 0.5
                if (Math.abs(dist - t) < rand_int(-10, max_thick) * (1 - t / max_dist)) {
                    const [r2, g2, b2, darkness] = badappling
                        ? [imagedat.get()[i], imagedat.get()[i], imagedat.get()[i], imagedat.get()[i]]
                        : imagedat.get()[i]
                    const [r, g, b, o, opacity, offset] = dat[i]
                    dat[i] = [r2, g2, b2, 1, darkness, 1]
                }
            }
            showingdat.set(dat)
            drawingArea.queue_draw()
            await new Promise(r => setTimeout(r, Math.max(16, 20 * (t / max_dist))))
            wait_for_draw = false
        }
    }

    const controls = Box({
        homogeneous: true,                        // all three buttons same width
        spacing: 0,
        css: `min-width: ${rows * cell_width + 30 + 30 - 20}px;`,
        hpack: "fill",
        children: [
            Button({
                hpack: "center",
                className: "player-buttons",
                child: Label({ label: "⏮︎", className: "heading" }),
                onClicked: async (self: any) => {
                    try {
                        const player = currentPlayer()
                        if (player) {
                            try { player.previous() } catch (e) {
                                try { print("mpris prev failed, falling back to playerctl:", e) } catch {}
                                const pname = playerctlNameFromBus(player.bus_name ?? "")
                                await runPlayerctl(["previous"], pname)
                            }
                        } else {
                            await runPlayerctl(["previous"])
                        }
                        arradd(self, "pressed")
                        await new Promise(r => setTimeout(r, 100))
                        arrremove(self, "pressed")
                    } catch (e) { print("prev onClick:", e) }
                },
            }),
            Button({
                hpack: "center",
                className: "player-buttons",
                child: Label({
                    label: "▶︎",
                    className: "heading",
                    setup: (self: any) => {
                        const playerStatusBucket = makeSigBucket()
                        const update = () => {
                            const player = currentPlayer()
                            if (!player) { self.label = "▶︎"; return }
                            self.label = player.playback_status === "Playing" ? "⏸︎" : "▶︎"
                        }
                        const bindPlayers = () => {
                            mpris.players?.forEach((p: any) => {
                                connectOnce(playerStatusBucket, p, "notify::playback-status", update)
                            })
                        }
                        const playersId = mpris.connect("notify::players", () => {
                            bindPlayers()
                            update()
                        })
                        update()
                        bindPlayers()
                        self.connect("destroy", () => {
                            disconnectBucket(playerStatusBucket)
                            try { mpris.disconnect(playersId) } catch {}
                        })
                    },
                }),
                onClicked: async (self: any) => {
                    try {
                        let player = currentPlayer()
                        if (player) {
                            try { player.play_pause() } catch (e) {
                                try { print("mpris play_pause failed, fallback to playerctl:", e) } catch {}
                                const pname = playerctlNameFromBus(player.bus_name ?? "")
                                await runPlayerctl(["play-pause"], pname)
                                player = currentPlayer()
                            }
                        } else {
                            await runPlayerctl(["play-pause"])
                        }
                        const lbl = self?.child
                        if (lbl && "label" in lbl) {
                            lbl.label = player?.playback_status === "Playing" ? "⏸︎" : "▶︎"
                        }
                        arradd(self, "pressed")
                        await new Promise(r => setTimeout(r, 100))
                        arrremove(self, "pressed")
                        ripple_from(Math.floor(rows / 2), Math.floor(rows / 2))
                    } catch (e) { print("play onClick:", e) }
                },
            }),
            Button({
                hpack: "center",
                className: "player-buttons",
                child: Label({ label: "⏭︎", className: "heading" }),
                onClicked: async (self: any) => {
                    try {
                        const player = currentPlayer()
                        if (player) {
                            try { player.next() } catch (e) {
                                try { print("mpris next failed, falling back to playerctl:", e) } catch {}
                                const pname = playerctlNameFromBus(player.bus_name ?? "")
                                await runPlayerctl(["next"], pname)
                            }
                        } else {
                            await runPlayerctl(["next"])
                        }
                        arradd(self, "pressed")
                        await new Promise(r => setTimeout(r, 100))
                        arrremove(self, "pressed")
                    } catch (e) { print("next onClick:", e) }
                },
            }),
        ],
    })

    const matrixBox = Box({
        className: "image-matrix-container",
        hpack: "center",
        css: `min-height: ${rows * cell_height}px; min-width: ${rows * cell_width}px;`,
        children: [drawingArea],
    })

    drawingArea.set_size_request(rows * cell_width, rows * cell_height)
    drawingArea.set_app_paintable?.(true)
    try { drawingArea.show() } catch {}
    try { drawingArea.set_visible?.(true) } catch {}

    {
        drawingArea.connect("draw", (_widget: any, context: any) => {
            const dat = showingdat.get()
            const c = colors()
            let needs_redraw = false
            let _visibleCount = 0
            for (let i = 0; i < rows * rows; i++) {
                const x = i % rows, y = Math.floor(i / rows)
                let [r, g, b, current_opacity, opacity, offset] = dat[i]
                if (opacity === 0 && current_opacity === 0) continue

                const diff = !color_diff([r, g, b], c).every(n => n < 1 / 255)
                const opacity_diff = Math.abs(current_opacity - opacity) > 1 / 255

                if (badappling) {
                    if (diff) [r, g, b] = color_mix([r, g, b], c, 0.1)
                    if (opacity_diff) current_opacity += (opacity - current_opacity) * 0.1
                } else {
                    if (diff) [r, g, b] = color_mix([r, g, b], c, 0.2)
                    if (opacity_diff) current_opacity += (opacity - current_opacity) * 0.2
                }

                if (offset !== 0 && offset < 100) {
                    let now_offset = offset
                    if (now_offset > 50) {
                        now_offset = 100 - now_offset
                        offset += badappling ? 3 : 5
                    } else {
                        offset += 3
                    }
                    const cx = x * cell_width + (now_offset / 100) * 2 * cell_width / 2
                    const cy = y * cell_height + (now_offset / 100) * 2 * cell_height / 2
                    context.setSourceRGBA(r, g, b, 2 * current_opacity)
                    context.rectangle(cx, cy, cell_width, cell_height)
                    context.fill()
                } else {
                    context.setSourceRGBA(r, g, b, current_opacity)
                    context.rectangle(x * cell_width, y * cell_height, cell_width, cell_height)
                    context.fill()
                    if (current_opacity > 0.01) _visibleCount++
                }

                dat[i] = [r, g, b, current_opacity, opacity, offset]
                if (diff || opacity_diff || offset !== 0) needs_redraw = true
            }
            showingdat.set(dat)
            wait_for_draw = false
            if (needs_redraw && drawingArea.get_mapped()) drawingArea.queue_draw()
        })
    }

    timeout(1, () => {
        drawingArea.hexpand = true
        drawingArea.hpack = "end"
        drawingArea.queue_draw()
    })

    const eventBox = EventBox({
        setup: (self: any) => timeout(1, () => {
            self.connect("motion-notify-event", (_widget: any, event: any) => {
                const [, ex, ey] = event.get_coords()
                const da = drawingArea.get_allocation()
                const rx = ex - da.x, ry = ey - da.y
                const cx = Math.floor(rx / cell_width), cy = Math.floor(ry / cell_height)
                const idx = cy * rows + cx
                if (idx < 0 || idx >= rows * rows) return

                const dat = showingdat.get()
                const [r2, g2, b2, darkness] = badappling
                    ? [imagedat.get()[idx], imagedat.get()[idx], imagedat.get()[idx], imagedat.get()[idx]]
                    : imagedat.get()[idx]
                dat[idx] = [r2, g2, b2, 1, darkness, 1]
                showingdat.set(dat)
                drawingArea.queue_draw()
            })
        }),
        child: matrixBox,
    })

    const cover_unsub = imagedat.subscribe(() => timeout(1, async () => {
        try {
            if (preparing_cover) return
            if (badappling) {
                const imgd = imagedat.get()
                const dat: ShowCell[] = []
                for (let i = 0; i < rows * rows; i++) {
                    const v = imgd[i]
                    dat.push([v, v, v, v, v, 0] as ShowCell)
                }
                showingdat.set(dat)
                drawingArea.queue_draw()
                return
            }
            const snap = JSON.stringify(imagedat.get())
            if (prevdat === snap) return
            prevdat = snap

            const imgd = imagedat.get()
            const dat = showingdat.get()
            for (let i = 0; i < rows * rows; i++) {
                const entry = imgd[i]
                if (!entry) continue
                const [r2, g2, b2, rawDarkness] = entry
                const darkness = Math.max(0, Math.min(1, Number(rawDarkness) || 0))
                dat[i] = [r2, g2, b2, darkness, darkness, 0]
            }
            showingdat.set(dat)
            drawingArea.queue_draw()
        } catch (e) { print(e) }
    }))

    const coverPlayerBucket = makeSigBucket()
    const coverHandle = () => timeout(10, async () => {
            const player = currentPlayer()
            if (!player || preparing_cover) return
            let liveUrl = ""
            try {
                const pname = playerctlNameFromBus(player.bus_name ?? "")
                const cmd = pname
                    ? ["playerctl", `--player=${pname}`, "metadata", "--format", "{{mpris:artUrl}}"]
                    : ["playerctl", "metadata", "--format", "{{mpris:artUrl}}"]
                liveUrl = (await execAsync(cmd)).trim()
            } catch {}
            const cacheKey = `${player.title ?? ""}|${liveUrl || player.cover_art || ""}`
            if (current_cover_info === cacheKey) return
            current_cover_info = cacheKey

            if (apple_names.includes(player.title ?? "")) {
                if (apples > 1 || badappling) return
                apples++
                prevdat = ""
                badappling = true
                const { badapple } = await import("../../windows/player/badapple.ts")
                while (apple_names.includes(player.title ?? "")) {
                    if (Math.abs(player.position - prev_apples) > 1 / 1000) {
                        prev_apples = player.position
                        const pos_ratio = player.position / player.length
                        const frame = Math.floor(pos_ratio * badapple.length)
                        imagedat.set(frame < badapple.length ? badapple[frame] : badapple[0])
                        while (wait_for_apples && badappling) await new Promise(r => setTimeout(r, 1))
                    } else await new Promise(r => setTimeout(r, 1))
                }
                badappling = false; drawing_rn = false; wait_for_draw = false
                return
            } else {
                badappling = false; wait_for_apples = false
            }

            try {
                preparing_cover = true
                const url = liveUrl || player.cover_art || ""
                const localPath = await resolveCoverPath(url)
                if (!localPath) { preparing_cover = false; return }
                await execAsync(["cp", localPath, "/tmp/to_bg.png"])
                await execAsync([
                    AGS_DIR.replace("/ags3", "/ags") + "/windows/player/scripts/prepare_cover.sh",
                    localPath, `${rows}`,
                ])
                await image_to_matrix("/tmp/bg.png", imagedat, rows)
                preparing_cover = false
                imagedat.set(imagedat.get())  // trigger subscribers
            } catch (e) {
                preparing_cover = false
                print("cover handler error:", e)
            }
        })
    const bindCoverPlayers = () => {
        mpris.players?.forEach((p: any) => {
            connectOnce(coverPlayerBucket, p, "notify::cover-art", coverHandle)
            connectOnce(coverPlayerBucket, p, "notify::playback-status", coverHandle)
            connectOnce(coverPlayerBucket, p, "notify::metadata", coverHandle)
        })
    }
    const coverPlayersId = mpris.connect("notify::players", () => {
        bindCoverPlayers()
        coverHandle()
    })
    bindCoverPlayers()
    coverHandle()

    const dark_unsub = dark.subscribe(() => timeout(500, async () => {
        preparing_cover = true
        await image_to_matrix("/tmp/bg.png", imagedat, rows).catch(e => { preparing_cover = false; print(e) })
        preparing_cover = false
        imagedat.set(imagedat.get())
    }))

    const title_label = Label({
        label: "",
        className: "heading",
        css: `min-width: ${rows * cell_width}px;`,
        hpack: "end",
        xalign: 0,
        wrap: true,
        max_width_chars: 20,
        setup: (self: any) => timeout(1, () => {
            self.set_line_wrap_mode(Pango.WrapMode.WORD_CHAR)
            self.set_ellipsize(Pango.EllipsizeMode.END)
        }),
    })
    const track_revealer = Revealer({
        revealChild: false,
        transitionDuration: 1000,
        transition: "slide_left",
        child: title_label,
    })

    const info_cursor = Box({ className: "nowplaying-info-cursor" })
    const containerCleanup: Array<() => void> = [
        () => cover_unsub(),
        () => dark_unsub(),
        () => disconnectBucket(coverPlayerBucket),
        () => { try { mpris.disconnect(coverPlayersId) } catch {} },
    ]

    ;(() => {
        const infoPlayerBucket = makeSigBucket()
        const handleChange = async () => {
            const player = currentPlayer()
            if (!player) return
            const title = player.title ?? ""
            if (title === current_info) return
            current_info = title

            arrremove(info_cursor, "hidden")
            await new Promise(r => setTimeout(r, 1500))
            track_revealer.revealChild = false
            await new Promise(r => setTimeout(r, 1500))
            title_label.label = current_info
            track_revealer.revealChild = true
            await new Promise(r => setTimeout(r, 1500))
            arradd(info_cursor, "hidden")
        }
        const bindInfoPlayers = () => {
            mpris.players?.forEach((p: any) => {
                connectOnce(infoPlayerBucket, p, "notify::metadata",        () => handleChange().catch(print))
                connectOnce(infoPlayerBucket, p, "notify::title",           () => handleChange().catch(print))
                connectOnce(infoPlayerBucket, p, "notify::playback-status", () => handleChange().catch(print))
            })
        }
        const infoPlayersId = mpris.connect("notify::players", () => {
            bindInfoPlayers()
            handleChange().catch(print)
        })
        bindInfoPlayers()
        handleChange().catch(print)

        let lastPlayerBus = ""
        let lastTitle = ""
        const infoPoll = interval(1500, () => {
            const p = currentPlayer()
            const bus = p?.bus_name ?? ""
            const ttl = p?.title ?? ""
            if (bus !== lastPlayerBus || ttl !== lastTitle) {
                lastPlayerBus = bus
                lastTitle = ttl
                current_info = ""
                current_cover_info = ""
            }
            handleChange().catch(print)
            coverHandle()
        })
        containerCleanup.push(() => {
            infoPoll.cancel()
            disconnectBucket(infoPlayerBucket)
            try { mpris.disconnect(infoPlayersId) } catch {}
        })
    })()

    const container = Box({
        vertical: true,
        className: "nowplaying-container",
        children: [
            controls,
            eventBox,
            Box({
                className: "nowplaying-info-container",
                css: "margin-left: 5px;",
                children: [track_revealer, info_cursor],
            }),
        ],
    })

    container.connect("destroy", () => {
        for (const fn of containerCleanup) {
            try { fn() } catch {}
        }
    })

    return Box({
        className: "player",
        children: [container, cava_vis(), Box({ className: "nowplaying-hider" })],
        setup: (self: any) => {
            const applyStaticLayout = () => {
                const container = self.children[0]
                const vis = self.children[1]
                const hider = self.children[2]
                const ba = controls.get_allocation()
                const ia = container.children[2].get_allocation()

                self.css = ""
                container.css = ""
                vis.toggleClassName("hiding", false)
                vis.css = (ba.height > 1 && ia.height > 1)
                    ? `margin-top:${ba.height}px;margin-bottom:${ia.height}px;`
                    : ""
                hider.css = "opacity:0;"
            }

            timeout(10, applyStaticLayout)
            App.connect("window-toggled", (_app: any, win: any) => {
                if (win.name !== "player") return
                draw_t = 0
                timeout(10, applyStaticLayout)
            })
        },
    })
}
