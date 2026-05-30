import { Window, Box, EventBox, Label, Overlay, Icon, Anchor, Layer, Exclusivity } from "../../widget.ts"
import Pango from "gi://Pango"
import { timeout } from "astal"
import { arradd, arrremove, assetsDir } from "../../env.ts"
import { NierButton, NierButtonGroup } from "../../nier/buttons.ts"

// AstalNotifd — installed via paru -S libastal-notifd-git
// had to port to work on ags 3.0
import AstalNotifd from "gi://AstalNotifd"
const notifd = AstalNotifd.get_default()

const currentNotifications = (): any[] => {
    try {
        const list = notifd.get_notifications?.() ?? (notifd as any).notifications ?? []
        return Array.from(list ?? [])
    } catch {
        return []
    }
}

const resolveNow = (n: any) => {
    try { n.dismiss() } catch {}
}

const forceSweep = (ids: Set<number>, attempt = 0) => {
    const remaining = currentNotifications().filter((n: any) => ids.has(Number(n?.id ?? -1)))
    if (!remaining.length) return

    for (const n of remaining) {
        try { n.dismiss() } catch {}
        try { n.expire() } catch {}
    }

    if (attempt < 2) timeout(180, () => forceSweep(ids, attempt + 1))
}

// Dismiss every currently-shown notification (bound to Alt+F11).
export const dismissAllNotifications = () => {
    try {
        const list = currentNotifications()
        const ids = new Set<number>()
        for (const n of list) {
            const id = Number(n?.id ?? -1)
            if (id >= 0) ids.add(id)
            resolveNow(n)
        }
        if (ids.size) timeout(180, () => forceSweep(ids))
    } catch (e) { print("dismiss all:", e) }
}


