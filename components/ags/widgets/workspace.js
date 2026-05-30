import {
  Hyprland,
  Utils,
} from "../imports.js";
import { NierLongButton, NierButtonGroup } from "../nier/buttons.js";
import { workspace_workspaces} from "../scaling.js";

import { SCREEN_WIDTH, arradd, arrremove, assetsDir } from "../util.js";

const { execAsync } = Utils;

const int_to_string = ({ i, jap = true }) => {
  switch (i) {
    case 1:
      return jap ? "いち" : "ONE";
    case 2:
      return jap ? "に" : "TWO";
    case 3:
      return jap ? "さん" : "THREE";
    case 4:
      return jap ? "よん" : "FOUR";
    case 5:
      return jap ? "ご" : "FIVE";
    case 6:
      return jap ? "ろく" : "SIX";
    case 7:
      return jap ? "なな" : "SEVEN";
    case 8:
      return jap ? "はち" : "EIGHT";
    case 9:
      return jap ? "きゅう" : "NINE";
    case 10:
      return jap ? "じゅう" : "TEN";
    default:
      return `${i}`;
  }
};

let HOVERING = false;
let REALLY_HOVERING = false;
export const Workspaces = () =>
  NierButtonGroup({
    horizontal: true,
    min_scale: SCREEN_WIDTH,
    classNames: ["workspaces"],
    buttons: Array.from({ length: workspace_workspaces }, (_, i) => i + 1).map((i) => {
      return NierLongButton({
        classNames: ["workspace-button"],
        containerClassNames: [
          "workspace-button-container",
          `workspace-button-${i}`,
        ],
        label: `${int_to_string({ i, jap: false }).toUpperCase()}`,
        onClicked: () => {
          execAsync(`hyprctl dispatch workspace ${i}`);
        },
        passedOnHover: async (self) => {
          if (
            !(
              self.parent.classNames.includes("active") ||
              self.parent.classNames.includes("active-no-hover")
            )
          ) {
            HOVERING = true;
            REALLY_HOVERING = true;
          }
          if (HOVERING) {
            for (let button of self.parent.parent.children) {
              if (
                button.classNames.includes("active") ||
                button.classNames.includes("active-no-hover")
              ) {
                button.classNames = arrremove(
                  button.classNames,
                  "active-no-hover"
                );
                button.classNames = arrremove(button.classNames, "active");
                button.classNames = arradd(
                  button.classNames,
                  "active-no-hover-on-hold"
                );
              }
            }
          }
        },
        passedOnHoverLost: async (self) => {
          if (!self.classNames.includes("active")) {
            HOVERING = false;
            await new Promise((r) => setTimeout(r, 300));
            if (!HOVERING && REALLY_HOVERING) {
              REALLY_HOVERING = false;
            }
          }
          if (!HOVERING) {
            for (let button of self.parent.parent.children) {
              if (button.classNames.includes("active-on-hold")) {
                button.classNames = arrremove(
                  button.classNames,
                  "active-on-hold"
                );
                button.classNames = arradd(button.classNames, "active");
              }
              if (button.classNames.includes("active-no-hover-on-hold")) {
                button.classNames = arrremove(
                  button.classNames,
                  "active-no-hover-on-hold"
                );
                button.classNames = arradd(
                  button.classNames,
                  "active-no-hover"
                );
              }
            }
          }
        },
        containerConnections: [
          [
            Hyprland.active.workspace,

            async (self) => {
              if (
                !self.classNames.includes(
                  `workspace-button-${Hyprland.active.workspace.id}`
                )
              ) {
                self.classNames = arrremove(self.classNames, "active-on-hold");
                self.classNames = arrremove(
                  self.classNames,
                  "active-no-hover-on-hold"
                );
                self.classNames = arrremove(self.classNames, "active");
                self.classNames = arrremove(self.classNames, "active-no-hover");
                self.children[0].icon =
                assetsDir() + "/nier-pointer.svg";
              } else {
                if (
                  !self.children[1].classNames.includes(
                    "nier-long-button-hover"
                  )
                ) {
                  self.classNames = arradd(self.classNames, "active-no-hover");
                } else {
                  self.children[1].classNames = arrremove(
                    self.children[1].classNames,
                    "nier-long-button-hover"
                  );
                  self.classNames = arradd(self.classNames, "active");
                }
                await new Promise((r) => setTimeout(r, 300));
                self.children[0].icon =
                assetsDir() + "/nier-pointer-select.svg";
              }
            },
          ],
        ],
      });
    }),
  });
