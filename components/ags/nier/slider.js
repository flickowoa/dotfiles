import { Widget, Variable } from "../imports.js";
import { button_label_1, button_label_2, button_slider_padding, button_slider_width } from "../scaling.js";
import { arradd, arrremove, assetsDir } from "../util.js";
import { NierButton } from "./buttons.js";
const { Box } = Widget;

const handle_value = (segments, boxes, value, active) => {
  for (let segment of segments) {
    segment.classNames = arrremove(segment.classNames, "focus");
    segment.classNames = arrremove(segment.classNames, "filled");
    segment.classNames = arrremove(segment.classNames, "focus-on-hold");
  }
  let segment_index = Math.floor(value * boxes) - 1;
  if (segment_index < 0) {
    return segments;
  }
  if (segment_index >= boxes) {
    segment_index = boxes - 1;
  }

  for (let segment of segments) {
    segment.classNames = arrremove(segment.classNames, "focus");
    segment.classNames = arrremove(segment.classNames, "filled");
  }
  for (let segment of segments) {
    if (segment.classNames.includes(`nier-slider-boxes-${segment_index}`)) {
      if (active) {
        segment.classNames = arradd(segment.classNames, "focus");
      } else {
        segment.classNames = arradd(segment.classNames, "filled");
        segment.classNames = arradd(segment.classNames, "focus-on-hold");
      }

      break;
    }
    segment.classNames = arradd(segment.classNames, "filled");
  }
};

export const NierSliderButton = ({
  label = "",
  classNames = [],
  containerClassNames = [],
  containerConnections = [],
  connections = [],
  ratio = Variable(0, {}),
  boxes = button_slider_width,
  slider_padding = button_slider_padding,
  onValueChange = async (self, value) => {},
  isDragging = false,
  hovering = false,
  size = button_label_2,
  font_size = button_label_1,
  useAssetsDir = assetsDir,
  ...props
}) =>
  NierButton({
    useAssetsDir,
    label,
    homogeneous_button: true,
    containerClassNames: [],
    containerConnections: [],
    size,
    font_size,
    // homogeneous_button: false,
    classNames: ["nier-slider-button", ...classNames],
    ...props,

    passedOnHover: async (self) => {
      hovering = true;
      let slider = self.child.centerWidget.children[1];
      let segments = slider.children;
      for (let segment of segments) {
        if (segment.classNames.includes("focus-on-hold")) {
          segment.classNames = arradd(segment.classNames, "focus");
          segment.classNames = arrremove(segment.classNames, "filled");
          segment.classNames = arrremove(segment.classNames, "focus-on-hold");
          break;
        }
      }
      return true;
    },
    passedOnHoverLost: async (self) => {
      hovering = false;
      if (isDragging) {
        return false;
      }
      let slider = self.child.centerWidget.children[1];
      let segments = slider.children;
      for (let segment of segments) {
        if (segment.classNames.includes("focus")) {
          segment.classNames = arradd(segment.classNames, "filled");
          segment.classNames = arradd(segment.classNames, "focus-on-hold");
          segment.classNames = arrremove(segment.classNames, "focus");
          break;
        }
      }
      return true;
    },
    handleClick: async (self, event) => {
      isDragging = true;
      let slider = self.child.centerWidget.children[1];
      const [, x_pos] = event.get_coords();
      let x = x_pos;
      let alloc = slider.get_allocation();
      if (x >= alloc.x) {
        x = x - alloc.x;
        let sliderPos = (x / (alloc.width - slider_padding)) * boxes;
        let rawPos = Math.min(Math.max(sliderPos, 0), boxes);
        let value = rawPos / boxes;

        ratio.setValue(value);
      }
    },
    handleClickRelease: async (self) => {
      isDragging = false;
    },
    handleMotion: async (self, event) => {
      let slider = self.child.centerWidget.children[1];
      const [, x_pos] = event.get_coords();
      let x = x_pos;
      let alloc = slider.get_allocation();
      x = x - alloc.x;
      let sliderPos = (x / (alloc.width - slider_padding)) * boxes;
      let rawPos = Math.min(Math.max(sliderPos, 0), boxes);
      let value = rawPos / boxes;
      ratio.setValue(value);
      console.log("bar move is setting volume", ratio.value);
    },
    children: [
      NierInertSlider({
        boxes: boxes,
        connections: [
          [
            ratio,
            (self) => {
              handle_value(self.children, boxes, ratio.value, hovering);
            },
          ],
          ...connections,
        ],
      }),
    ],
  });

export const NierInertSlider = ({
  boxes = button_slider_width,
  slider_padding = button_slider_padding,
  connections = [],
}) =>
  Box({
    classNames: ["nier-slider"],
    homogeneous: false,
    hpack: "end",
    vpack: "center",
    css: `padding-right: ${slider_padding}px;padding-left: 0px;`,
    children: [
      ...Array.from({ length: boxes }, (_, i) => i).map((i) => {
        return Box({
          child: Box({ classNames: ["inner"] }),
          classNames: ["nier-slider-boxes", `nier-slider-boxes-${i}`],
        });
      }),
      Box({ classNames: ["nier-slider-end"] }),
      Box({ classNames: ["nier-slider-size"] }),
    ],
    connections: [...connections],
  });
