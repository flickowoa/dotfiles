import QtQuick

import "root:components"
import "root:"

Rectangle {
    id: workspaces

    color: "transparent"

    height: Config.pillHeight
    width: workspacesRow.implicitWidth

    Row {
        id: workspacesRow
        anchors.fill: parent

        spacing: 10

        Repeater {
            model: 10
            delegate: Pill {
                color: "blue"

                width: Config.pillWidth * 0.7
                height: Config.pillHeight

                Text {
                    text: index
                    color: "white"
                    anchors.centerIn: parent
                }
            }
        }
    }
}
