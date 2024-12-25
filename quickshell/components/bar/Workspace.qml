import QtQuick
import Quickshell
import Quickshell.Io
import Quickshell.Wayland
import Quickshell.Hyprland
import QtQuick.Layouts

import Qt5Compat.GraphicalEffects
import "."
import "root://"

Rectangle {
    id: workspace_container

    // property int leftSpace: workspace.prev_width

    width: workspace.implicitWidth * 1.5
    height: Config.barHeight
    color: "transparent"

    property int cell_font_size: Config.barHeight*4

    Instantiator {
        model: 11
        onObjectAdded: (index, cell) => {
            workspace.data.push(cell)
        }
        delegate: WorkspaceCell {
            readonly property int index: model.index
            workspaceId: index
            prevWorkspaceId: index - 1
            font_size: cell_font_size
        }
    }

    Glow {
        anchors.fill: workspace
        radius: 15
        samples: 17
        color: Qt.rgba(0, 0, 0, 0.5)
        source: workspace
    }

    Row {
        id: workspace
        spacing: 0

        anchors {
            horizontalCenter: parent.horizontalCenter
        }

        property int max_width: 0

        onWidthChanged : {
            if (width > max_width) {
                max_width = width
            }
            if (Config.autoWorkspaceFontSize) {
                var to_size = cell_font_size
                while (width > Config.barWidth/10 || height > Config.barHeight) {
                    if (to_size < 1 || (to_size < Config.barHeight/2)) {
                        max_width = 0
                        break
                    }
                    to_size--
                }
                cell_font_size = to_size
            }
        }
    }
}

