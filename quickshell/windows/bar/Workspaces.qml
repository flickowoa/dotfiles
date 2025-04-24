import QtQuick
import Quickshell.Hyprland
import Quickshell.Widgets
import Qt5Compat.GraphicalEffects

import "root:components"
import "root:"

Rectangle {
    id: workspaces

    color: "transparent"

    height: Config.pillHeight
    width: workspacesRow.implicitWidth

    property int currentIndex: Hyprland.focusedMonitor.activeWorkspace.id
    property var activePill: workspacesRow.children[currentIndex - 1]

    property real xshift: 0

        Behavior on xshift {
            NumberAnimation {
                duration: 2000
                easing.type: Easing.OutExpo
            }
        }

    Timer {
            id: xshiftReset
            interval: 150
            running: false
            onTriggered: {
                workspaces.xshift = 0;
                xshiftReset.running = false;
            }
        }

    Row {
        id: workspacesRow
        anchors.fill: parent

        spacing: 10

        Repeater {
            model: 10
            delegate: Pill {

                property bool activeWs: currentIndex === index + 1
                color: activeWs ? Qt.rgba(Colors.background.r, Colors.background.g, Colors.background.b, 0.8) : Colors.background

                cava_index: index
                randomIndex: false

                width: Config.pillWidth * 0.7 
                height: Config.pillHeight


                Text {
                    text: index + 1
                    color: Colors.on_background
                    anchors.centerIn: parent
                    font.weight: 500
                    font.pixelSize: 16
                }
            }
        }
    }

    DirectionalBlur {
        id: blur
        // z: -1
        // anchors.fill: shader

        height: shaderSource.height
        width: shaderSource.width

        anchors.verticalCenter: shaderClip.verticalCenter

        source: shaderSource
        samples: 124
        angle: 90
        length: Math.min(Math.abs(blur.to_x - x), Math.abs(blur.from_x - x)) * 1.5

        property real to_x: activePill.x
        property real from_x: 0

        

        Connections {
            target: workspaces
            function onActivePillChanged() {
                blur.from_x = blur.x;
                blur.to_x = activePill.x;
                blur.x = blur.to_x;
                workspaces.xshift = (blur.to_x - blur.from_x);
                xshiftReset.running = true;
            }
        }

        x: 0

        transparentBorder: true

        Behavior on x {
            NumberAnimation {
                duration: 300
                easing.type: Easing.OutExpo
            }
        }
    }

    ShaderEffectSource {
        id: shaderSource
        visible: false
        sourceItem: shaderClip
        width: shader.width + Math.min(Math.abs(blur.to_x - blur.x), Math.abs(blur.from_x - blur.x)) / 5
        height: shader.height - Math.min(Math.abs(blur.to_x - blur.x), Math.abs(blur.from_x - blur.x)) / 8

        hideSource: true

        Text {
            id: activeTxt
            text: currentIndex
            color: Config.darkMode ? Colors.primary : Cava.onColors[2]
            anchors.centerIn: parent
            font.weight: 900
            font.pixelSize: 20
        }
    }

    ClippingRectangle {
        id: shaderClip
        // visible: false

        height: activePill.height
        width: activePill.width

        

        // color: "transparent"

        radius: 50

        Rectangle {
            id: shader
            color: Config.darkMode ? Colors.on_primary : Cava.colors[2]

            Behavior on color {
                ColorAnimation {
                    duration: 1000
                    easing.type: Easing.InOutQuad
                }
            }

            anchors.fill: parent

            layer.enabled: true
            layer.effect: ShaderEffect {
                property int gheight: parent.height
                property int gwidth: parent.width

                property color colorA: Config.darkMode ? Colors.tertiary : Cava.colors[3]
                property color colorB: Config.darkMode ? Colors.tertiary : Cava.colors[3]
                property color colorC: Config.darkMode ? Colors.tertiary : Cava.colors[3]
                property real cava: Cava.avg_t

                property real t: 0
                property real xshift: workspaces.xshift

                property real strength: Config.darkMode ? 80 : 100

                fragmentShader: "root:shaders/bubble.frag.qsb"

                Timer {
                    running: true
                    interval: 25
                    repeat: true
                    onTriggered: () => {
                        t += 0.01;
                        // if (t > 1) {
                        //     t = 0;
                        // }
                    }
                }
            }
        }
    }
}
