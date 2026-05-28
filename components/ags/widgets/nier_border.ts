import { Box, Icon, Scrollable } from "../widget.ts"
import { interval } from "astal"
import { assetsDir, get_cursor, SCREEN_WIDTH, SCREEN_HEIGHT } from "../env.ts"
import { nier_border_size } from "../scaling.ts"

const { round, abs } = Math

export const NierBorder = ({
    icon_width = nier_border_size,
    ratio = 0.5,
    y_axis = false,
    className = "",
    ...props
}: {
    icon_width?: number
    ratio?: number
    y_axis?: boolean
    className?: string
    [key: string]: any
}) => {
    const iconCount = Math.floor(SCREEN_WIDTH / icon_width) + 1
    const icons = Array.from({ length: iconCount }, () =>
        Icon({
            icon: assetsDir() + "/nier-border.svg",
            size: icon_width,
        })
    )

    const inner = Box({ children: icons })

    const scrollable = Scrollable({
        ...props,
        className: className,
        css: `min-width: 100px; min-height: ${round(icon_width / 3)}px;`,
        child: inner,
    })

    // Poll cursor position every 100ms to update which icon is "active"
    const t = interval(100, async () => {
        try {
            const [x, y] = await get_cursor()
            if (y_axis) {
                ratio = y / SCREEN_HEIGHT
            } else {
                ratio = x / SCREEN_WIDTH
            }
            const child_index = round((SCREEN_WIDTH / icon_width) * ratio)
            icons.forEach((child, j) => {
                const want = abs(j - child_index) <= 1
                    ? assetsDir() + "/nier-border-full.svg"
                    : assetsDir() + "/nier-border.svg"
                if (child.icon !== want) child.icon = want
            })
        } catch (_e) { /* nothin */ }
    })

    scrollable.connect("destroy", () => t.cancel())

    return scrollable
}
