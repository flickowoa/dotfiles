import { EventBox } from "../widget.ts"
import GLib from "gi://GLib"
import Gdk from "gi://Gdk?version=3.0"

const DOUBLE_MS = 280

export const Clickable = ({ child, onSingle, onDouble }: {
    child: any
    onSingle?: () => void
    onDouble?: () => void
}) => {
    let pendingSingle: number | null = null

    return EventBox({
        child,
        setup: (self: any) => {
            self.add_events(Gdk.EventMask.BUTTON_PRESS_MASK)
            self.connect("button-press-event", (_w: any, ev: any) => {
                if (ev.type === Gdk.EventType.DOUBLE_BUTTON_PRESS || ev.type === 5) {
                    if (pendingSingle !== null) {
                        GLib.source_remove(pendingSingle); pendingSingle = null
                    }
                    onDouble?.()
                    return true
                }
                if (ev.type === Gdk.EventType.BUTTON_PRESS || ev.type === 4) {
                    if (pendingSingle !== null) GLib.source_remove(pendingSingle)
                    pendingSingle = GLib.timeout_add(GLib.PRIORITY_DEFAULT, DOUBLE_MS, () => {
                        pendingSingle = null
                        onSingle?.()
                        return false
                    })
                    return true
                }
                return false
            })
        },
    })
}
