import { Label } from "../widget.ts"
import { execAsync } from "astal"
import { assetsDir } from "../env.ts"
import { NierButton } from "../nier/buttons.ts"
import { button_label_2, settings_title_bottom, settings_title_top } from "../scaling.ts"

const GROUP_HEADING_TOP = Math.round(settings_title_top * 0.55)
const GROUP_HEADING_BOTTOM = Math.round(settings_title_bottom * 0.42)
const GROUP_HEADING_CSS = `margin-top:${GROUP_HEADING_TOP}px;margin-bottom:${GROUP_HEADING_BOTTOM}px;font-size:28px;padding-left:24px;`
const GROUP_FONT = Math.max(14, Math.round(button_label_2 * 0.58))

export const PowerGroup = ({
    go_to = async (_buttons: any[], _parent: any) => {},
    passAssetsDir = assetsDir,
}: {
    go_to?: (buttons: any[], parent: any) => Promise<void>
    passAssetsDir?: () => string
}): any[] => [
    Label({ hpack: "start", label: "POWER", className: "heading", css: GROUP_HEADING_CSS }),
    NierButton({
        useAssetsDir: passAssetsDir,
        label: "Logout",
        font_size: GROUP_FONT,
        handleClick: async () => { await execAsync(["hyprctl", "dispatch", "exit"]) },
    }),
    NierButton({
        useAssetsDir: passAssetsDir,
        label: "Shutdown",
        font_size: GROUP_FONT,
        handleClick: async () => { await execAsync(["systemctl", "poweroff"]) },
    }),
    NierButton({
        useAssetsDir: passAssetsDir,
        label: "Reboot",
        font_size: GROUP_FONT,
        handleClick: async () => { await execAsync(["systemctl", "reboot"]) },
    }),
]
