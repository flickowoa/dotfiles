
pragma Singleton

import QtQuick
import Quickshell.Io
import Quickshell

import "root:/"

Item {
    Process {
        running: true
        command: ["hyprctl","keyword","general:col.active_border", "0xff"+Colors.tertiary.toString().replace("#","")]
    }

    Process {
        running: true
        command: ["hyprctl","keyword","general:col.inactive_border", "0xff"+Colors.primary.toString().replace("#","")]
    }
}

