import QtQuick
import Quickshell
import Quickshell.Io
import Quickshell.Wayland
import Quickshell.Hyprland

import "."
import "root:/"

Rectangle {
    id: workspace_cell
    property alias text: workspace_label.text
    property int workspaceId
    property int prevWorkspaceId

    property int gap: 20
    property int font_size: 10

    property int text_width: txtMeter.tightBoundingRect.width
    property int text_height: txtMeter.tightBoundingRect.height

    color: "transparent"

    width: Hyprland.focusedMonitor.activeWorkspace.id == workspace_cell.workspaceId ? workspace_label.implicitWidth : 0

    Behavior on width { PropertyAnimation {
        duration: 1000
        easing.type: Easing.OutQuint
    } }
    
    height: Config.barHeight

    anchors {
        bottom: parent.bottom
    }

    TextMetrics {
        id: txtMeter
        font.family: "Courier"
        font.pixelSize: font_size
        font.bold: true
        text: workspace_label.text
    }

    Connections {
        target: Hyprland.focusedMonitor
        onActiveWorkspaceChanged: {
            workspace_label.handleWorkspaceChange()
        }
    }

    Text {
        color: Colors.primary
        font: txtMeter.font
        width: parent.width
        clip: true

        anchors {
            left: parent.left
            right: parent.right
            verticalCenter: parent.verticalCenter
        }

        id: workspace_label

        function handleWorkspaceChange() {
            let currentWorkspace = Hyprland.focusedMonitor.activeWorkspace.id

            anchors.leftMargin = 0
            anchors.rightMargin = 0

            if (workspaceId == workspace_cell.prevWorkspaceId) {
                if (currentWorkspace > workspace_cell.prevWorkspaceId) {
                    anchors.rightMargin = gap
                } else {
                    anchors.leftMargin = gap
                }
            }

            if (currentWorkspace == workspaceId) {
                if (currentWorkspace > workspace_cell.prevWorkspaceId) {
                    horizontalAlignment = Text.AlignRight
                } else {
                    horizontalAlignment = Text.AlignLeft
                }
            }
            else if (currentWorkspace > workspaceId) {
                horizontalAlignment = Text.AlignLeft
            } else {
                horizontalAlignment = Text.AlignRight
            }
            workspace_cell.prevWorkspaceId = currentWorkspace
        }
        

        Component.onCompleted: {
            // Hyprland.focusedMonitor.activeWorkspaceChanged.connect(handleWorkspaceChange)

            // switch (workspaceId) {
            //     case 1:
            //         text = "いち"
            //         break
            //     case 2:
            //         text = "に"
            //         break
            //     case 3:
            //         text = "さん"
            //         break
            //     case 4:
            //         text = "よん"
            //         break
            //     case 5:
            //         text = "ご"
            //         break
            //     case 6:
            //         text = "ろく"
            //         break
            //     case 7:
            //         text = "なな"
            //         break
            //     case 8:
            //         text = "はち"
            //         break
            //     case 9:
            //         text = "きゅう"
            //         break
            //     case 10:
            //         text = "じゅう"
            //         break
            //     default:
            //         text = workspaceId
            //         break
            // }
            
            switch (workspaceId) {
                case 1:
                    text = "One"
                    break
                case 2:
                    text = "Two"
                    break
                case 3:
                    text = "Three"
                    break
                case 4:
                    text = "Four"
                    break
                case 5:
                    text = "Five"
                    break
                case 6:
                    text = "Six"
                    break
                case 7:
                    text = "Seven"
                    break
                case 8:
                    text = "Eight"
                    break
                case 9:
                    text = "Nine"
                    break
                case 10:
                    text = "Ten"
                    break
                default:
                    text = workspaceId
                    break
            }
        }
    }
}