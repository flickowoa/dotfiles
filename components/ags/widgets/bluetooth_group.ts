import { Label } from "../widget.ts"
import { Variable } from "astal"
import { assetsDir, SCREEN_WIDTH } from "../env.ts"
import { NierButton } from "../nier/buttons.ts"
import { NierDropDownButton } from "../nier/dropdown.ts"
import { button_label_2, settings_title_bottom, settings_title_top } from "../scaling.ts"
import { openBluetoothModal, setBluetoothPowered } from "../windows/bluetooth/bluetooth.ts"

import AstalBluetooth from "gi://AstalBluetooth"
const bluetooth = AstalBluetooth.get_default()

const GROUP_HEADING_TOP = Math.round(settings_title_top * 0.55)
const GROUP_HEADING_BOTTOM = Math.round(settings_title_bottom * 0.42)
const GROUP_HEADING_CSS = `margin-top:${GROUP_HEADING_TOP}px;margin-bottom:${GROUP_HEADING_BOTTOM}px;font-size:40px;padding-left:24px;`
const GROUP_FONT = Math.max(18, Math.round(button_label_2 * 0.72))


export const BluetoothGroup = ({
    go_to = async (_buttons: any[], _parent: any) => {},
    passAssetsDir = assetsDir,
}: {
    go_to?: (buttons: any[], parent: any) => Promise<void>
    passAssetsDir?: () => string
}): any[] => {
    const enabled = new Variable<string>(bluetooth.is_powered ? "Yes" : "No")

    const unsub = enabled.subscribe((v) => {
        setBluetoothPowered(v === "Yes")
    })
    const syncId = bluetooth.connect("notify::is-powered", () => {
        enabled.set(bluetooth.is_powered ? "Yes" : "No")
    })

    const enabledDropdown = NierDropDownButton({
        useAssetsDir: passAssetsDir,
        font_size: GROUP_FONT,
        label: "Enabled",
        current: enabled,
        options: new Variable<string[]>(["Yes", "No"]),
        popup_x_offset: SCREEN_WIDTH / 4,
    })
    enabledDropdown.connect("destroy", () => {
        unsub()
        try { bluetooth.disconnect(syncId) } catch {}
    })

    return [
        Label({ hpack: "start", label: "BLUETOOTH", className: "heading", css: GROUP_HEADING_CSS }),
        enabledDropdown,
        NierButton({
            useAssetsDir: passAssetsDir,
            font_size: GROUP_FONT,
            label: "Devices",
            handleClick: async () => {
                openBluetoothModal()
            },
        }),
    ]
}
