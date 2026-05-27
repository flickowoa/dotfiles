import { Widget as W, App, Astal } from "astal/gtk3"
import { playClick } from "./widgets/sounds.ts"
export { App, Astal }

export const Anchor      = Astal.WindowAnchor
export const Layer       = Astal.Layer
export const Exclusivity = Astal.Exclusivity
export const Keymode     = Astal.Keymode

export const Box        = (p?: any) => new W.Box(p)
export const Button     = (p?: any) => {
    const b = new W.Button(p)
    const suppress = !!(p && (p.suppressClickSound || p.noClickSound))
    if (!suppress) {
        try { b.connect("clicked", () => { try { playClick() } catch {} }) } catch {}
    }
    return b
}
export const Label      = (p?: any) => new W.Label(p)
export const Icon       = (p?: any) => new W.Icon(p)
export const Window     = (p?: any) => new W.Window({ application: App, ...p })
export const EventBox   = (p?: any) => new W.EventBox(p)
export const Overlay    = (p?: any) => new W.Overlay(p)
export const Scrollable = (p?: any) => new W.Scrollable(p)
export const Revealer   = (p?: any) => new W.Revealer(p)
export const Entry      = (p?: any) => new W.Entry(p)
export const Slider     = (p?: any) => new W.Slider(p)
export const DrawingArea = (p?: any) => new W.DrawingArea(p)
export const CenterBox  = (p?: any) => new W.CenterBox(p)
