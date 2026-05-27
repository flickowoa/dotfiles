import { App, Window, Label, EventBox, Box, Overlay, Scrollable, Anchor, Layer, Exclusivity, Keymode } from "../../widget.ts"
import Gdk from "gi://Gdk?version=3.0"
import { timeout } from "astal"
import {
    arradd, arrremove, hasclass,
    assetsDir as parentAssetsDir,
    dark, SCREEN_WIDTH, SCREEN_HEIGHT, get_cursor, YORHA_DIR,
} from "../../env.ts"
import { NierButtonGroup, NierButton } from "../../nier/buttons.ts"
import { settings_title_bottom, settings_title_top } from "../../scaling.ts"
import { BluetoothGroup } from "../../widgets/bluetooth_group.ts"
import { Info } from "../../widgets/info.ts"
import { VolumeGroup } from "../../widgets/volume_group.ts"
import { WifiGroup } from "../../widgets/wifi_group.ts"
import { AppLauncher } from "./applauncher.ts"
import { PowerGroup } from "../../widgets/power_menu.ts"
import { bindSettingsController } from "./control.ts"
import { RailTab, MENU_FONT, menuPalette } from "../../nier/menu.ts"
import { showSettingsBg, hideSettingsBg } from "../settingsbg/settingsbg.ts"

const SETTINGS_MARGIN_TOP = 74
const SETTINGS_MARGIN_LEFT = 0
const SETTINGS_MARGIN_BOTTOM = 18
const SETTINGS_ROOT_W = Math.min(Math.round(SCREEN_WIDTH * 0.24), 430)
const SETTINGS_SUB_W = Math.min(Math.round(SCREEN_WIDTH * 0.34), 620)
const SETTINGS_PANEL_H = SCREEN_HEIGHT - SETTINGS_MARGIN_TOP - SETTINGS_MARGIN_BOTTOM
const SETTINGS_BG_LEAD_MS = 60
const SETTINGS_REVEAL_MS = 220
const SETTINGS_STRIP_W = 74
const SETTINGS_HEADING_TOP = Math.round(settings_title_top * 0.55)
const SETTINGS_HEADING_BOTTOM = Math.round(settings_title_bottom * 0.45)
const SETTINGS_HEADING_CSS = `margin-top:${SETTINGS_HEADING_TOP}px;margin-bottom:${SETTINGS_HEADING_BOTTOM}px;font-size:28px;padding-left:12px;`
const SETTINGS_BUTTON_FONT = 15
const ROOT_PAGE_CSS = `min-width:${SETTINGS_ROOT_W}px;min-height:${SETTINGS_PANEL_H}px;`
const SUB_PAGE_CSS = `min-width:${SETTINGS_SUB_W}px;min-height:${SETTINGS_PANEL_H}px;`

interface Reveal {
    container: any
    open: () => void
    close: (done: () => void) => void
}

const settingsRevealBox = (panel: any): Reveal => {
    const stripCss = (left: number, alpha: number) => {
        const p = menuPalette()
        return `
            min-width:${SETTINGS_STRIP_W}px;
            min-height:${SETTINGS_PANEL_H}px;
            margin-left:${left}px;
            background:rgba(${p.fg},0.94);
            opacity:${alpha};
            transition: margin-left ${SETTINGS_REVEAL_MS}ms cubic-bezier(0.15,0.79,0,1),
                        opacity ${SETTINGS_REVEAL_MS}ms ease;
        `
    }
    const wrapperStart = () => "opacity:0;margin-left:34px;"
    const wrapperOpen = () =>
        `opacity:1;margin-left:0;transition: margin-left ${SETTINGS_REVEAL_MS}ms cubic-bezier(0.15,0.79,0,1), opacity 160ms ease-out;`
    const wrapperClose = () =>
        `opacity:0;margin-left:30px;transition: margin-left ${SETTINGS_REVEAL_MS}ms cubic-bezier(.48,.09,.82,-0.12), opacity 140ms ease-in;`

    const strip = Box({
        hexpand: false,
        vexpand: false,
        hpack: "start",
        vpack: "start",
        css: stripCss(0, 0),
    })
    const wrapper = Box({
        hexpand: false,
        vexpand: false,
        hpack: "start",
        vpack: "start",
        child: panel,
        css: wrapperStart(),
    })
    const overlay = Overlay({
        hexpand: false,
        vexpand: false,
        hpack: "start",
        vpack: "start",
        pass_through: true,
        child: wrapper,
        overlays: [],
    })

    return {
        container: overlay,
        open: () => {
            overlay.overlays = [strip]
            wrapper.css = wrapperStart()
            strip.css = stripCss(0, 0.92)
            timeout(10, () => {
                wrapper.css = wrapperOpen()
                strip.css = stripCss(SETTINGS_STRIP_W + 22, 0)
                timeout(SETTINGS_REVEAL_MS, () => {
                    overlay.overlays = []
                    wrapper.css = ""
                })
            })
        },
        close: (done: () => void) => {
            overlay.overlays = [strip]
            wrapper.css = ""
            strip.css = stripCss(SETTINGS_STRIP_W + 22, 0)
            timeout(10, () => {
                wrapper.css = wrapperClose()
                strip.css = stripCss(0, 0.92)
                timeout(SETTINGS_REVEAL_MS, () => {
                    overlay.overlays = []
                    wrapper.css = wrapperStart()
                    strip.css = stripCss(0, 0)
                    done()
                })
            })
        },
    }
}

