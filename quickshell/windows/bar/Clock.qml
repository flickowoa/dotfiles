import QtQuick
import Quickshell

import "root:components"

Pill {
    SystemClock {
        id: sysclock
        precision: SystemClock.Minutes
    }

    color: "white"

    Text {
        text: Qt.formatDateTime(sysclock.date, "h:mm AP")
        font.pixelSize: 20
        anchors.centerIn: parent
    }
}
