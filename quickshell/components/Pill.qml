import QtQuick

import "root:"

Rectangle {
    id: pill
    color: "black"
    width: childrenRect.width ? childrenRect.width + Config.pillHPadding : Config.pillWidth
    height: Config.pillHeight

    radius: 50

    // border.color: "white"
    // border.width: 1
}