const widgetChild = (w: any): any =>
    w?.get_child?.() ?? w?.child ?? w?.get_children?.()?.[0] ?? null

const widgetChildren = (w: any): any[] =>
    w?.get_children?.() ?? w?.children ?? []

const groupShell = (group: any): any => widgetChild(group)
const groupButtonsBox = (group: any): any => widgetChildren(groupShell(group))[1] ?? null
const pageWidth = (page: number) => page === 0 ? SETTINGS_ROOT_W : SETTINGS_SUB_W

const sidebarItem = (label: string, active: () => boolean, onClick: (self: any) => void) => {
    const text = Label({ label, xalign: 0, css: `font-family:${MENU_FONT};font-size:14px;letter-spacing:1px;` })
    const tab = RailTab({
        content: text,
        hexpand: false,
        square: true,
        squareSize: 13,
        bodyPadding: "6px 14px",
        getActive: active,
        onSingle: () => onClick(tab.box),
    })
    tab.box.set_size_request(SETTINGS_ROOT_W - 96, -1)
    return Box({
        hpack: "start",
        css: "margin-left: 14px; margin-right: 14px;",
        children: [tab.box],
    })
}


const ensure_only_selected = (button: any, page_button: any) => {
    if (button === page_button) return button
    const box = button?.child
    const container = button?.parent
    if (box) arradd(box, "nier-button-box-selected")
    if (container) arradd(container, "nier-button-container-selected")
    if (page_button && page_button !== button) {
        remove_selected(page_button).catch(console.error)
    }
    return button ?? null
}

const remove_selected = async (button: any) => {
    if (!button) return
    const box = button?.child
    const container = button?.parent
    if (hasclass(box, "nier-button-box-selected")) {
        arrremove(box, "nier-button-box-selected")
        arrremove(container, "nier-button-container-selected")
        arradd(box, "nier-button-box-hover-from-selected")
        arradd(container, "nier-button-container-hover-from-selected")
        await new Promise(r => setTimeout(r, 500))
        arrremove(box, "nier-button-box-hover-from-selected")
        arrremove(container, "nier-button-container-hover-from-selected")
    }
}

const bgShow = () => {
    const bg = App.get_window("bg_settings")
    if (bg) bg.visible = true
}

const bgHide = () => {
    const bg = App.get_window("bg_settings")
    if (bg) bg.visible = false
}

