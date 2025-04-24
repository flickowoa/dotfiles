import QtQuick
import Quickshell

import Quickshell.Services.UPower
import "root:components"

Pill {
    SystemClock {
        id: sysclock
        precision: SystemClock.Minutes
    }

    property int charge : 0

    color: "white"

    Text {
        text: Qt.formatDateTime(sysclock.date, "h:mm AP")
        font.pixelSize: 20
        anchors.centerIn: parent
    }
}
