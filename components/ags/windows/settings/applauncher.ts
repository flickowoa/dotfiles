import { App, Box, Label, Scrollable, Icon, Entry } from "../../widget.ts"
import Gio from "gi://Gio"
import Pango from "gi://Pango"
import { Variable, timeout } from "astal"
import { arradd, arrremove, SCREEN_HEIGHT, assetsDir } from "../../env.ts"
import { NierButton, NierButtonGroup } from "../../nier/buttons.ts"
import { closeSettings } from "./control.ts"


const MAX_SEARCH_RESULTS = 20

function searchAppInfo(searchString: string): Gio.AppInfo[] {
    const all = Gio.AppInfo.get_all()
    let count = 0
    return all.filter((info: Gio.AppInfo) => {
        if (count >= MAX_SEARCH_RESULTS) return false
        const name = info.get_display_name().toLowerCase()
        const desc = info.get_description()?.toLowerCase() ?? ""
        const term = searchString.toLowerCase()
        const match = name.includes(term) || desc.includes(term)
        if (match) count++
        return match
    })
}

const initialApps = (): Gio.AppInfo[] =>
    Gio.AppInfo.get_all().filter(a => a.should_show?.() ?? true).slice(0, MAX_SEARCH_RESULTS)

export const AppLauncher = ({
    assetsDir: useAssetsDir = assetsDir,
}: { assetsDir?: () => string } = {}) => {
    const initial = initialApps()
    const allApps = new Variable<Gio.AppInfo[]>(initial)

    const entryWidget = Entry({
        className: "app-launcher-search",
        placeholderText: "search apps",
        text: "",
        visibility: true,
        setup: (self: any) => {
            self.connect("changed", () => {
                allApps.set(searchAppInfo(self.get_text() ?? ""))
            })
            self.connect("activate", () => {
                const apps = allApps.get()
                if (apps[0]) {
                    apps[0].launch([], null)
                    closeSettings()
                }
            })
        },
    })

    const makeAppButton = (app: Gio.AppInfo) =>
        NierButton({
            useAssetsDir,
            font_size: 21,
            label: app.get_display_name(),
            labelOveride: (label: string, font_size: number, _max: number) =>
                Box({
                    children: [
                        Icon({
                            className: "app-launcher-icon",
                            size: 20,
                            icon: app.get_icon()?.to_string() ?? "",
                        }),
                        Label({
                            className: "app-launcher-label",
                            css: `font-size: ${font_size}px;`,
                            wrap: true,
                            label: label,
                            setup: (self: any) => timeout(1, () => {
                                self.set_ellipsize(Pango.EllipsizeMode.END)
                                self.set_line_wrap(true)
                            }),
                        }),
                    ],
                }),
            handleClick: async (button: any, _event: any) => {
                app.launch([], null)
                arradd(button, "nier-button-box-selected")
                await new Promise(r => setTimeout(r, 500))
                arrremove(button, "nier-button-box-selected")
                arradd(button, "nier-button-box-hover-from-selected")
                await new Promise(r => setTimeout(r, 500))
                arrremove(button, "nier-button-box-hover-from-selected")
                closeSettings()
            },
        })

    const scrollable = Scrollable({
        vscroll: "always",
        hscroll: "never",
        hexpand: true,
        hpack: "fill",
        className: "app-launcher-scroll",
        css: `min-height: ${Math.round(SCREEN_HEIGHT * 0.24)}px;`,
        child: Box({
            vertical: true,
            children: [
                NierButtonGroup({
                    buttons: initial.map(makeAppButton),
                    setup: (self: any) => {
                        timeout(1, () => { entryWidget.grab_focus() })
                        const unsub = allApps.subscribe(() => {
                            const btn_box2 = self.children[1]
                            if (btn_box2) btn_box2.children = allApps.get().map(makeAppButton)
                        })
                        self.connect("destroy", unsub)
                    },
                }),
            ],
        }),
    })

    return Box({
        vertical: true,
        className: "app-launcher",
        children: [entryWidget, scrollable],
    })
}
