import { Box, EventBox } from "../widget.ts"
import Gdk from "gi://Gdk?version=3.0"
import { Variable } from "astal"
import { arradd, arrremove, assetsDir } from "../env.ts"
import { button_label_1, button_label_2, button_slider_padding, button_slider_width } from "../scaling.ts"
import { NierButton } from "./buttons.ts"


const handle_value = (segments: any[], boxes: number, value: number, active: boolean) => {
    for (const seg of segments) {
        arrremove(seg, "focus")
        arrremove(seg, "filled")
        arrremove(seg, "focus-on-hold")
    }
    let segment_index = Math.floor(value * boxes) - 1
    if (segment_index < 0) return
    if (segment_index >= boxes) segment_index = boxes - 1

    for (const seg of segments) {
        arrremove(seg, "focus")
        arrremove(seg, "filled")
    }
    for (const seg of segments) {
        if (seg.get_style_context().has_class(`nier-slider-boxes-${segment_index}`)) {
            if (active) {
                arradd(seg, "focus")
            } else {
                arradd(seg, "filled")
                arradd(seg, "focus-on-hold")
            }
            break
        }
        arradd(seg, "filled")
    }
}

export interface NierSliderButtonProps {
    label?: string
    className?: string
    ratio?: Variable<number>
    boxes?: number
    slider_padding?: number
    onValueChange?: (self: any, value: number) => Promise<void>
    size?: number
    font_size?: number
    useAssetsDir?: () => string
    connections?: any[]
    [key: string]: any
}

export const NierSliderButton = ({
    label = "",
    className = "",
    ratio = new Variable<number>(0),
    boxes = button_slider_width,
    slider_padding = button_slider_padding,
    onValueChange = async (_self: any, _value: number) => {},
    size = button_label_2,
    font_size = button_label_1,
    useAssetsDir = assetsDir,
    connections = [],
    ...props
}: NierSliderButtonProps) => {
    let isDragging = false
    let hovering = false
    const updateRatio = (slider: any, event: any) => {
        let xPos = 0
        try {
            const coords = event.get_coords?.()
            xPos = Array.isArray(coords) ? Number(coords.at(-2) ?? 0) : 0
        } catch {}
        const alloc = slider.get_allocation()
        const usable = Math.max(alloc.width - slider_padding, 1)
        const rawPos = Math.min(Math.max(xPos, 0), usable)
        ratio.set(rawPos / usable)
    }
    const sliderVisual = NierInertSlider({
        boxes,
        ratioVar: ratio,
        hovering: () => hovering || isDragging,
    })
    const sliderHit = EventBox({
        child: sliderVisual,
        setup: (self: any) => {
            self.add_events(
                Gdk.EventMask.BUTTON_PRESS_MASK |
                Gdk.EventMask.BUTTON_RELEASE_MASK |
                Gdk.EventMask.POINTER_MOTION_MASK,
            )
            self.connect("button-press-event", (_w: any, ev: any) => {
                isDragging = true
                updateRatio(sliderVisual, ev)
                return true
            })
            self.connect("button-release-event", () => {
                isDragging = false
                return true
            })
            self.connect("motion-notify-event", (_w: any, ev: any) => {
                if (!isDragging) return false
                updateRatio(sliderVisual, ev)
                return true
            })
        },
    })

    return NierButton({
        useAssetsDir,
        label,
        homogeneous_button: true,
        size,
        font_size,
        className: `nier-slider-button ${className}`,
        ...props,

        passedOnHover: async (self: any) => {
            hovering = true
            const slider = self.child.centerWidget.children[1]?.child
            const segments = slider?.children ?? []
            for (const seg of segments) {
                if (seg.get_style_context().has_class("focus-on-hold")) {
                    arradd(seg, "focus")
                    arrremove(seg, "filled")
                    arrremove(seg, "focus-on-hold")
                    break
                }
            }
            return true
        },
        passedOnHoverLost: async (self: any) => {
            hovering = false
            if (isDragging) return false
            const slider = self.child.centerWidget.children[1]?.child
            const segments = slider?.children ?? []
            for (const seg of segments) {
                if (seg.get_style_context().has_class("focus")) {
                    arradd(seg, "filled")
                    arradd(seg, "focus-on-hold")
                    arrremove(seg, "focus")
                    break
                }
            }
            return true
        },
        handleClick: async () => {},
        handleClickRelease: async (_self: any) => { isDragging = false },
        handleMotion: async () => {},
        children: [
            sliderHit,
        ],
    })
}

export const NierInertSlider = ({
    boxes = button_slider_width,
    slider_padding = button_slider_padding,
    ratioVar = null as Variable<number> | null,
    hovering = () => false,
    connections = [],
}: {
    boxes?: number
    slider_padding?: number
    ratioVar?: Variable<number> | null
    hovering?: () => boolean
    connections?: any[]
}) => {
    const self = Box({
        className: "nier-slider",
        homogeneous: false,
        hpack: "end",
        vpack: "center",
        css: `padding-right: ${slider_padding}px;padding-left: 0px;`,
        children: [
            ...Array.from({ length: boxes }, (_, i) =>
                Box({
                    child: Box({ className: "inner" }),
                    className: `nier-slider-boxes nier-slider-boxes-${i}`,
                })
            ),
            Box({ className: "nier-slider-end" }),
            Box({ className: "nier-slider-size" }),
        ],
    })

    if (ratioVar) {
        const update = () => {
            const segments = self.children.slice(0, boxes)
            handle_value(segments, boxes, ratioVar.get(), hovering())
        }
        ratioVar.subscribe(() => {
            update()
        })
        update()
    }

    return self
}
