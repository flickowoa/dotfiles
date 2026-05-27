import { Box, Label } from "../widget.ts"
import { execAsync, interval } from "astal"
import { assetsDir, dark } from "../env.ts"
import { triggerBanner } from "../windows/banner/banner.ts"
import { RailTab, MENU_FONT } from "../nier/menu.ts"

export const Info = ({
    useAssetsDir = assetsDir,
}: {
    useAssetsDir?: () => string
} = {}) => {
    const timeLabel = Label({
        css: `font-family:${MENU_FONT};font-size:14px;letter-spacing:1px;`,
        label: "00:00",
    })

    const { box: timeBtn } = RailTab({
        content: timeLabel,
        fontSize: 14,
        square: true,
        squareSize: 13,
        bodyPadding: "6px 14px",
    })

    const t = interval(1000, async () => {
        try {
            const date = await execAsync(["date", "+%H:%M"])
            timeLabel.label = date.trim()
        } catch (_e) { }
    })

    const themeIcon = Label({
        label: dark.get() ? "☽" : "☀",
        css: `font-size:16px;`,
        xalign: 0.5, hexpand: true,
    })
    const { box: themeBtn } = RailTab({
        content: themeIcon,
        fontSize: 16,
        onSingle: () => triggerBanner(),
        hexpand: true,
    })

    const logoutIcon = Label({
        label: "✕",
        css: `font-size:14px;`,
        xalign: 0.5, hexpand: true,
    })
    const { box: logoutBtn } = RailTab({
        content: logoutIcon,
        fontSize: 14,
        onSingle: () => execAsync(["hyprctl", "dispatch", "exit"]).catch(print),
        hexpand: true,
    })

    const restartIcon = Label({
        label: "⟳",
        css: `font-size:14px;`,
        xalign: 0.5, hexpand: true,
    })
    const { box: restartBtn } = RailTab({
        content: restartIcon,
        fontSize: 14,
        onSingle: () => execAsync(["systemctl", "reboot"]).catch(print),
        hexpand: true,
    })

    const shutdownIcon = Label({
        label: "⏻",
        css: `font-size:14px;`,
        xalign: 0.5, hexpand: true,
    })
    const { box: shutdownBtn } = RailTab({
        content: shutdownIcon,
        fontSize: 14,
        onSingle: () => execAsync(["systemctl", "poweroff"]).catch(print),
        hexpand: true,
    })

    const box = Box({
        vexpand: true,
        className: "info",
        css: "margin-right: 20px;",
        children: [
            Box({
                spacing: 6,
                valign: "center",
                vexpand: true,
                children: [timeBtn, themeBtn, logoutBtn, restartBtn, shutdownBtn],
            }),
        ],
    })

    box.connect("destroy", () => t.cancel())
    return box
}
