import QtQuick
import Quickshell.Io
import Quickshell

import "root:/"

Item {

    property real avg_t: 0

    Connections {
        target: Cava
        property real angle: 0

        onAvg_tChanged: {
            avg_t = Cava.avg_t;
            angle += avg_t*2;
            // speed up at 0 and 360 deg
            if (angle > 360) {
                angle = 0;
            }


            borderCol.command = ["hyprctl", "keyword", "general:col.active_border", borderCol.gradient,`${angle}deg`]
            borderCol.running = true;
            
            // console.log("avg_t", avg_t);
            // shadowRange.running = false;
            // shadowRange.running = true;
            // shadowPower.running = false;
            // shadowPower.running = true;
        }
    }

    Process {
        id: borderCol
        running: true

        property string color1: "0xff" + (Config.darkMode ? Colors.on_background : Colors.secondary_container).toString().replace("#", "")
        property string color2: "0xff" + (Config.darkMode ? Colors.background : Colors.tertiary_container).toString().replace("#", "")

        property string gradient: `${color1} ${color2} ${color1} ${color2}`

        

        command: ["hyprctl", "keyword", "general:col.active_border", gradient,`0deg`]

        stdout: SplitParser {
            onRead: data => {
                console.log("hyprrrrrrrrrrrrrrrrrrrrrrr", data, borderCol.command);
            }
        }
    }

    Process {
        id: shadowCol
        running: true
        command: ["hyprctl", "keyword", "decoration:shadow:color", "0xff" + (Config.darkMode ? Colors.secondary : Colors.secondary).toString().replace("#", "")]
    }

    Process {
        id: shadowColInactive
        running: true
        command: ["hyprctl", "keyword", "decoration:shadow:color_inactive", "0xAA" + (Config.darkMode ? Colors.background : Colors.on_background).toString().replace("#", "")]
    }

    Process {
        id: borderColInactive
        running: true
        command: ["hyprctl", "keyword", "general:col.inactive_border", "0xAA" + (Config.darkMode ? Colors.background : Colors.on_background).toString().replace("#", "")]
    }

    // Connections {
    //     target: Colors
    //     onPrimaryChanged: () => {
    //         console.log("ccccccccccccccccccccccc cover art update changed");
    //         borderCol.running = false;
    //         borderCol.running = true;
    //         shadowCol.running = false;
    //         shadowCol.running = true;
    //         shadowColInactive.running = false;
    //         shadowColInactive.running = true;
    //         borderColInactive.running = false;
    //         borderColInactive.running = true;
    //     }
    // }

    // Timer {
    //     running: true
    //     repeat: true
    //     interval: 10

    //     onTriggered: {
    //         console.log("resetting shadow range");
    //         avg_t = Cava.avg_t;
    //         // shadowRange.running = false;
    //         // shadowRange.running = true;
    //         // shadowPower.running = false;
    //         // shadowPower.running = true;
    //     }
    // }

    Behavior on avg_t {
        NumberAnimation {
            duration: 10
            // easing.type: Easing.InOutQuad
        }
    }

    // Process {
    //     id: shadowRange
    //     running: true
    //     command: ["hyprctl", "keyword", "decoration:shadow:range", `${Math.round(10 +  * 50)}`]
    //     stdout: SplitParser {
    //         onRead: data => {
    //             console.log("hyprrrrrrrrrrrrrrrrrrrrrrr", data, shadowRange.command);
    //         }
    //     }
    // }

    // Process {
    //     id: shadowPower
    //     running: true
    //     command: ["hyprctl", "keyword", "decoration:shadow:render_power", `${4 - Cava.values[3] * 4}`]
    //     stdout: SplitParser {
    //         onRead: data => {
    //             console.log("hyprrrrrrrrrrrrrrrrrrrrrrr", data, shadowRange.command);
    //         }
    //     }
    // }
}
