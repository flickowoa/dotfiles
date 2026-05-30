import { Widget, Variable, Utils } from "../imports.js";
import { button_label_2 } from "../scaling.js";
import { arradd, arrremove, assetsDir } from "../util.js";
import { NierButton } from "./buttons.js";
const { Gdk } = imports.gi;
const { Window, Label, EventBox, Box, Icon } = Widget;

export const NierDropDownButton = ({
  label = "",
  classNames = [],
  containerClassNames = [],
  containerConnections = [],
  passedOnHoverLost = async (self) => {
    return true;
  },
  passedOnHover = async (self) => {
    return true;
  },
  options = Variable([], {}),
  size = button_label_2,
  current = Variable("", {}),
  popup_window = null,
  in_focus = false,
  popup_in_focus = false,
  popup_x_offset = 0,
  useAssetsDir = assetsDir,
  ...props
}) =>
  NierButton({
    useAssetsDir,
    label,
    classNames: ["nier-dropdown-button", ...classNames],
    containerClassNames: [
      "nier-dropdown-button-container",
      ...containerClassNames,
    ],
    containerConnections,
    passedOnHoverLost: async (self) => {
      console.log("hover lost");
      self.child.classNames = arrremove(
        self.child.classNames,
        "nier-button-box-hover-from-selected"
      );
      return true;
    },
    handleClick: async (self, event) => {
      self.child.classNames = arradd(
        self.child.classNames,
        "nier-button-box-selected"
      );
      let alloc = self.get_allocation();
      console.log(alloc.x, alloc.y);
      console.log("click");
      await new Promise((resolve) => {
        setTimeout(resolve, 200);
      });
      if (popup_window) {
        popup_window.destroy();
        popup_window = null;
        return;
      }
      popup_window = NierSelectMenu({
        coord_x: alloc.x + alloc.width + popup_x_offset,
        coord_y: alloc.y,
        button: self,
        current,
        options,
        useAssetsDir
      });
    },
    children: [
      Label({
        classNames: ["nier-option-item"],
        hpack: "end",
        binds: [["label", current, "value"]],
      }),
    ],
    ...props,
  });

export const NierSelectMenu = ({
  coord_x = 0,
  coord_y = 0,
  size = button_label_2,
  spacing = 20,
  button = null,
  current,
  options,
  useAssetsDir,
}) =>
  Window({
    exclusivity: "ignore",
    focusable: true,
    layer: "overlay",
    anchor: ["top", "left"],
    setup: (self) =>
      Utils.timeout(1, () => {
        self.connect("destroy", async (self) => {
          button.child.classNames = arrremove(
            button.child.classNames,
            "nier-button-box-selected"
          );
          button.child.classNames = arradd(
            button.child.classNames,
            "nier-button-box-hover-from-selected"
          );
          await new Promise((resolve) => {
            setTimeout(resolve, 500);
          });
          button.child.classNames = arrremove(
            button.child.classNames,
            "nier-button-box-hover-from-selected"
          );
        });
        self.connect("key-press-event", (widget, event) => {
          if (event.get_keyval()[1] == Gdk.KEY_Escape) {
            self.destroy();
          }
        });
      }),
    child: Box({
      vertical: true,
      classNames: ["nier-option-menu"],
      connections: [
        [
          options,
          (self) => {
            self.children = [
              Box({
                children: [
                  Box({
                    spacing,
                    children: [
                      Box({
                        classNames: ["nier-option-header"],
                        child: Box({
                          classNames: ["nier-option-header-inner"],
                        }),
                      }),
                      Icon({
                        icon: useAssetsDir() + "/nier-pointer-rev.svg",
                        size: size,
                        css: "opacity: 0;",
                        classNames: ["nier-button-hover-icon"],
                      }),
                    ],
                  }),
                ],
              }),

              ...Array.from(options.value, (option) => {
                return NierOptionItem({
                  label: option,
                  size,
                  spacing,
                  button,
                  current,
                  useAssetsDir
                });
              }),
            ];
          },
        ],
      ],
      css: `margin-left: ${coord_x}px; margin-top: ${coord_y}px;`,
    }),
  });

export const NierOptionItem = ({
  label = "",
  size = button_label_2,
  spacing = 20,
  button,
  current,
  useAssetsDir,
}) =>
  Box({
    classNames: ["nier-button-container", "nier-option-container"],
    spacing,
    setup: (self) =>
      Utils.timeout(1, () => {
        let label = button.child.centerWidget.children[1];
        if (self.children[0].child.children[0].label == label.label) {
          self.classNames = arradd(self.classNames, "nier-option-selected");
        } else {
          self.classNames = arrremove(self.classNames, "nier-option-selected");
        }
      }),
    children: [
      EventBox({
        onHover: async (self) => {
          let button = self.child;
          let cursor = self.parent.children[1];
          let container = self.parent;

          button.classNames = arradd(button.classNames, "nier-button-hover");
          cursor.classNames = [
            "nier-long-button-hover-icon",
            "nier-long-button-hover-icon-visible",
          ];
          container.classNames = arradd(
            container.classNames,
            "nier-button-container-hover"
          );
          return true;
        },
        onPrimaryClick: async (self) => {
          current.setValue(label);
          self.parent.parent.parent.destroy();
          return true;
        },
        onHoverLost: async (self) => {
          let button = self.child;
          let cursor = self.parent.children[1];
          let container = self.parent;

          button.classNames = arrremove(button.classNames, "nier-button-hover");
          cursor.classNames = [
            "nier-long-button-hover-icon",
            "nier-long-button-hover-icon-hidden",
          ];
          container.classNames = arrremove(
            container.classNames,
            "nier-button-container-hover"
          );

          return true;
        },
        child: Box({
          classNames: ["nier-button"],
          children: [Label({ label })],
        }),
      }),
      Icon({
        icon: useAssetsDir() + "/nier-pointer-rev.svg",
        size: size,
        classNames: ["nier-button-hover-icon", "nier-button-hover-icon-hidden"],
      }),
    ],
  });
