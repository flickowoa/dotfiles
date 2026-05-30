import { App, Utils, Hyprland, Variable } from "./imports.js";

const {random, round } = Math;

function arrremove(arr, value) {
  return arr.filter(function (ele) {
    return ele != value;
  });
}

function arradd(arr, value) {
  if (arr.includes(value)) {
    return arr;
  }
  arr.push(value);
  return arr;
}

async function get_cursor() {
  return Hyprland.sendMessage("cursorpos").then((res) => {
    return res.split(",").map((n) => Number(n));
  });
}

const home = `/home/${Utils.exec("whoami")}`;
const themedir = App.configDir.split("/").slice(0, -2).join("/");

const dark = Variable(false, {});

globalThis.dark = dark;

const assetsDir = () => `${App.configDir}/assets/${dark.value ? "dark" : "light"}`;

const scss = App.configDir + "/style/style.scss";
const css = App.configDir + "/style/style.css";

const { exec } = Utils;
const SCREEN_WIDTH = Number(
  exec(
    `bash -c "xrandr --current | grep '*' | uniq | awk '{print $1}' | cut -d 'x' -f1 | head -1"`
  )
);
const SCREEN_HEIGHT = Number(
  exec(
    `bash -c "xrandr --current | grep '*' | uniq | awk '{print $1}' | cut -d 'x' -f2 | head -1"`
  )
);

const rand_int = (a,b) => round(random()*(b-a)+a);

export {
  arradd,
  arrremove,
  home,
  themedir,
  scss,
  css,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
  get_cursor,
  rand_int,
  dark,
  assetsDir,
};
