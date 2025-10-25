import { Widget, App, Utils } from "../../imports.js";
import { NierButtonGroup, NierButton } from "../../nier/buttons.js";
import { settings_title_bottom, settings_title_top } from "../../scaling.js";
import { SCREEN_WIDTH, SCREEN_HEIGHT, arradd, arrremove, get_cursor, css} from "../../util.js";
import { BluetoothGroup } from "../../widgets/bluetooth_group.js";
import { Info } from "../../widgets/info.js";

import { VolumeGroup } from "../../widgets/volume_group.js";
import { WifiGroup } from "../../widgets/wifi_group.js";
import { AppLauncher } from "./applauncher.js";
import { PowerGroup } from "../../widgets/power_menu.js";


const { Window, Label, EventBox, Box, Overlay, Scrollable } = Widget;
const { execAsync } = Utils;

const { Gdk } = imports.gi;

const parentConfigDir = App.configDir.split("/").slice(0,-2).join("/");

const parentAssetsDir = () => `${parentConfigDir}/assets/${dark.value ? "dark" : "light"}`;
const themedir = parentConfigDir.split("/").slice(0, -2).join("/");

const volume_page = (
  go_to = (buttons, parent_button) => {
    return [];
  }
) => {
  return VolumeGroup({go_to,passAssetsDir:parentAssetsDir});
};

const wifi_page = (go_to = (button) => {}) => {
  return WifiGroup({go_to,passAssetsDir:parentAssetsDir});
};

const bluetooth_page = (
  go_to = (buttons, parent_button) => {
    return [];
  }
) => {
  return BluetoothGroup({go_to,passAssetsDir:parentAssetsDir});
};

const power_page = (go_to = (button) => {}) => {
  return PowerGroup({go_to,passAssetsDir:parentAssetsDir});
};

const ensure_only_selected = (button, page_button) => {
  if (button == page_button) {
    return button;
  }
  if (button) {
    button.child.classNames = arradd(
      button.child.classNames,
      "nier-button-box-selected"
    );
    button.parent.classNames = arradd(
      button.parent.classNames,
      "nier-button-container-selected"
    );
  }
  if (page_button) {
    Promise.resolve(
      remove_selected(page_button).catch((e) => {
        console.log(e);
      })
    );
  }
  return button;
};

const remove_selected = async (button) => {
  console.log(button.classNames);
  if (button.child.classNames.includes("nier-button-box-selected")) {
    button.child.classNames = arrremove(
      button.child.classNames,
      "nier-button-box-selected"
    );
    button.parent.classNames = arrremove(
      button.parent.classNames,
      "nier-button-container-selected"
    );
    button.child.classNames = arradd(
      button.child.classNames,
      "nier-button-box-hover-from-selected"
    );
    button.parent.classNames = arradd(
      button.parent.classNames,
      "nier-button-container-hover-from-selected"
    );
    await new Promise((resolve) => {
      setTimeout(resolve, 500);
    });
    button.child.classNames = arrremove(
      button.child.classNames,
      "nier-button-box-hover-from-selected"
    );
    button.parent.classNames = arrremove(
      button.parent.classNames,
      "nier-button-container-hover-from-selected"
    );
  }
};

