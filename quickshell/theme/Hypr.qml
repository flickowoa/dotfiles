import QtQuick
import Quickshell.Io
import Quickshell

import "root:/"

Item {

    property real avg_t: 0

    Process {
        id: borderCol
        running: true
        command: ["hyprctl", "keyword", "general:col.active_border", "0xff" + (Config.darkMode ? Colors.on_background : Colors.secondary_container).toString().replace("#", "")]
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
