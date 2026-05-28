import { execAsync, interval } from "astal"
import { arradd, arrremove, hasclass, setclasses, assetsDir, SCREEN_WIDTH, dark } from "../env.ts"
import { NierLongButton, NierButtonGroup } from "../nier/buttons.ts"
import { Box, Button, Label, DrawingArea } from "../widget.ts"
import { workspace_workspaces } from "../scaling.ts"
import { playClick } from "./sounds.ts"
import { drawWsIcon } from "./ws_icons.ts"
import { RailTab } from "../nier/menu.ts"

// AstalHyprland — installed via paru -S libastal-hyprland-git
import AstalHyprland from "gi://AstalHyprland"
const hyprland = AstalHyprland.get_default()
const ICON_PX = 26
const iconRGB = (isDark: boolean, selected: boolean): readonly [number, number, number] => {
    const fg: readonly [number, number, number] = isDark ? [234 / 255, 228 / 255, 210 / 255] : [72 / 255, 70 / 255, 61 / 255]
    const bg: readonly [number, number, number] = isDark ? [28 / 255, 26 / 255, 21 / 255]     : [194 / 255, 189 / 255, 166 / 255]
    return selected ? bg : fg
}

export const WorkspaceTiles = () => {
    let curId = hyprland.focusedWorkspace?.id ?? 1
    let selected = false

    const icon = DrawingArea({ hexpand: false, vexpand: false })
    icon.set_size_request(ICON_PX, ICON_PX)
    // draw centred against the live allocation, else the icon sticks to the top
    icon.connect("draw", (_w: any, ctx: any) => {
        const a = icon.get_allocation()
        const S = Math.min(a.width || ICON_PX, a.height || ICON_PX) * 0.92
        const ox = ((a.width || ICON_PX) - S) / 2
        const oy = ((a.height || ICON_PX) - S) / 2
        ctx.save()
        ctx.translate(ox, oy)
        const [r, g, b] = iconRGB(dark.get(), selected)
        drawWsIcon(ctx, curId, S, r, g, b)
        ctx.restore()
        return false
    })

    const { box: tile } = RailTab({
        content: icon,
        hexpand: false,
        bodyPadding: "0 12px",            // same height scheme as the bar frames
        onState: (state) => {
            const sel = state !== "idle"
            if (sel !== selected) { selected = sel; icon.queue_draw() }
        },
        onSingle: () => {
            playClick()
            execAsync(["hyprctl", "dispatch", "workspace", "e+1"])
        },
    })

    const refresh = () => {
        const id = hyprland.focusedWorkspace?.id ?? 1
        if (id !== curId) { curId = id; icon.queue_draw() }
    }

    hyprland.connect("notify::focused-workspace", refresh)
    const refreshTimer = interval(1500, refresh)
    refresh()

    
    dark.subscribe(() => icon.queue_draw())

    // return the RailTab box 
    tile.connect("unrealize", () => refreshTimer.cancel())
    return tile
}

const int_to_string = (i: number): string => {
    switch (i) {
        case 1: return "ONE"
        case 2: return "TWO"
        case 3: return "THREE"
        case 4: return "FOUR"
        case 5: return "FIVE"
        case 6: return "SIX"
        case 7: return "SEVEN"
        case 8: return "EIGHT"
        case 9: return "NINE"
        case 10: return "TEN"
        default: return `${i}`
    }
}

let HOVERING = false
let REALLY_HOVERING = false

export const Workspaces = () =>
    NierButtonGroup({
        horizontal: true,
        min_scale: SCREEN_WIDTH,
        className: "workspaces",
        buttons: Array.from({ length: workspace_workspaces }, (_, i) => i + 1).map(i =>
            NierLongButton({
                className: "workspace-button",
                containerClassName: `workspace-button-container workspace-button-${i}`,
                label: int_to_string(i),
                onClicked: () => { execAsync(`hyprctl dispatch workspace ${i}`) },

                passedOnHover: async (self: any) => {
                    const container = self.parent
                    if (!(hasclass(container, "active") || hasclass(container, "active-no-hover"))) {
                        HOVERING = true
                        REALLY_HOVERING = true
                    }
                    if (HOVERING) {
                        for (const btn of container.parent.children) {
                            if (hasclass(btn, "active") || hasclass(btn, "active-no-hover")) {
                                arrremove(btn, "active-no-hover")
                                arrremove(btn, "active")
                                arradd(btn, "active-no-hover-on-hold")
                            }
                        }
                    }
                },

                passedOnHoverLost: async (self: any) => {
                    const container = self.parent
                    if (!hasclass(self, "active")) {
                        HOVERING = false
                        await new Promise(r => setTimeout(r, 300))
                        if (!HOVERING && REALLY_HOVERING) {
                            REALLY_HOVERING = false
                        }
                    }
                    if (!HOVERING) {
                        for (const btn of container.parent.children) {
                            if (hasclass(btn, "active-on-hold")) {
                                arrremove(btn, "active-on-hold")
                                arradd(btn, "active")
                            }
                            if (hasclass(btn, "active-no-hover-on-hold")) {
                                arrremove(btn, "active-no-hover-on-hold")
                                arradd(btn, "active-no-hover")
                            }
                        }
                    }
                },

                // hook into active workspace changes
                setup: (self: any) => {
                    // self is the inner Button, parent is the container box - hook
                    // the container, timeout just to grab its reference
                    import("astal").then(({ timeout }) => timeout(1, () => {
                        const container = self.parent
                        hyprland.connect("notify::focused-workspace", () => {
                            const activeId = hyprland.focusedWorkspace?.id ?? -1
                            if (!hasclass(container, `workspace-button-${activeId}`)) {
                                arrremove(container, "active-on-hold")
                                arrremove(container, "active-no-hover-on-hold")
                                arrremove(container, "active")
                                arrremove(container, "active-no-hover")
                                container.children[0].icon = assetsDir() + "/nier-pointer.svg"
                            } else {
                                if (!hasclass(container.children[1], "nier-long-button-hover")) {
                                    arradd(container, "active-no-hover")
                                } else {
                                    arrremove(container.children[1], "nier-long-button-hover")
                                    arradd(container, "active")
                                }
                                setTimeout(() => {
                                    container.children[0].icon = assetsDir() + "/nier-pointer-select.svg"
                                }, 300)
                            }
                        })
                    }))
                },
            })
        ),
    })
