import GLib from "gi://GLib"

const HOME = GLib.get_home_dir()
const _mod = await import(
    `file://${HOME}/.config/hypr/themes/yorha/components/ags/windows/player/badappledat.js`
) as { badapple: number[][][] }

export const badapple = _mod.badapple
