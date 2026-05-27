import { execAsync } from "astal"
import { YORHA_DIR } from "../env.ts"

const SOUND_DIR = `${YORHA_DIR}/assets/audio`

let _lastPlay: Record<string, number> = {}
const MIN_GAP_MS: Record<string, number> = {
    click:  60,
    notif: 200,
    bleep: 400,
}

const play = (name: string) => {
    const now = Date.now()
    const last = _lastPlay[name] ?? 0
    const gap = MIN_GAP_MS[name] ?? 60
    if (now - last < gap) return
    _lastPlay[name] = now
    execAsync(["paplay", "--volume=40000", `${SOUND_DIR}/${name}.ogg`]).catch(() => {})
}

export const playClick = () => play("click")
export const playNotif = () => play("notification")
export const playBleep = () => play("bleep")
