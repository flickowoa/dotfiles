import {
  SystemTray,
  App,
  Widget,
  Utils,
} from "../imports.js";
import { NierButton } from "../nier/buttons.js";

import { assetsDir,dark } from "../util.js";

const { Box, Label, Icon, Button } = Widget;
const { execAsync } = Utils;

function capitalize_first_letter(val) {
  return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}

const SysTray = () =>
  Box({
    hpack: "end",
    hexpand: true,
    classNames: ["sys-tray"],
    connections: [
      [
        SystemTray,
        (self) => {
          self.children = SystemTray.items.map((item) =>
            Button({
              classNames: ["sys-tray-item"],

              child: Icon({ binds: [["icon", item, "icon"]], size: 32 }),
              onPrimaryClick: (_, event) => item.activate(event),
              onSecondaryClick: (_, event) => item.openMenu(event),
              binds: [["tooltip-markup", item, "tooltip-markup"]],
            })
          );
        },
      ],
    ],
  });

export const Info = ({
  useAssetsDir = assetsDir,
  parentDir = App.configDir
}) =>
  Box({
    vpack: "end",
    vexpand: true,
    classNames: ["info"],
    css: `margin-bottom: 30px;`,
    children: [
      Label({
        css: "margin-left:35px;margin-right:50px;",
        classNames: ["time"],
        label: "00:00",
        connections: [
          [
            1000,
            (self) =>
              execAsync(["date", "+%I:%M"])
                .then((date) => (self.label = date))
                .catch(console.error),
          ],
        ],
      }),
      NierButton({
        useAssetsDir,
        label:capitalize_first_letter(dark.value?"dark":"light"),
        handleClick: async (self,event) => {
          execAsync(`ags -b settings -r App.closeWindow("settings")`)
          execAsync(`ags -b bg_settings -r App.closeWindow("bg_settings")`).catch(print).then(print)
          Utils.timeout(1100, () => {
            execAsync(`ags -b bg_settings -q`).catch(print).then(print)
          })      
          await new Promise((r) => {setTimeout(r,1000)})
          execAsync(`ags -b banner -c ${parentDir + "/windows/banner/banner.js"}`)
        }
      })
      // SysTray(),
    ],
  });
