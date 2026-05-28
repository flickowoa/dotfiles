import GLib from "gi://GLib"
import { execAsync } from "astal"
import { YORHA_DIR } from "../env.ts"

const SOUND_DIR = `${YORHA_DIR}/assets/audio`



let _lastPlay: Record<string, number> = {}
const MIN_GAP_MS: Record<string, number> = {
    click:       60,
    notification: 200,
    bleep:       400,
}

const play = (name: string) => {
    const now = Date.now()
    const last = _lastPlay[name] ?? 0
    const gap = MIN_GAP_MS[name] ?? 60
    if (now - last < gap) return
    _lastPlay[name] = now
    const path = `${SOUND_DIR}/${name}.ogg`
    const order = ["pw-play", "paplay", "mpv", "ffplay"]
    const available: string[] = []
    for (const p of order) {
        try {
        const found = GLib.find_program_in_path(p)
            if (found) available.push(p)
        } catch {}
    }

    const candidates: string[][] = []
    for (const p of available) {
        if (p === "paplay") candidates.push([p, "--volume=40000", path])
        else if (p === "mpv") candidates.push([p, "--no-terminal", "--really-quiet", path])
        else candidates.push([p, path])
    }
     if (!candidates.length) {
        candidates.push(["pw-play", path], ["paplay", "--volume=40000", path], ["mpv", "--no-terminal", "--really-quiet", path])
    }

    const tryCandidate = (i: number) => {
        if (i >= candidates.length) {
            try { print(`[yorha sound] no player available for ${path}`) } catch {}
            return
        }
        const cmd = candidates[i]
        execAsync(cmd).then(() => {
        }).catch(() => {
            tryCandidate(i + 1)
        })
    }

    tryCandidate(0)
}

export const playClick = () => play("click")
export const playNotif = () => play("notification")
export const playBleep = () => play("bleep")
