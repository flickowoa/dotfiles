import { Label } from "../widget.ts"
import { Variable, interval } from "astal"
import { assetsDir, SCREEN_WIDTH } from "../env.ts"
import { NierButton } from "../nier/buttons.ts"
import { NierDropDownButton } from "../nier/dropdown.ts"
import { button_label_2, settings_title_bottom, settings_title_top } from "../scaling.ts"
import { toggleWifi } from "../windows/wifi/wifi.ts"

// AstalNetwork — installed via paru -S libastal-network-git
import AstalNetwork from "gi://AstalNetwork"
const network = AstalNetwork.get_default()

const GROUP_HEADING_TOP = Math.round(settings_title_top * 0.55)
const GROUP_HEADING_BOTTOM = Math.round(settings_title_bottom * 0.42)
const GROUP_HEADING_CSS = `margin-top:${GROUP_HEADING_TOP}px;margin-bottom:${GROUP_HEADING_BOTTOM}px;font-size:40px;padding-left:24px;`
const GROUP_FONT = Math.max(18, Math.round(button_label_2 * 0.72))


export const WifiGroup = ({
   // go_to = (_buttons: any[], _self: any) => {},
    passAssetsDir = assetsDir,
}: {
    go_to?: (buttons: any[], self: any) => void
    passAssetsDir?: () => string
}): any[] => {
    const wifi = network.wifi

    const enabled = new Variable<string>(wifi?.enabled ? "Yes" : "No")
    const current_ssid = new Variable<string>(wifi?.ssid ?? "")
    const current_networks = new Variable<string[]>(["loading..."])

    // Sync enabled toggle → wifi
    const unsub_enabled = enabled.subscribe((v) => {
        if (wifi) wifi.enabled = (v === "Yes")
    })

    const enabledDropdown = NierDropDownButton({
        useAssetsDir: passAssetsDir,
        font_size: GROUP_FONT,
        label: "Enabled",
        current: enabled,
        options: new Variable<string[]>(["Yes", "No"]),
        popup_x_offset: SCREEN_WIDTH / 4,
    })

    // Scan networks every 10s
    const scan_timer = interval(10000, () => {
        if (!wifi) return
        current_ssid.set(wifi.ssid ?? "")
        wifi.scan()
        const seen: string[] = []
        current_networks.set(
            (wifi.access_points ?? [])
                .map((ap: any) => ap.ssid as string)
                .filter((ssid: string) => {
                    if (seen.includes(ssid)) return false
                    seen.push(ssid)
                    return true
                })
        )
    })

    const connectDropdown = NierDropDownButton({
        useAssetsDir: passAssetsDir,
        font_size: GROUP_FONT,
        label: "Connect",
        current: current_ssid,
        options: current_networks,
        popup_x_offset: SCREEN_WIDTH / 4,
    })
    const connectButton = NierButton({
        useAssetsDir: passAssetsDir,
        font_size: GROUP_FONT,
        label: "Connect",
        children: [
            Label({
                label: current_ssid.get() || "Choose network",
                xalign: 1,
                hexpand: true,
                css: `font-size:${GROUP_FONT}px;`,
                setup: (self: any) => current_ssid.subscribe(() => {
                    self.label = current_ssid.get() || "Choose network"
                }),
            }),
        ],
        handleClick: async () => { toggleWifi() },
    })

    // Cleanup on destroy
    connectDropdown.connect("destroy", () => {
        unsub_enabled()
        scan_timer.cancel()
    })

    return [
        Label({ hpack: "start", label: "WIFI", className: "heading", css: GROUP_HEADING_CSS }),
        enabledDropdown,
        connectButton,
    ]
}