const card = (notification: any, left: boolean = true) => {
    const accent = Box({
        className: `notify-card-accent ${left ? "left" : "right"}`,
        setup: (self: any) => {
            switch (notification.urgency) {
                case 0: self.get_style_context().add_class("low"); break
                case 1: self.get_style_context().add_class("normal"); break
                case 2: self.get_style_context().add_class("critical"); break
            }
        },
    })

    const inner = Box({
        vpack: "center",
        className: "notify-card-inner",
        hpack: "fill",
        vertical: true,
        children: [
            Label({
                className: "notify-card-title",
                hpack: "start",
                vpack: "center",
                justification: "left",
                use_markup: true,
                max_width_chars: 24,
                wrap: true,
                wrap_mode: Pango.WrapMode.WORD_CHAR,
                label: notification.summary || notification.app_name || "",
            }),
            Label({
                className: "notify-card-body",
                hpack: "start",
                use_markup: true,
                vpack: "center",
                justification: "left",
                max_width_chars: 24,
                css: "min-width: 100px;",
                wrap: true,
                wrap_mode: Pango.WrapMode.WORD_CHAR,
                label: notification.body ?? "",
            }),
        ],
        setup: (self: any) => {
            if (notification.actions?.length) {
                self.spacing = 20
                self.add(
                    NierButtonGroup({
                        className: "notify-card-actions",
                        buttons: notification.actions.map((action: any) =>
                            NierButton({
                                useAssetsDir: assetsDir,
                                label: action.label,
                                handleClick: async () => {
                                    notification.invoke(action.id)
                                    notification.dismiss()
                                },
                            })
                        ),
                    })
                )
                self.show_all()
            }
        },
    })

    const card_content = Box({
        className: `notify-card-content ${left ? "left" : "right"}`,
        hpack: "start",
        hexpand: false,
        children: [
            inner,
            Icon({ hexpand: true, hpack: "end", size: 64, icon: notification.app_icon ?? "" }),
        ],
    })

    const hider = EventBox({ className: `notify-card-hider ${left ? "left" : "right"}` })
    let press_cords = [0, 0]
    let closing = false
    let dismissed = false

    const card_box = Box({
        className: `notify-card ${left ? "left" : "right"}`,
        children: left ? [accent, card_content] : [card_content, accent],
    })

    const overlay = Overlay({
        vexpand: false,
        vpack: "center",
        pass_through: true,
        child: EventBox({
            child: card_box,
            setup: (self: any) => {
                self.connect("button-press-event", (_self: any, event: any) => {
                    const [, x, y] = event.get_coords()
                    press_cords = [x, y]
                })
                self.connect("button-release-event", (_self: any, event: any) => {
                    if (closing) return
                    const [, x, y] = event.get_coords()
                    accent.css = "min-width: 10px; transition: min-width 0.2s cubic-bezier(0.15,0.79,0,1);"
                    card_content.css = "padding-left: 20px; transition: padding 0.3s cubic-bezier(0,1.77,.63,1.3);"
                    const diff_x = x - press_cords[0]
                    if (diff_x > 160) {
                        closing = true
                        timeout(100, () => {
                            if (!notification.popup && !dismissed) notification.dismiss()
                        })
                    }
                })
                self.connect("motion-notify-event", (_self: any, event: any) => {
                    const [, x, y] = event.get_coords()
                    const diff_x = x - press_cords[0]
                    if (diff_x > 10) {
                        accent.css = `min-width: ${100 * (1 - 2.718 ** -(diff_x / 100)) + diff_x / 100}px; transition: min-width 0s linear;`
                        card_content.css = `padding-left: ${50 * (1 - 2.718 ** -(diff_x / 500)) + 10}px; transition: padding 0s linear;`
                    }
                })
            },
        }),
        overlays: [hider],
        setup: (self: any) => timeout(100, () => {
            // sound notif 
            import("../../widgets/sounds.ts").then(({ playNotif, playBleep }) => {
                if (notification.urgency === 2) playBleep()
                else                              playNotif()
            }).catch(() => {})

            timeout(100, () => {
                hider.toggleClassName("enter", true)
                timeout(300, () => {
                    card_box.toggleClassName("enter", true)
                    hider.toggleClassName("enter-phase-2", true)
                    timeout(300, () => { self.overlays = [] })
                })
            })

            // Auto-dismiss after 10 s  
            timeout(10_000, () => {
                if (!dismissed) {
                    try { notification.dismiss() } catch (e) { print("auto-dismiss:", e) }
                }
            })

            // Listen for dismiss
            notification.connect("resolved", () => {
                if (dismissed) return
                dismissed = true
                print("dismissed")

                const box_alloc = card_box.get_allocation()
                let safe = false

                const alloc_id = self.connect("size-allocate", () => {
                    if (safe) return
                    if (self.overlays.length && self.overlays[0].get_allocation().width > 1) {
                        safe = true
                        const wait = closing ? 0 : 100 + 300 + 300
                        timeout(wait, () => {
                            accent.toggleClassName("leave", true)
                            hider.toggleClassName("leave", true)
                            timeout(350, () => {
                                card_box.toggleClassName("leave", true)
                                hider.toggleClassName("leave-phase-2", true)
                                timeout(300, () => {
                                    card_box.css = `margin-top: -${box_alloc.height}px; transition: margin 0.1s ease-out;`
                                    hider.css = `margin-top: -${box_alloc.height}px; transition: margin 0.1s ease-out;`
                                    timeout(100, () => { self.destroy() })
                                })
                            })
                        })
                        self.disconnect(alloc_id)
                    }
                })

                self.add_overlay(hider)
                self.show_all()
            })
        }),
    })

    return overlay
}

export const NotificationsWindow = () =>
    Window({
        name: "notifications",
        className: "notifications",
        margin: [0, 0, 0, 0],
        anchor: Anchor.TOP | Anchor.LEFT,
        exclusivity: Exclusivity.IGNORE,
        layer: Layer.TOP,
        focusable: false,
        visible: true,
        child: Box({
            css: "margin-top: 150px; min-width: 10px; min-height: 10px;",
            vertical: true,
            className: "notifications-holder",
            spacing: 5,
            setup: (self: any) => {
                notifd.connect("notified", (_notifd: any, id: number) => {
                    const notification = notifd.get_notification(id)
                    if (!notification) return
                    self.add(card(notification))
                    self.show_all()
                })
            },
        }),
    })
