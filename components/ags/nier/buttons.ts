import { App, Button, Label, Overlay, EventBox, Box, Scrollable, Icon, CenterBox } from "../widget.ts"
import Pango from "gi://Pango"
import { timeout } from "astal"
import {
    arradd, arrremove, hasclass, setclasses, assetsDir,
} from "../env.ts"
import {
    button_label_1, button_max_chars, button_pointer_size, button_width,
} from "../scaling.ts"


// ── NierButton ────────────────────────────────────────────────────────────
export interface NierButtonProps {
    label?: string
    className?: string
    containerClassName?: string
    children?: any[]
    label_no_box?: boolean
    size?: number
    font_size?: number
    homogeneous_button?: boolean
    select_on_click?: boolean
    siblings?: any[]
    multiple_selected_siblings?: boolean
    max_label_chars?: number
    container_style?: string
    useAssetsDir?: () => string
    labelOveride?: (label: string, font_size: number, max_label_chars: number) => any
    passedOnHoverLost?: (self: any) => Promise<boolean>
    passedOnHover?: (self: any) => Promise<boolean>
    handleMotion?: (self: any, event: any) => Promise<void>
    handleClick?: (self: any, event: any) => Promise<void>
    handleClickRelease?: (self: any) => Promise<void>
    setup?: (self: any) => void
    overlays?: any[]
    [key: string]: any
}

export const NierButton = ({
    label = "",
    className = "",
    containerClassName = "",
    children = [],
    label_no_box = false,
    size = button_pointer_size,
    font_size = button_label_1,
    homogeneous_button = true,
    select_on_click = false,
    siblings = null as any,
    multiple_selected_siblings = false,
    max_label_chars = button_max_chars,
    container_style = "",
    useAssetsDir = assetsDir,

    labelOveride = (lbl: string, fs: number, mlc: number) =>
        Label({
            className: "nier-button-label",
            css: `font-size: ${fs}px;`,
            label: "■ " + lbl,
            xalign: 0,
            justification: "left",
            wrap: true,
            max_width_chars: mlc,
            setup: (self) => timeout(1, () => {
                self.set_line_wrap_mode(Pango.WrapMode.WORD_CHAR)
                self.set_ellipsize(Pango.EllipsizeMode.END)
            }),
        }),

    passedOnHoverLost = async (_self: any) => true,
    passedOnHover = async (_self: any) => true,
    handleMotion = async (_self: any, _event: any) => {},
    handleClick = async (_self: any, _event: any) => {},
    handleClickRelease = async (_self: any) => {},
    setup = (_self: any) => {},
    overlays = [],
    ...props
}: NierButtonProps) =>
    Overlay({
        className: `nier-button-container ${containerClassName}`,
        child: Box({
            css: container_style,
            vpack: "center",
            children: [
                Icon({
                    icon: useAssetsDir() + "/nier-pointer.svg",
                    size: size,
                    className: "nier-button-hover-icon nier-button-hover-icon-hidden",
                }),
                EventBox({
                    onHover: async (self: any) => {
                        try {
                            const go = await passedOnHover(self).catch(() => false)
                            if (!go) return true
                            const top = self.child?.startWidget
                            const button = self.child?.centerWidget
                            const bottom = self.child?.endWidget
                            const box = self.child
                            const cursor = self.parent?.children?.[0]
                            const container = self.parent
                            if (button)    arradd(button, "nier-button-hover")
                            if (box)       arradd(box, "nier-button-box-hover")
                            if (cursor)    setclasses(cursor, ["nier-long-button-hover-icon", "nier-long-button-hover-icon-visible"])
                            if (top)       arradd(top, "nier-button-top-hover")
                            if (bottom)    arradd(bottom, "nier-button-bottom-hover")
                            if (container) arradd(container, "nier-button-container-hover")
                        } catch (e) { print("NierButton onHover:", e) }
                        return true
                    },
                    onHoverLost: async (self: any) => {
                        try {
                            const go = await passedOnHoverLost(self).catch(() => false)
                            if (!go) return true
                            const top = self.child?.startWidget
                            const button = self.child?.centerWidget
                            const bottom = self.child?.endWidget
                            const box = self.child
                            const cursor = self.parent?.children?.[0]
                            const container = self.parent
                            if (button)    arrremove(button, "nier-button-hover")
                            if (box)       arrremove(box, "nier-button-box-hover")
                            if (cursor)    setclasses(cursor, ["nier-button-hover-icon", "nier-button-hover-icon-hidden"])
                            if (top)       arrremove(top, "nier-button-top-hover")
                            if (bottom)    arrremove(bottom, "nier-button-bottom-hover")
                            if (container) arrremove(container, "nier-button-container-hover")
                        } catch (e) { print("NierButton onHoverLost:", e) }
                        return true
                    },
                    setup: (self: any) => timeout(1, () => {
                        setup(self)
                        self.connect("button-press-event", (self: any, event: any) => {
                            if (select_on_click) {
                                if (siblings && !multiple_selected_siblings) {
                                    for (const btn of siblings) {
                                        if (hasclass(btn, "nier-button-container")) {
                                            const child = btn.child.children[1]
                                            arrremove(child, "nier-button-box-selected")
                                        }
                                    }
                                }
                                arradd(self.child, "nier-button-box-selected")
                            }
                            handleClick(self, event).catch(console.error)
                        })
                        self.connect("button-release-event", (self: any) =>
                            handleClickRelease(self).catch(console.error))
                        self.connect("motion-notify-event", (self: any, event: any) =>
                            handleMotion(self, event).catch(console.error))
                    }),

                    child: CenterBox({
                        hexpand: true,
                        vertical: true,
                        className: "nier-button-box",
                        startWidget: Box({ className: "nier-button-top" }),
                        centerWidget: Box({
                            homogeneous: homogeneous_button,
                            css: `min-width: ${button_width}px;`,
                            className: `nier-button ${className}`,
                            children: [
                                labelOveride(label, font_size, max_label_chars),
                                ...children,
                            ],
                            ...props,
                        }),
                        endWidget: Box({ className: "nier-button-bottom" }),
                    }),
                }),
            ],
        }),
    })

