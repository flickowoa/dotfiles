import GLib from "gi://GLib"
import GdkPixbuf from "gi://GdkPixbuf"
import Gtk from "gi://Gtk?version=3.0"
import Gdk from "gi://Gdk?version=3.0"
import { Variable, exec } from "astal"

export const HOME = GLib.get_home_dir()
export const AGS_DIR = `${HOME}/.config/hypr/themes/yorha/components/ags`
export const YORHA_DIR = `${HOME}/.config/hypr/themes/yorha`
export const STYLE_CSS = `${HOME}/.config/hypr/themes/yorha/components/ags/style/style.css`
const ASSETS_BASE = `${HOME}/.config/hypr/themes/yorha/components/ags/assets`

const display = Gdk.Display.get_default()!
const monitor = display.get_primary_monitor() ?? display.get_monitor(0)!
const geo = monitor.get_geometry()
export const SCREEN_WIDTH: number = geo.width
export const SCREEN_HEIGHT: number = geo.height

export const dark = Variable<boolean>(false)

export const assetsDir = () => `${ASSETS_BASE}/${dark.get() ? "dark" : "light"}`

export async function get_cursor(): Promise<[number, number]> {
    const { execAsync } = await import("astal")
    const res = await execAsync("hyprctl cursorpos")
    const parts = res.trim().split(",").map(Number)
    return [parts[0], parts[1]]
}

export const arradd = (w: Gtk.Widget | null | undefined, cls: string): void => {
    if (!w) return
    let ctx: any = null
    try { ctx = w.get_style_context?.() } catch {}
    if (!ctx) return
    try {
        if (!ctx.has_class(cls)) ctx.add_class(cls)
    } catch {}
}

export const arrremove = (w: Gtk.Widget | null | undefined, cls: string): void => {
    if (!w) return
    try { w.get_style_context?.()?.remove_class(cls) } catch {}
}

export const hasclass = (w: Gtk.Widget | null | undefined, cls: string): boolean => {
    if (!w) return false
    try { return !!w.get_style_context?.()?.has_class(cls) } catch {}
    return false
}

export const setclasses = (w: Gtk.Widget | null | undefined, classes: string[]): void => {
    if (!w) return
    let ctx: any = null
    try { ctx = w.get_style_context?.() } catch {}
    if (!ctx) return
    try {
        ctx.list_classes?.()?.forEach((c: string) => ctx.remove_class(c))
        classes.forEach(c => ctx.add_class(c))
    } catch {}
}

export const rand_int = (a: number, b: number): number =>
    Math.round(Math.random() * (b - a) + a)
