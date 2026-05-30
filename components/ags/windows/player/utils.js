import { App, Utils, Variable } from "./imports.js";
import { badapple } from "./badappledat.js";
print(badapple[0])

const parentConfigDir = App.configDir.split("/").slice(0,-2).join("/");

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

const {random, round } = Math;

const dark = Variable(false, {});

dark.connect("changed", () => {
  print("music: dark changed",dark.value);
})

globalThis.dark = dark;


const assetsDir = () => `${parentConfigDir}/assets/${dark.value ? "dark" : "light"}`;

const home = `/home/${Utils.exec("whoami")}`;
const themedir = parentConfigDir.split("/").slice(0, -2).join("/");

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
globalThis["SCREEN_WIDTH"] = SCREEN_WIDTH;
globalThis["SCREEN_HEIGHT"] = SCREEN_HEIGHT;

const rand_int = (a,b) => round(random()*(b-a)+a);

export {
  home,
  themedir,
  scss,
  css,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
  rand_int,
  arradd,
  arrremove,
  dark,
  assetsDir,
  parentConfigDir,
  badapple
};
