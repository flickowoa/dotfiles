import { execAsync, interval } from "astal"

let playersInternal: any[] = []
let lastSnapshot = ""

const listeners = new Map<number, () => void>()
let nextListenerId = 1

export const runPlayerctl = async (args: string[], pname?: string) => {
    try {
        const cmd = pname ? ["playerctl", `--player=${pname}`, ...args] : ["playerctl", ...args]
        return (await execAsync(cmd)).trim()
    } catch (e) {
        try { print("playerctl failed:", e) } catch {}
        return ""
    }
}

export const playerctlNameFromBus = (busName: string): string => {
    if (!busName) return ""
    const prefix = "org.mpris.MediaPlayer2."
    return busName.startsWith(prefix) ? busName.slice(prefix.length) : busName
}

const emitPlayersChanged = () => {
    for (const cb of listeners.values()) {
        try { cb() } catch {}
    }
}

export const mpris = {
    get players() { return playersInternal },
    connect: (_sig: string, cb: () => void) => {
        const id = nextListenerId++
        listeners.set(id, cb)
        return id
    },
    disconnect: (id: number) => { try { listeners.delete(id) } catch {} },
}

const pollOnce = async () => {
    try {
        const ls = await runPlayerctl(["-l"]).catch(() => "")
        const list = ls.split("\n").map(s => s.trim()).filter(Boolean)
        const newPlayers: any[] = []
        for (const pname of list) {
            try {
                const status = (await runPlayerctl(["status"], pname)) || ""
                const title = (await runPlayerctl(["metadata", "--format", "{{xesam:title}}"], pname)) || ""
                const artist = (await runPlayerctl(["metadata", "--format", "{{xesam:artist}}"], pname)) || ""
                const posStr = (await runPlayerctl(["position"], pname)) || "0"
                const position = Number(posStr) || 0
                let length = 0
                try {
                    const lenStr = (await runPlayerctl(["metadata", "--format", "{{mpris:length}}"], pname)) || ""
                    const n = Number(lenStr)
                    if (!isNaN(n) && n > 1e6) length = n / 1_000_000
                    else if (!isNaN(Number(lenStr))) length = Number(lenStr)
                } catch {}
                const art = (await runPlayerctl(["metadata", "--format", "{{mpris:artUrl}}"], pname)) || ""
                newPlayers.push({
                    bus_name: `org.mpris.MediaPlayer2.${pname}`,
                    playback_status: status,
                    title: title,
                    artist: artist,
                    position: position,
                    length: length,
                    cover_art: art,
                    name: pname,
                })
            } catch {}
        }

        const snapshot = newPlayers.map(p => `${p.name}|${p.title}|${p.playback_status}`).join("||")
        if (snapshot !== lastSnapshot) {
            lastSnapshot = snapshot
            playersInternal = newPlayers
            emitPlayersChanged()
        }
    } catch (e) {
        try { print("mpris poll failed:", e) } catch {}
    }
}

void pollOnce()
const tick = interval(1200, pollOnce)

export const shutdown = () => tick.cancel()
