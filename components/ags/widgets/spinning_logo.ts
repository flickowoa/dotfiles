import { Button, DrawingArea } from "../widget.ts"
import GdkPixbuf from "gi://GdkPixbuf"
import Gdk from "gi://Gdk?version=3.0"
import GLib from "gi://GLib"
import { playBleep } from "./sounds.ts"
import { FRAME_BODY_H } from "../nier/menu.ts"

export const SpinningLogo = ({
    iconPath, size, onClicked,
}: {
    iconPath: string
    size: number
    onClicked?: () => void
}) => {
    let pixbuf: any = null
    try {
        pixbuf = GdkPixbuf.Pixbuf.new_from_file(iconPath)
    } catch (e) { print("settings logo failed loading", iconPath, e) }

    let glow = 0
    let hovering = false
    let timerId: number | null = null

    const area = DrawingArea({ halign: "center", valign: "center" })
    area.set_size_request(size, size)
    try { area.set_halign?.(3) /* CENTER */ } catch {}
    try { area.set_valign?.(3) /* CENTER */ } catch {}

    area.connect("draw", (_w: any, ctx: any) => {
        if (pixbuf) {
            try {
                ctx.save()
                ctx.scale(size / pixbuf.get_width(), size / pixbuf.get_height())
                Gdk.cairo_set_source_pixbuf(ctx, pixbuf, 0, 0)
                ctx.paint()
                if (glow > 0.01) {
                    try { ctx.paintWithAlpha(0.6 * glow) } catch {}
                }
                ctx.restore()
            } catch {}
        } else {
            ctx.setSourceRGBA(218/255, 212/255, 187/255, 0.85 + 0.15 * glow)
            ctx.moveTo(size / 2, 0)
            ctx.lineTo(size, size)
            ctx.lineTo(0, size)
            ctx.closePath()
            ctx.fill()
        }
        return false
    })

    const tick = (): boolean => {
        const target = hovering ? 1 : 0
        const delta = target - glow
        if (Math.abs(delta) < 0.005) {
            glow = target
            timerId = null
            area.queue_draw()
            return false
        }
        glow += delta * 0.22
        area.queue_draw()
        return true
    }

    const ensureTimer = () => {
        if (timerId !== null) return
        timerId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 16, tick)
    }

    const btnCss = (hover: boolean) => `
        padding: 0 8px;
        margin: 0;
        background: rgba(${hover ? "215, 55, 42, 0.85" : "180, 40, 30, 0.55"});
        background-image: none;
        border-top: ${hover ? 3 : 1}px solid rgba(245, 90, 75, 1);
        border-bottom: ${hover ? 3 : 1}px solid rgba(245, 90, 75, 1);
        border-left: none;
        border-right: none;
        box-shadow: none;
        min-width: ${FRAME_BODY_H + 8}px;
        min-height: ${FRAME_BODY_H - 2}px;
        transition: background-color 160ms ease, border-width 120ms ease;
    `

    const btn: any = Button({
        valign: 3,
        vexpand: false,
        css: btnCss(false),
        child: area,
        setup: (self: any) => {
            try { self.set_valign(3) } catch {}   // CENTER — don't fill to the separator
            try { self.set_vexpand(false) } catch {}
            self.connect("enter-notify-event", () => { hovering = true;  self.css = btnCss(true);  ensureTimer(); return false })
            self.connect("leave-notify-event", () => { hovering = false; self.css = btnCss(false); ensureTimer(); return false })
        },
        onClicked: () => { playBleep(); onClicked?.() },
    })
    return btn
}