const NierSettingPane = () => {
    let current_page = 0
    let CLICK_TIMEOUT = false
    let page1_selected: any = null
    let page2_selected: any = null
    let page3_selected: any = null
    let rootPage = ""
    let _win: any = null
    let _reveal: Reveal | null = null
    let _closing = false
    let _opening = false
    let _openSeq = 0

    let panes: any[] = []

    const containerBox = Box({
        hexpand: false,
        vexpand: false,
        hpack: "start",
        vpack: "start",
        className: "nier-settings-container",
        css: `min-height:${SETTINGS_PANEL_H}px;`,

        setup: (self: any) => timeout(1, () => {
            dark.subscribe(() => {
                self.css = `min-height:${SETTINGS_PANEL_H}px;`
            })

            const go_page2 = async (buttons: any[], parent_button: any) => {
                page1_selected = ensure_only_selected(parent_button, page1_selected)
                const page2Box = groupButtonsBox(page2)
                if (page2Box) page2Box.children = buttons
                arradd(groupShell(page4), "closing")
                arradd(groupShell(page3), "closing")
                arrremove(groupShell(page2), "closing")
                current_page = 1
            }

            const go_page3 = async (buttons: any[], parent_button: any) => {
                page2_selected = ensure_only_selected(parent_button, page2_selected)
                const page3Box = groupButtonsBox(page3)
                if (page3Box) page3Box.children = buttons
                arradd(groupShell(page4), "closing")
                arrremove(groupShell(page3), "closing")
                current_page = 2
            }

            const go_page4 = async (buttons: any[], parent_button: any) => {
                page3_selected = ensure_only_selected(parent_button, page3_selected)
                const page4Box = groupButtonsBox(page4)
                if (page4Box) page4Box.children = buttons
                arrremove(groupShell(page4), "closing")
                current_page = 3
            }

            const page4 = NierButtonGroup({
                hexpand: false, vexpand: false, hpack: "start", vpack: "start",
                css: SUB_PAGE_CSS,
                containerClassName: "nier-settings-4-container closing",
                className: "nier-settings-1",
                buttons: [
                    NierButton({
                        useAssetsDir: parentAssetsDir,
                        label: "4",
                        handleClick: async () => { closeAnimated() },
                    }),
                ],
            })

            const page3 = NierButtonGroup({
                hexpand: false, vexpand: false, hpack: "start", vpack: "start",
                css: SUB_PAGE_CSS,
                containerClassName: "nier-settings-3-container closing",
                className: "nier-settings-1",
                buttons: [],
            })

            const page2 = NierButtonGroup({
                hexpand: false, vexpand: false, hpack: "start", vpack: "start",
                css: SUB_PAGE_CSS,
                containerClassName: "nier-settings-2-container closing",
                className: "nier-settings-1",
                buttons: [],
            })

            const page1 = NierButtonGroup({
                css: ROOT_PAGE_CSS,
                containerClassName: "nier-settings-1-container",
                className: "nier-settings-1",
                setup: (self: any) => {
                    const setBg = () => {
                        self.css = ROOT_PAGE_CSS +
                            `background:url("${dark.get() ? YORHA_DIR + '/wallpapers/nier_dark.png' : YORHA_DIR + '/wallpapers/nier_light.png'}") no-repeat;` +
                            `background-size: cover;`
                    }
                    setBg()
                    dark.subscribe(setBg)
                },
                buttons: [
                    Label({ hpack: "start", label: "SYSTEM", css: SETTINGS_HEADING_CSS, className: "heading" }),
                    sidebarItem("Sound", () => rootPage === "sound", async (self: any) => {
                        rootPage = "sound"
                        page1_selected = self
                        await go_page2(VolumeGroup({ go_to: go_page3, passAssetsDir: parentAssetsDir }), self)
                    }),
                    sidebarItem("Wi-Fi", () => rootPage === "wifi", async (self: any) => {
                        rootPage = "wifi"
                        page1_selected = self
                        await go_page2(WifiGroup({ passAssetsDir: parentAssetsDir }), self)
                    }),
                    sidebarItem("Bluetooth", () => rootPage === "bluetooth", async (self: any) => {
                        rootPage = "bluetooth"
                        page1_selected = self
                        await go_page2(BluetoothGroup({ go_to: go_page3, passAssetsDir: parentAssetsDir }), self)
                    }),
                    sidebarItem("Power", () => rootPage === "power", async (self: any) => {
                        rootPage = "power"
                        page1_selected = self
                        await go_page2(PowerGroup({ passAssetsDir: parentAssetsDir }), self)
                    }),
                    Label({ css: SETTINGS_HEADING_CSS, hpack: "start", label: "APPS", className: "heading" }),
                    AppLauncher({ assetsDir: parentAssetsDir }),
                    Info({ useAssetsDir: parentAssetsDir }),
                ],
            })

            panes = [page1, page2, page3, page4]

            self.children = panes.map(p =>
                Scrollable({
                    css: p === page1 ? ROOT_PAGE_CSS : SUB_PAGE_CSS,
                    vscroll: "automatic",
                    hscroll: "never",
                    child: p,
                })
            )
        }),

        connections: [] as any,
    })

    const navigate_back = async () => {
        try {
            if (current_page === 0) {
                closeAnimated()
                return
            }
            const next_page = groupShell(panes[current_page])
            const now_buttons = groupButtonsBox(panes[current_page - 1])?.children ?? []

            arradd(next_page, "closing")
            switch (current_page) {
                case 1: page1_selected = ensure_only_selected(null, page1_selected); break
                case 2: page2_selected = ensure_only_selected(null, page2_selected); break
                case 3: page3_selected = ensure_only_selected(null, page3_selected); break
            }
            if (current_page === 1) rootPage = ""

            for (const _button of now_buttons) {
                if (hasclass(_button, "nier-button-container")) {
                    const button = widgetChildren(widgetChild(_button))[1]
                    await remove_selected(button).catch(console.error)
                }
            }
            current_page--
        } catch (e) {
            console.error("EEEER", e)
            closeAnimated()
        }
    }

    const openAnimated = () => {
        if (_opening || _win?.visible) return
        _opening = true
        const seq = ++_openSeq
        current_page = 0
        for (const selected of [page1_selected, page2_selected, page3_selected]) {
            remove_selected(selected).catch(console.error)
        }
        page1_selected = null
        page2_selected = null
        page3_selected = null
        rootPage = ""
        for (const pane of panes.slice(1)) {
            arradd(groupShell(pane), "closing")
        }
        arrremove(groupShell(panes[0]), "closing")
        showSettingsBg().catch(print)
        timeout(SETTINGS_BG_LEAD_MS, () => {
            if (_closing || !_opening || seq !== _openSeq) return
            if (!_win?.visible) _win.visible = true
            _reveal?.open()
            _opening = false
        })
    }

    const closeAnimated = () => {
        if (_opening) {
            _opening = false
            _openSeq++
            hideSettingsBg().catch(print)
            return
        }
        if (_closing || !_win?.visible) return
        _closing = true
        _reveal?.close(() => {
            if (_win) _win.visible = false
            _closing = false
            hideSettingsBg().catch(print)
        })
    }

    _reveal = settingsRevealBox(containerBox)

    _win = Window({
        name: "settings",
        className: "settings",
        margin: [SETTINGS_MARGIN_TOP, 0, 0, 0],
        anchor: Anchor.TOP | Anchor.LEFT | Anchor.RIGHT | Anchor.BOTTOM,
        exclusivity: Exclusivity.IGNORE,
        layer: Layer.OVERLAY,
        visible: false,
        keymode: Keymode.ON_DEMAND,
        setup: (self: any) => timeout(1, () => {
            self.connect("key-press-event", async (_widget: any, event: any) => {
                if (event.get_keyval()[1] === Gdk.KEY_Escape) {
                    await navigate_back()
                }
                return false
            })
        }),
        child: EventBox({
            setup: (self: any) => self.connect("button-press-event", async () => {
                if (CLICK_TIMEOUT) return
                CLICK_TIMEOUT = true
                timeout(300, () => { CLICK_TIMEOUT = false })
                const [x] = await get_cursor()
                let boundary = SETTINGS_MARGIN_LEFT
                for (let i = 0; i <= current_page; i++) boundary += pageWidth(i)
                if (x <= boundary) return
                await navigate_back()
            }),
            child: Overlay({
                child: Box({
                    child: Box({}),
                    css: `min-width:${SCREEN_WIDTH}px;min-height:${SCREEN_HEIGHT}px;`,
                }),
                overlays: [Box({
                    css: `margin-left:${SETTINGS_MARGIN_LEFT}px;`,
                    hpack: "start",
                    vpack: "start",
                    child: _reveal.container,
                })],
            }),
        }),
    })

    bindSettingsController({
        toggle: () => { (_win?.visible ? closeAnimated : openAnimated)() },
        open: openAnimated,
        close: closeAnimated,
        isOpen: () => !!_win?.visible,
    })

    return _win
}

export const SettingsWindow = NierSettingPane
