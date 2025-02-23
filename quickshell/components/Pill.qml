import QtQuick
import Qt5Compat.GraphicalEffects

import "root:"

Rectangle {
    id: pill
    color: Config.darkMode ? Colors.background : Colors.primary
    width: childrenRect.width ? childrenRect.width + Config.pillHPadding : Config.pillWidth
    height: Config.pillHeight

    property bool randomIndex: true

    property int cava_index: 0

    Component.onCompleted: {
        cava_index = Math.floor(Math.random() * (Cava.barCount - 1));
        console.log(`cava_index`, cava_index);
    }

    Timer {
        interval: 500
        running: randomIndex
        repeat: true
        onTriggered: {
            if (Cava.avg_t < 0.2) {
                cava_index = Math.floor(Math.random() * (Cava.barCount - 1));
            }
        }
    }

    radius: 50

    // border.color: "white"
    // border.width: 1

    RectangularGlow {
        id: glow
        visible: Config.musicMode

        // Behavior on glowRadius {
        //     NumberAnimation {
        //         duration: 10
        //         easing.type: Easing.InOutQuad
        //     }
        // }
        z: -1
        anchors.fill: parent
        color: Cava.colors[cava_index % Cava.colors.length]
        cornerRadius: parent.radius
        glowRadius: 10 * Cava.values[cava_index]
        spread: 0.8
    }
}
