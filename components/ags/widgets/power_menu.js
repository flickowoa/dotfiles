import { Widget, Variable } from "../imports.js";
import { NierButton } from "../nier/buttons.js";
import { button_label_2 ,settings_title_bottom, settings_title_top } from "../scaling.js";
import { assetsDir } from "../util.js";

const {Label} = Widget;
const {exec} = Utils;

export const PowerGroup = ({
  go_to = async (buttons, parent_button) => {},
  passAssetsDir = assetsDir
  
}) => {
  return [
    Label({ hpack: "start", label: "POWER", classNames: ["heading"], css:`margin-top: ${settings_title_top}px;margin-bottom: ${settings_title_bottom}px;` }),
    NierButton({
      useAssetsDir: passAssetsDir,
      label: "Shutdown", 
      font_size: button_label_2,
    //   handleClick: async (self,event)  => {
    //     go_to(
    //       [
    //       Label({ hpack: "start", label: "ARE YOU SURE?", classNames: ["heading"]  ,css:`margin-top: ${settings_title_top}px;margin-bottom: ${settings_title_bottom}px;` }),
    //       NierButton({
    //         useAssetsDir: passAssetsDir,
    //         label: "YES",
    //         font_size: 30,
    //         vpack: "end",
    //         handleClick: () => {
    //           exec(
    //             `bash -c "poweroff"`
    //           )
    //         }
    //       }),
    //       NierButton({
    //         useAssetsDir: passAssetsDir,
    //         label: "NO",
    //         font_size: 30,
    //         vpack: "end",
    //         handleClick: () => {
    //           //
    //         }
    //       }),
    //     ],
    //     self
    //   );
    // }

        handleClick: () => {
          exec(
            `bash -c "poweroff"`
          )
      } 
    }),
    NierButton({
        useAssetsDir: passAssetsDir,
        label: "Reboot",
        font_size: button_label_2,
        vpack: "end",
        handleClick: () => {
          exec(
            `bash -c "reboot"`
          )
      }
    }),
  ];
};
