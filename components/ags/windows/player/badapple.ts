// lazy re-export of the ~70MB bad apple!! frame data from the old ags dir. uses a
// top-level await so its only parsed when this module first loads (which only
// happens if you actually play bad apple!! via mpris).
import GLib from "gi://GLib"

const HOME = GLib.get_home_dir()
const _mod = await import(
    `file://${HOME}/.config/hypr/themes/yorha/components/ags/windows/player/badappledat.js`
) as { badapple: number[][][] }

export const badapple = _mod.badapple
