import QtQuick
import Quickshell
import Quickshell.Io
import Quickshell.Wayland
import Quickshell.Hyprland
import QtQuick.Window
import QtQuick.Controls
import QtQuick.Layouts

import "root:components"
import "root:windows/bar"
import "root:"

PanelWindow {
    id: topbar

    WlrLayershell.layer: WlrLayer.Bottom
    exclusionMode: ExclusionMode.Ignore

    Process {
        id: barCol
        running: true
        // hyprctl keyword monitor "eDP-2,addreserved,100,0,0,0"
        command: ["hyprctl", "keyword", "monitor", `,addreserved,${Config.barHeight + Config.barVMargin + 15},0,0,0`]
    }

    color: "transparent"

    height: topbar.childrenRect.height

    anchors {
        top: true
        left: true
        right: true
    }

    RowLayout {
        id: bar

        anchors {
            // fill: parent
            leftMargin: Config.barHMargin
            rightMargin: Config.barHMargin
            topMargin: Config.barVMargin
            top: parent.top
            left: parent.left
            right: parent.right
        }

        RowLayout {
            id: left

            Layout.alignment: Qt.AlignLeft

            width: childrenRect.width
            height: childrenRect.height

            Workspaces {}
        }
        // Rectangle {
        //     color: "blue"
        //     width: 1
        //     height: parent.height
        // }

        RowLayout {
            id: center

            anchors.centerIn: Config.centerPillOnScreen ? parent : null
            Layout.alignment: Qt.AlignHCenter
            Layout.fillWidth: true
            Layout.horizontalStretchFactor: 1

            // width: center.childrenRect.width

            Island {}
        }

        // Rectangle {
        //     color: "blue"
        //     width: 1
        //     height: parent.height
        // }

        RowLayout {
            id: right

            layoutDirection: Qt.RightToLeft

            Layout.alignment: Qt.AlignRight

            width: 100

            Clock {
                Layout.alignment: Qt.AlignRight
            }
        }
    }
}
