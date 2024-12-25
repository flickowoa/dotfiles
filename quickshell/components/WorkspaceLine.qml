import QtQuick
import Quickshell
import Quickshell.Io
import Quickshell.Wayland
import Quickshell.Hyprland
import QtQuick.Layouts

import "root:/"

Rectangle {
    height: 100
    width: 5
    color: Colors.tertiary

    anchors {
        left: parent.left
    }

    y: (Hyprland.focusedMonitor.activeWorkspace.id - 1) * (parent.height - height) / 9

    Behavior on y {
        NumberAnimation {
            duration: 570

            easing.bezierCurve: [0.23,1,0.61,1,1,1]
            easing.type: Easing.BezierSpline
        }
    }
}