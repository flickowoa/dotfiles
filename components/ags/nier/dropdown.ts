import { App, Window, Label, EventBox, Box, Icon, Anchor, Layer, Exclusivity } from "../widget.ts"
import Gdk from "gi://Gdk?version=3.0"
import { Variable, timeout } from "astal"
import { arradd, arrremove, assetsDir } from "../env.ts"
import { button_label_2 } from "../scaling.ts"
import { NierButton } from "./buttons.ts"


export interface NierDropDownButtonProps {
    label?: string
    className?: string
    options?: Variable<string[]>
    size?: number
    current?: Variable<string>
    popup_x_offset?: number
    useAssetsDir?: () => string
    passedOnHoverLost?: (self: any) => Promise<boolean>
    passedOnHover?: (self: any) => Promise<boolean>
    [key: string]: any
}

export const NierDropDownButton = ({
    label = "",
    className = "",
    options = new Variable<string[]>([]),
    size = button_label_2,
    current = new Variable<string>(""),
    popup_x_offset = 0,
    useAssetsDir = assetsDir,
    passedOnHoverLost = async (_self: any) => true,
    passedOnHover = async (_self: any) => true,
    ...props
}: NierDropDownButtonProps) => {
    let popup_window: any = null

    return NierButton({
        useAssetsDir,
        label,
        className: `nier-dropdown-button ${className}`,
        containerClassName: "nier-dropdown-button-container",
        passedOnHoverLost: async (self: any) => {
            arrremove(self.child, "nier-button-box-hover-from-selected")
            return true
        },
        handleClick: async (self: any, _event: any) => {
            arradd(self.child, "nier-button-box-selected")
            const alloc = self.get_allocation()
            await new Promise(r => setTimeout(r, 200))
            if (popup_window) {
                popup_window.destroy()
                popup_window = null
                return
            }
            popup_window = NierSelectMenu({
                coord_x: alloc.x + alloc.width + popup_x_offset,
                coord_y: alloc.y,
                button: self,
                current,
                options,
                useAssetsDir,
            })
        },
        children: [
            Label({
                className: "nier-option-item",
                hpack: "end",
                setup: (self: any) => {
                    self.label = current.get()
                    current.subscribe(() => { self.label = current.get() })
                },
            }),
        ],
        ...props,
    })
}

export const NierSelectMenu = ({
    coord_x = 0,
    coord_y = 0,
    size = button_label_2,
    spacing = 20,
    button = null as any,
    current,
    options,
    useAssetsDir = assetsDir,
}: {
    coord_x?: number
    coord_y?: number
    size?: number
    spacing?: number
    button?: any
    current: Variable<string>
    options: Variable<string[]>
    useAssetsDir?: () => string
}) => {
    const menu = Window({
        exclusivity: Exclusivity.IGNORE,
        focusable: true,
        layer: Layer.OVERLAY,
        anchor: Anchor.TOP | Anchor.LEFT,
        setup: (self: any) => timeout(1, () => {
            self.connect("destroy", async () => {
                arrremove(button.child, "nier-button-box-selected")
                arradd(button.child, "nier-button-box-hover-from-selected")
                await new Promise(r => setTimeout(r, 500))
                arrremove(button.child, "nier-button-box-hover-from-selected")
            })
            self.connect("key-press-event", (_widget: any, event: any) => {
                if (event.get_keyval()[1] === Gdk.KEY_Escape) self.destroy()
            })
        }),
        child: Box({
            vertical: true,
            className: "nier-option-menu",
            css: `margin-left: ${coord_x}px; margin-top: ${coord_y}px;`,
            setup: (self: any) => {
                const rebuild = () => {
                    self.children = [
                        Box({
                            children: [
                                Box({
                                    spacing,
                                    children: [
                                        Box({
                                            className: "nier-option-header",
                                            child: Box({ className: "nier-option-header-inner" }),
                                        }),
                                        Icon({
                                            icon: useAssetsDir() + "/nier-pointer-rev.svg",
                                            size: size,
                                            css: "opacity: 0;",
                                            className: "nier-button-hover-icon",
                                        }),
                                    ],
                                }),
                            ],
                        }),
                        ...options.get().map(option =>
                            NierOptionItem({ label: option, size, spacing, button, current, useAssetsDir })
                        ),
                    ]
                }
                rebuild()
                const unsub = options.subscribe(rebuild)
                self.connect("destroy", unsub)
            },
        }),
    })
    return menu
}

export const NierOptionItem = ({
    label = "",
    size = button_label_2,
    spacing = 20,
    button = null as any,
    current,
    useAssetsDir = assetsDir,
}: {
    label?: string
    size?: number
    spacing?: number
    button?: any
    current: Variable<string>
    useAssetsDir?: () => string
}) =>
    Box({
        className: "nier-button-container nier-option-container",
        spacing,
        setup: (self: any) => timeout(1, () => {
            const btnLabel = button.child.centerWidget.children[1]
            if (btnLabel.label === label) {
                arradd(self, "nier-option-selected")
            }
        }),
        children: [
            EventBox({
                onHover: async (self: any) => {
                    const btn = self.child
                    const cursor = self.parent.children[1]
                    const container = self.parent
                    arradd(btn, "nier-button-hover")
                    setclasses_icon(cursor, true)
                    arradd(container, "nier-button-container-hover")
                    return true
                },
                onHoverLost: async (self: any) => {
                    const btn = self.child
                    const cursor = self.parent.children[1]
                    const container = self.parent
                    arrremove(btn, "nier-button-hover")
                    setclasses_icon(cursor, false)
                    arrremove(container, "nier-button-container-hover")
                    return true
                },
                setup: (self: any) => self.connect("button-press-event", async () => {
                    current.set(label)
                    self.parent.parent.parent.destroy()
                    return true
                }),
                child: Box({
                    className: "nier-button",
                    children: [Label({ label })],
                }),
            }),
            Icon({
                icon: useAssetsDir() + "/nier-pointer-rev.svg",
                size: size,
                className: "nier-button-hover-icon nier-button-hover-icon-hidden",
            }),
        ],
    })

function setclasses_icon(widget: any, visible: boolean) {
    const ctx = widget.get_style_context()
    ctx.list_classes()?.forEach((c: string) => ctx.remove_class(c))
    if (visible) {
        ctx.add_class("nier-long-button-hover-icon")
        ctx.add_class("nier-long-button-hover-icon-visible")
    } else {
        ctx.add_class("nier-long-button-hover-icon")
        ctx.add_class("nier-long-button-hover-icon-hidden")
    }
}