const NierSettingPane = (
  current_page = 0,
  CLICK_TIMEOUT = false,
  page1_selected = null,
  page2_selected = null,
  page3_selected = null,

  panes_container = Box({
    hexpand: false,
    vexpand: false,
    hpack: "start",
    vpack: "start",
    classNames: ["nier-settings-container"],
    css: `min-width: ${SCREEN_WIDTH}px;min-height: ${SCREEN_HEIGHT}px;background-position: ${SCREEN_WIDTH*.5-960/2}px ${SCREEN_HEIGHT/2-720/2}px;background: url("${parentAssetsDir()}/glory-ghost.png") no-repeat center;`, // 960x720 is the image(glory-brown-ghost.png) res

    setup: (self) =>
      Utils.timeout(1, () => {
        dark.connect("changed",() => {
          self.css = `min-width: ${SCREEN_WIDTH}px;min-height: ${SCREEN_HEIGHT}px;background-position: ${SCREEN_WIDTH*.5-960/2}px ${SCREEN_HEIGHT/2-720/2}px;background: url("${parentAssetsDir()}/glory-ghost.png") no-repeat center;`; // 960x720 is the image(glory-brown-ghost.png) res
        });

        execAsync(`ags -b bg_settings -q`).then(() => {
          Utils.timeout(10, () => {
            execAsync(`ags -b bg_settings -c ${parentConfigDir}/windows/settingsbg/settingsbg.js`)   
          })
        })   

        let page4 = NierButtonGroup({
          hexpand: false,
          vexpand: false,
          hpack: "start",
          vpack: "start",
          css: `min-width: ${SCREEN_WIDTH / 4}px;min-height: ${SCREEN_HEIGHT}px`,
          containerClassNames: ["nier-settings-4-container", "closing"],
          classNames: ["nier-settings-1"],

          buttons: [
            NierButton({
              useAssetsDir: parentAssetsDir,
              label: "4",
              handleClick: async (button, event) => {
                App.toggleWindow("settings");
              },
            }),
          ],
        });

        let page3 = NierButtonGroup({
          hexpand: false,
          vexpand: false,
          hpack: "start",
          vpack: "start",
          css: `min-width: ${SCREEN_WIDTH / 4}px;min-height: ${SCREEN_HEIGHT}px`,
          containerClassNames: ["nier-settings-3-container", "closing"],
          classNames: ["nier-settings-1"],

          buttons: [],
        });

        let page2 = NierButtonGroup({
          hexpand: false,
          vexpand: false,
          hpack: "start",
          vpack: "start",
          css: `min-width: ${SCREEN_WIDTH / 4}px;min-height: ${SCREEN_HEIGHT}px`,
          containerClassNames: ["nier-settings-2-container", "closing"],
          classNames: ["nier-settings-1"],

          buttons: [],
        });

        let go_page2 = async (buttons, parent_button) => {
          page1_selected = ensure_only_selected(
            parent_button,
            page1_selected
          );
          page2.child.children[1].children = buttons;
          page4.child.classNames = arradd(
            page4.child.classNames,
            "closing"
          );
          page3.child.classNames = arradd(
            page3.child.classNames,
            "closing"
          );
          page2.child.classNames = arrremove(
            page2.child.classNames,
            "closing"
          );

          current_page = 1;
        };
        let go_page3 = async (buttons, parent_button) => {
          page2_selected = ensure_only_selected(
            parent_button,
            page2_selected
          );
          page3.child.children[1].children = buttons;
          page4.child.classNames = arradd(
            page4.child.classNames,
            "closing"
          );
          page3.child.classNames = arrremove(
            page3.child.classNames,
            "closing"
          );

          current_page = 2;
        };
        let go_page4 = async (buttons, parent_button) => {
          page3_selected = ensure_only_selected(
            parent_button,
            page3_selected
          );
          page4.child.children[1].children = buttons;
          page4.child.classNames = arrremove(
            page4.child.classNames,
            "closing"
          );

          current_page = 3;
        };

        let page1 = NierButtonGroup({
          css: `min-width: ${SCREEN_WIDTH / 4}px;min-height: ${SCREEN_HEIGHT}px;`, // also expands other panes so the bottom part dont glicth out
          containerClassNames: ["nier-settings-1-container"],
          classNames: ["nier-settings-1"],
          connections:[
            [dark, (self) => {
              self.css = `min-width: ${SCREEN_WIDTH / 4}px;min-height: ${SCREEN_HEIGHT}px;background: url("${dark.value?themedir + '/wallpapers/nier_dark.png':themedir + '/wallpapers/nier_light.png'}")`; // also expands other panes so the bottom part dont glicth out
            },"changed"]
          ],

          buttons: [
            Label({
              hpack: "start",
              label: "SYSTEM",
              css:`margin-top: ${settings_title_top}px;margin-bottom: ${settings_title_bottom}px;`,
              classNames: ["heading"],
            }),
            NierButton({
              useAssetsDir: parentAssetsDir,
              font_size: 30,
              label: "Sound",
              handleClick: async (self, event) => {
                page1_selected = ensure_only_selected(self, page1_selected);
                await go_page2(volume_page(go_page3), self).catch((e) => {
                  console.log(e);
                });
              },
            }),
            NierButton({
              useAssetsDir: parentAssetsDir,
              font_size: 30,
              label: "Wi-Fi",
              handleClick: async (self, event) => {
                await go_page2(wifi_page(), self).catch((e) => {
                  console.log(e);
                });
              },
            }),
            NierButton({
              useAssetsDir: parentAssetsDir,
              font_size: 30,
              label: "Bluetooth",
              handleClick: async (self, event) => {
                await go_page2(bluetooth_page(go_page3), self).catch(
                  (e) => {
                    console.log(e);
                  }
                );
              },
            }),
            NierButton({
              useAssetsDir: parentAssetsDir,
              font_size: 30,
              label: "Power",
              handleClick: async (self, event) => {
                await go_page2(power_page(), self).catch((e) => {
                  console.log(e);
                });
              },
            }),
            Label({
              css:`margin-top: ${settings_title_top}px;margin-bottom: ${settings_title_bottom}px;`,
              hpack: "start",
              label: "APPS",
              classNames: ["heading"],
            }),
            AppLauncher({assetsDir:parentAssetsDir}),
            Info({useAssetsDir:parentAssetsDir,parentDir:parentConfigDir}),
          ],
        });
        self.pages = [page1, page2, page3, page4];
        self.children = [
          Scrollable({
            css: `min-width: ${SCREEN_WIDTH / 4}px;min-height: ${SCREEN_HEIGHT}px;`,
            child:page1
          }),
          Scrollable({
            css: `min-width: ${SCREEN_WIDTH / 4}px;min-height: ${SCREEN_HEIGHT}px;`,
            child:page2
          }),
          Scrollable({
            css: `min-width: ${SCREEN_WIDTH / 4}px;min-height: ${SCREEN_HEIGHT}px;`,
            child:page3
          }),
          Scrollable({
            css: `min-width: ${SCREEN_WIDTH / 4}px;min-height: ${SCREEN_HEIGHT}px;`,
            child:page4
          }),
        ];
      }),
    connections: [
      [
        App,
        (self, windowName, visible) => {
          if (windowName ==  "settings") {
            print("visibility",visible)
            let containers = Array.from(self.pages).map((child) => {
              // print(child.child)
              return child.child;
            });

            if (!visible) {
              containers.forEach((container) => {
                container.classNames = arradd(
                  container.classNames,
                  "closing"
                );
              });
              print("closingbg")
              execAsync(`ags -b bg_settings -r App.closeWindow("bg_settings")`).catch(print).then(print)
              Utils.timeout(1100, () => {
                execAsync(`ags -b bg_settings -q`).catch(print).then(print)
              })              
              self.classNames = arrremove(self.classNames, "opening");
              self.classNames = arradd(self.classNames, "closing");
            } else {
              print("openingbg")
              execAsync(`ags -b bg_settings -q`).then(() => {
                Utils.timeout(100, () => {
                  execAsync(`ags -b bg_settings -c ${parentConfigDir}/windows/settingsbg/settingsbg.js`)   
                })
              })   
              
              self.classNames = arradd(self.classNames, "closing");
                Utils.timeout(500, () => {
                  self.classNames = arradd(self.classNames, "opening");
                  containers[0].classNames = arrremove(
                    containers[0].classNames,
                    "closing"
                );
                self.classNames = arrremove(self.classNames, "closing");
              })

            }
        }},
        "window-toggled",
      ],
    ],
  })
) =>
  Window({
    name: "settings",
    classNames: ["settings"],
    margin: [0, 0, 0, 0],
    anchor: ["top", "left", "bottom"],
    exclusivity: "ignore",
    layer: "overlay",
    visible: true,
    keymode: "exclusive",
    
    setup: (self) =>
      Utils.timeout(1, () => {
        self.connect("key-press-event", (widget, event) => {
          if (event.get_keyval()[1] == Gdk.KEY_Escape) {
            try {
              if (current_page == 0) {
                App.toggleWindow("settings");
              } else {
                let next_page = panes_container.pages[current_page].child;
                let now_page = panes_container.pages[current_page - 1].child;
                let now_buttons = now_page.children[1].children;
                next_page.classNames = arradd(next_page.classNames, "closing");
                switch (current_page) {
                  case 1:
                    page1_selected = ensure_only_selected(null, page1_selected);
                    break;
                  case 2:
                    page2_selected = ensure_only_selected(null, page2_selected);
                    break;
                  case 3:
                    page3_selected = ensure_only_selected(null, page3_selected);
                    break;
                }
                now_buttons.forEach(async (_button) => {
                  if (_button.classNames.includes("nier-button-container")) {
                    let button = _button.child.children[1];
                    await remove_selected(button).catch((e) => {
                      console.log(e);
                    });
                  }
                });
                current_page = current_page - 1;
              }
            } catch (e) {
              console.log("EEEEEEEEEEEER", e);
              App.toggleWindow("settings");
            }
          }
          return false;
        });
      }),
    child: EventBox({
      on_primary_click: async (self, event) => {
        if (CLICK_TIMEOUT) {
          return;
        }
        CLICK_TIMEOUT = true;
        Utils.timeout(300, () => {
          CLICK_TIMEOUT = false;
        });
        let [x, _] = await get_cursor();
        print("cursor press", x, current_page);
        if (x <= (SCREEN_WIDTH / 4) * (current_page + 1)) {
          return;
        }
        try {
          if (current_page == 0) {
            App.toggleWindow("settings");
          } else {
            let next_page = panes_container.pages[current_page].child;
            let now_page = panes_container.pages[current_page - 1].child;

            let now_buttons = now_page.children[1].children;
            next_page.classNames = arradd(next_page.classNames, "closing");
            switch (current_page) {
              case 1:
                page1_selected = ensure_only_selected(null, page1_selected);
                break;
              case 2:
                page2_selected = ensure_only_selected(null, page2_selected);
                break;
              case 3:
                page3_selected = ensure_only_selected(null, page3_selected);
                break;
            }
            now_buttons.forEach(async (_button) => {
              if (_button.classNames.includes("nier-button-container")) {
                let button = _button.child.children[1];
                await remove_selected(button).catch((e) => {
                  console.log(e);
                });
              }
            });
            current_page = current_page - 1;
          }
        } catch (e) {
          console.log("EEEEEEEEEEEER", e);
          App.toggleWindow("settings");
        }
      },
      child: Overlay({
        child: Box({
          child: Box({}),
          css: `min-width: ${SCREEN_WIDTH}px;min-height: ${SCREEN_HEIGHT}px;`,
        }),
        overlays: [
          panes_container,
        ]
      })
      
    }),
  });


  dark.connect("changed",() => {
    App.resetCss();
    App.applyCss(css);
  });

  export default {
    style: css,
    closeWindowDelay: {
        player: 300+600+500+100,
      },
    windows: [
      NierSettingPane({})
    ],
  };