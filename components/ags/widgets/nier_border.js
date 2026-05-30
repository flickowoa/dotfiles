import { Widget } from "../imports.js"
import { button_pointer_size, nier_border_size } from "../scaling.js";

import { SCREEN_WIDTH, get_cursor, assetsDir, SCREEN_HEIGHT } from "../util.js"

const { Box, Icon,Scrollable } = Widget

const { round,abs } = Math

export const NierBorder = ({
    icon_width = nier_border_size,
    ratio = 0.5,
    y_axis = false,
    ...props
}) => Scrollable({
    ...props,
    // hexpand: false,
    css: `min-width: ${100}px;min-height: ${round(icon_width/3)}px;`,
    // hscroll: "always",
    child:Box({
        children: Array.from({length: SCREEN_WIDTH/icon_width + 1},(_,i) => Icon({
            icon: assetsDir() + "/nier-border-full.svg",
            size: icon_width,
        })),
        connections: [
            [
                100,
                (self) => {
                    get_cursor()
                        .then((cursor) => {
                            let [x,y] = cursor;
                            if (y_axis) {
                                ratio = y / SCREEN_HEIGHT;
                            } else {
                                ratio = x / SCREEN_WIDTH;
                            }
                            let child_index = round((SCREEN_WIDTH/icon_width) * ratio);
                            // print("child index",child_index)
                            self.children.forEach((child,j) => {
                                if (abs(j-child_index) <= 1) {
                                    if (child.icon == assetsDir() + "/nier-border-full.svg") {
                                        return;
                                    }
                                    child.icon = assetsDir() + "/nier-border-full.svg";
                                } else {
                                    if (child.icon == assetsDir() + "/nier-border.svg") {
                                        return;
                                    }
                                    child.icon = assetsDir() + "/nier-border.svg";
                                }
                            })
                    })
                    .catch((e) => {
                        print(e)
                    })
                },
            ]
        ]
    })
});