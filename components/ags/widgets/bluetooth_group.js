import { Widget, Bluetooth, Variable } from "../imports.js";
import { NierButton } from "../nier/buttons.js";
import { NierDropDownButton } from "../nier/dropdown.js";
import { button_label_2 , settings_title_bottom, settings_title_top } from "../scaling.js";
import { SCREEN_WIDTH } from "../util.js";

const { Label } = Widget;

export const BluetoothGroup = ({
  go_to = async (buttons, parent_button) => {},
  enabled = Variable(Bluetooth.enabled ? "Yes" : "No", {}),
  passAssetsDir = assetsDir
}) => {
  return [
    Label({ hpack: "start", label: "BLUETOOTH", classNames: ["heading"], css:`margin-top: ${settings_title_top}px;margin-bottom: ${settings_title_bottom}px;` }),
    NierDropDownButton({
      useAssetsDir: passAssetsDir,
      font_size: button_label_2,
      label: "Enabled",
      current: enabled,
      options: Variable(["Yes", "No"], {}),
      popup_x_offset: SCREEN_WIDTH / 4,
      connections: [
        [
          enabled,
          (self) => {
            Bluetooth.enabled = enabled.value == "Yes";
          },
        ],
      ],
    }),
    NierButton({
      useAssetsDir: passAssetsDir,
      font_size: button_label_2,
      label: "Devices",
      handleClick: async (self, event) => {
        go_to(
          [
            Label({
              hpack: "start",
              label: "DEVICES",
              classNames: ["heading"],
            }),
            ...Array.from(Bluetooth.devices).map((device) => {
              let device_options = Variable(["Connected", "Disconnected"], {});
              let device_current = Variable(
                device.connected ? "Connected" : "Disconnected",
                {}
              );
              return NierDropDownButton({
                useAssetsDir: passAssetsDir,
                label: device.name,
                current: device_current,
                options: device_options,
                popup_x_offset: (SCREEN_WIDTH / 4) * 2,
                connections: [
                  [
                    device_current,
                    (self) => {
                      if (device_current.value == "Connected") {
                        device.setConnection(false);
                      } else {
                        device.setConnection(true);
                      }
                    },
                  ],
                ],
              });
            }),
          ],
          self
        );
      },
    }),
  ];
};