// ── NierButtonGroup ───────────────────────────────────────────────────────
export interface NierButtonGroupProps {
    heading?: string
    scrollable?: boolean
    className?: string
    containerClassName?: string
    buttons?: any[]
    style?: string
    spacing?: number
    horizontal?: boolean
    min_scale?: number
    passedOnHover?: (self: any) => Promise<void>
    passedOnHoverLost?: (self: any) => Promise<void>
    [key: string]: any
}

export const NierButtonGroup = ({
    heading = "",
    scrollable = false,
    className = "",
    containerClassName = "",
    buttons = [],
    style = "",
    spacing = 10,
    horizontal = false,
    min_scale = 200,
    passedOnHover = async (_self: any) => {},
    passedOnHoverLost = async (_self: any) => {},
    ...props
}: NierButtonGroupProps) => {
    const inner = EventBox({
        onHover: async (self: any) => {
            passedOnHover(self).catch(console.error)
            return true
        },
        onHoverLost: async (self: any) => {
            passedOnHoverLost(self).catch(console.error)
            return true
        },
        child: Box({
            className: `nier-long-button-group-container ${containerClassName}`,
            children: [
                Box({ className: "nier-long-button-group-ruler" }),
                Box({
                    vertical: !horizontal,
                    className: horizontal
                        ? `nier-long-button-group ${className}`
                        : `nier-long-button-group-vertical ${className}`,
                    css: style,
                    spacing,
                    children: [...buttons],
                }),
            ],
            ...props,
        }),
    })

    if (scrollable) {
        return Scrollable({
            hscroll: horizontal ? "always" : "never",
            vscroll: horizontal ? "never" : "always",
            css: `${horizontal ? "min-width" : "min-height"}: ${min_scale}px;`,
            child: inner,
        })
    }
    return inner
}

// ── NierLongButton ────────────────────────────────────────────────────────
export interface NierLongButtonProps {
    name?: string
    className?: string
    containerClassName?: string
    label?: string
    label_prefix?: string
    passedOnHoverLost?: (self: any) => Promise<void>
    passedOnHover?: (self: any) => Promise<void>
    [key: string]: any
}

export const NierLongButton = ({
    name = "",
    className = "",
    containerClassName = "",
    label = "",
    label_prefix = "■",
    passedOnHoverLost = async (_self: any) => {},
    passedOnHover = async (_self: any) => {},
    ...props
}: NierLongButtonProps) =>
    Box({
        className: `nier-long-button-container ${containerClassName}`,
        children: [
            Icon({
                icon: assetsDir() + "/nier-pointer.svg",
                size: 35,
                className: "nier-long-button-hover-icon nier-long-button-hover-icon-hidden",
            }),
            Button({
                name,
                child: Label({
                    label: `${label_prefix} ${label}`,
                    xalign: 0,
                    justification: "left",
                }),
                setup: (self: any) => {
                    self.connect("enter-notify-event", (self: any) => {
                        passedOnHover(self)
                        arradd(self, "nier-long-button-hover")
                        setclasses(self.parent.children[0], [
                            "nier-long-button-hover-icon",
                            "nier-long-button-hover-icon-visible",
                        ])
                    })
                    self.connect("leave-notify-event", (self: any) => {
                        passedOnHoverLost(self)
                        arrremove(self, "nier-long-button-hover")
                        setclasses(self.parent.children[0], [
                            "nier-long-button-hover-icon",
                            "nier-long-button-hover-icon-hidden",
                        ])
                    })
                },
                css: `min-width: ${button_width}px;`,
                className: `nier-long-button ${className}`,
                ...props,
            }),
        ],
    })
