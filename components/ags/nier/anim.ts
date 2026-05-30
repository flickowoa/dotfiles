import { Box, EventBox, Overlay } from "../widget.ts"
import { timeout } from "astal"

export interface Reveal { container: any; open: () => void; close: (done: () => void) => void }

const PHASE_MS = 300
const OPEN_SHIFT = 36

const showStartCss = () => "opacity: 0; margin-left: 36px;"
const showMidCss = () =>
    `opacity: 1; margin-left: 0; transition: margin-left ${PHASE_MS}ms cubic-bezier(0.15,0.79,0,1), opacity 180ms ease-out;`
const hideCss = () =>
    `opacity: 0; margin-left: ${OPEN_SHIFT}px; transition: margin-left ${PHASE_MS}ms cubic-bezier(.48,.09,.82,-0.12), opacity 180ms ease-in;`

export const RevealBox = (panel: any): Reveal => {
    const hider = EventBox({
        className: "notify-card-hider",
        hexpand: false,
        vexpand: false,
        hpack: "start",
        vpack: "start",
    })
    const wrapper = Box({
        hexpand: false,
        vexpand: false,
        hpack: "start",
        vpack: "start",
        child: panel,
        css: showStartCss(),
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

    const resetHider = () => {
        for (const cls of ["enter", "enter-phase-2", "leave", "leave-phase-2"]) {
            hider.toggleClassName(cls, false)
        }
    }

    const ensureHider = () => {
        overlay.overlays = [hider]
        overlay.show_all()
    }

    const finishOpen = () => {
        overlay.overlays = []
        resetHider()
        wrapper.css = ""
    }

    return {
        container: overlay,
        open: () => {
            resetHider()
            ensureHider()
            wrapper.css = showStartCss()
            timeout(10, () => {
                hider.toggleClassName("enter", true)
                wrapper.css = showMidCss()
                timeout(PHASE_MS, () => {
                    hider.toggleClassName("enter-phase-2", true)
                    timeout(PHASE_MS, finishOpen)
                })
            })
        },
        close: (done: () => void) => {
            resetHider()
            ensureHider()
            wrapper.css = ""
            timeout(10, () => {
                hider.toggleClassName("leave", true)
                timeout(PHASE_MS, () => {
                    hider.toggleClassName("leave-phase-2", true)
                    wrapper.css = hideCss()
                    timeout(PHASE_MS, () => {
                        overlay.overlays = []
                        resetHider()
                        wrapper.css = showStartCss()
                        done()
                    })
                })
            })
        },
    }
}
