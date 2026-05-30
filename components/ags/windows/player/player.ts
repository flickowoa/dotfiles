import { App, Box, Window, Anchor, Layer, Exclusivity } from "../../widget.ts"
import { NowPlaying, cavaStart, cavaStop } from "./nowplaying.ts"
import { RevealBox, type Reveal } from "../../nier/anim.ts"

import { mpris } from "../../lib/mpris.ts"

let _win: any = null
let _content: any = null
let _reveal: Reveal | null = null

export const togglePlayer = () => {
    if (!_win) return
    if (_win.visible) {
        _reveal?.close(() => { _win.visible = false })
    } else {
        _win.visible = true
        _reveal?.open()
    }
}

export const PlayerWindow = () => {
    _content = Box({
        className: "player-content",
        child: NowPlaying(),
    })
    _reveal = RevealBox(_content)

    _win = Window({
        name: "player",
        className: "player",
        margin: [0, 0, 0, 0],
        anchor: Anchor.RIGHT,
        exclusivity: Exclusivity.IGNORE,
        layer: Layer.TOP,
        focusable: false,
        visible: false,                 // stays hidden until togglePlayer()
        child: _reveal.container,
        setup: (self: any) => {
            _win = self
            // start/stop cava with the window - this catches both togglePlayer and
            // the closeall path, so the visualiser only eats cpu while its on screen
            self.connect("notify::visible", () => self.visible ? cavaStart() : cavaStop())
            // no auto-show, the player only opens on Alt+Super+O (which hits
            // togglePlayer via the ags socket)
            void mpris   // keep the mpris binding alive for nowplaying.ts
        },
    })
    return _win
}
