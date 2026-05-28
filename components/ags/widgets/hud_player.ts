
import { Box, Label, Button, DrawingArea } from "../widget.ts"
import { interval, execAsync } from "astal"
import { mpris, runPlayerctl, playerctlNameFromBus } from "../lib/mpris.ts"
import GdkPixbuf from "gi://GdkPixbuf"
import Gdk from "gi://Gdk?version=3.0"
import { dark } from "../env.ts"

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

const FONT = `"FOT-Rodin Pro M","Noto Sans Mono",monospace`
const TXT_DIM    = "rgba(200,184,154,0.55)"
const TXT_MID    = "rgba(200,184,154,0.85)"
const TXT_BRIGHT = "rgba(218,212,187,1.00)"

const FRAME_CSS = `
    background: rgba(77,73,62,0.18);
    border: 1px solid rgba(200,184,154,0.30);
    padding: 4px 10px;
    margin: 0 3px;
`

const COVER_SIZE = 36
const COVER_TMP  = "/tmp/yorha_cover.png"

let currentArtUrl = ""
let cachedPixbuf: any = null
let pixbufVersion = 0

const downloadCover = async (url: string): Promise<string | null> => {
    if (!url) return null
    try {
        if (url.startsWith("file://")) return url.slice(7)
        if (url.startsWith("http://") || url.startsWith("https://")) {
            await execAsync(["curl", "-sLf", "--max-time", "8", "-o", COVER_TMP, url])
            return COVER_TMP
        }
        return url
    } catch (e) {
        print("HudPlayer downloadCover failed:", e)
        return null
    }
}

const loadPixbuf = (path: string): any => {
    try {
        return GdkPixbuf.Pixbuf.new_from_file_at_scale(path, COVER_SIZE * 3, COVER_SIZE * 3, true)
    } catch (e) {
        print("HudPlayer loadPixbuf failed:", e)
        return null
    }
}

export const HudPlayer = () => {
    const cover = DrawingArea({})
    cover.set_size_request(COVER_SIZE, COVER_SIZE)
    let lastDrawnVersion = -1
    cover.connect("draw", (_w: any, ctx: any) => {
        lastDrawnVersion = pixbufVersion
        if (cachedPixbuf) {
            try {
                const pw = cachedPixbuf.get_width()
                const ph = cachedPixbuf.get_height()
                ctx.save()
                ctx.scale(COVER_SIZE / pw, COVER_SIZE / ph)
                Gdk.cairo_set_source_pixbuf(ctx, cachedPixbuf, 0, 0)
                ctx.paint()
                ctx.restore()
                return false
            } catch {}
        }
        const [r, g, b] = dark.get()
            ? [218/255, 212/255, 187/255]
            : [87/255,  84/255,  74/255]
        ctx.setSourceRGBA(r, g, b, 0.18)
        ctx.rectangle(0, 0, COVER_SIZE, COVER_SIZE)
        ctx.fill()
        ctx.setSourceRGBA(r, g, b, 0.55)
        ctx.moveTo(COVER_SIZE / 2, 5)
        ctx.lineTo(COVER_SIZE - 5, COVER_SIZE - 5)
        ctx.lineTo(5, COVER_SIZE - 5)
        ctx.closePath()
        ctx.fill()
        return false
    })

    const titleLbl = Label({
        label: "—",
        css: `font-family:${FONT};font-size:11px;color:${TXT_BRIGHT};letter-spacing:1px;`,
        max_width_chars: 26,
        xalign: 0,
        hexpand: true,
    })
    const artistLbl = Label({
        label: "—",
        css: `font-family:${FONT};font-size:9px;color:${TXT_DIM};letter-spacing:2px;`,
        max_width_chars: 28,
        xalign: 0,
    })

    let _progressFrac = 0
    const progress = DrawingArea({})
    progress.set_size_request(190, 3)
    progress.connect("draw", (_w: any, ctx: any) => {
        const alloc = progress.get_allocation()
        const [r, g, b] = dark.get()
            ? [218/255, 212/255, 187/255]
            : [87/255,  84/255,  74/255]
        ctx.setSourceRGBA(r, g, b, 0.20)
        ctx.rectangle(0, 0, alloc.width, alloc.height); ctx.fill()
        ctx.setSourceRGBA(r, g, b, 0.92)
        ctx.rectangle(0, 0, alloc.width * _progressFrac, alloc.height); ctx.fill()
        return false
    })

    const btnCss = `
        font-family: ${FONT};
        font-size: 14px;
        background: transparent;
        background-image: none;
        border: none;
        box-shadow: none;
        padding: 0 4px;
        margin: 0;
        color: ${TXT_MID};
        min-width: 18px;
    `
    const prevBtn = Button({
        child: Label({ label: "⏮" }), css: btnCss,
        onClicked: async () => {
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
            } catch (e) { print(e) }
        },
    })
    const playBtn = Button({
        child: Label({ label: "⏯" }), css: btnCss,
        onClicked: async () => {
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
            } catch (e) { print(e) }
        },
    })
    const nextBtn = Button({
        child: Label({ label: "⏭" }), css: btnCss,
        onClicked: async () => {
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
            } catch (e) { print(e) }
        },
    })

    let pendingCoverFetch = false
    const update = async () => {
        const player = currentPlayer()
        if (!player) {
            titleLbl.label = "— NO MEDIA —"
            artistLbl.label = ""
            _progressFrac = 0
            progress.queue_draw()
            if (cachedPixbuf) { cachedPixbuf = null; pixbufVersion++; cover.queue_draw() }
            currentArtUrl = ""
            return
        }
        const title  = (player.title  ?? "—").trim() || "—"
        const artist = (player.artist ?? "").trim()
        if (titleLbl.label  !== title)  titleLbl.label  = title.slice(0, 40)
        if (artistLbl.label !== artist) artistLbl.label = artist.slice(0, 40)

        if (player.length > 0) {
            _progressFrac = Math.max(0, Math.min(1, player.position / player.length))
        } else {
            _progressFrac = 0
        }
        progress.queue_draw()

        let url = (player.cover_art ?? "").trim()
        if (!url) {
            try {
                const pname = playerctlNameFromBus(player.bus_name ?? "")
                const pc = await runPlayerctl(["metadata", "--format", "{{mpris:artUrl}}"], pname)
                if (pc) url = pc.trim()
            } catch (e) { try { print("playerctl art fetch failed:", e) } catch {} }
        }
        if (url && url !== currentArtUrl && !pendingCoverFetch) {
            currentArtUrl = url
            pendingCoverFetch = true
            downloadCover(url).then(path => {
                if (path) {
                    cachedPixbuf = loadPixbuf(path)
                    pixbufVersion++
                    cover.queue_draw()
                }
                pendingCoverFetch = false
            }).catch(() => { pendingCoverFetch = false })
        }
    }

    update()  
    const t = interval(1000, update)
    mpris.connect("notify::players", () => update().catch(print))

    const box = Box({
        spacing: 10,
        vpack: "center",
        css: FRAME_CSS,
        children: [
            cover,
            Box({
                vertical: true,
                spacing: 1,
                vpack: "center",
                hexpand: true,
                children: [
                    titleLbl,
                    artistLbl,
                    progress,
                ],
            }),
            Box({
                spacing: 0,
                vpack: "center",
                children: [prevBtn, playBtn, nextBtn],
            }),
        ],
    })

    box.connect("destroy", () => t.cancel())
    return box
}
