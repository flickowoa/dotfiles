import QtQuick
import Quickshell
import Quickshell.Io
import Quickshell.Wayland
import Quickshell.Hyprland

import Qt5Compat.GraphicalEffects

import "root:/"

Rectangle {
    width: clock.width
    height: Config.barHeight
    color: "transparent"

    Glow {
        anchors.fill: clock
        radius: 15
        samples: 17
        color: Qt.rgba(0, 0, 0, 0.5)
        source: clock
    }

    property int hour1 : 0
    property int hour2 : 0
    property int minute1 : 0
    property int minute2 : 0
    property int second1 : 0
    property int second2 : 0

    // RectangularGlow {
    //     id: glow
    //     anchors.fill: clock
    //     glowRadius: 10
    //     spread: 0.2
    //     color: "white"
    //     cornerRadius: 10
    //     // visible: false
    // }

    Row {
        id: clock
        spacing: 0

        anchors {
            verticalCenter: parent.verticalCenter
        }

        Timer {
            interval: 1000
            running: true
            repeat: true
            onTriggered: {
                var now = new Date();

                var hours = now.getHours();

                if (Config.clock24Hour) {
                    hour1 = hours / 10;
                    hour2 = hours % 10;
                } else {
                    hours = hours % 12;
                    if (hours == 0) {
                        hours = 12;
                    }
                    hour1 = hours / 10;
                    hour2 = hours % 10;
                }
                
                minute1 = now.getMinutes() / 10;
                minute2 = now.getMinutes() % 10;
                second1 = now.getSeconds() / 10;
                second2 = now.getSeconds() % 10;

                hour1Num.toNum = hour1;
                hour2Num.toNum = hour2;
                minute1Num.toNum = minute1;
                minute2Num.toNum = minute2;
                if (Config.clockShowSeconds) {
                    second1Num.toNum = second1;
                    second2Num.toNum = second2;
                }
            }
        }

        ClockNumber {
            id: hour1Num
            bgColor: Config.clockColor
            fixedWidth: Config.clockFixedWidth
            textShadowWidth: Config.clockTextShadowWidth
            noBackgroundForZero: Config.clockNoBackgroundForZero
        }

        ClockNumber {
            id: hour2Num
            bgColor: Config.clockColor
            fixedWidth: Config.clockFixedWidth
            textShadowWidth: Config.clockTextShadowWidth
            noBackgroundForZero: Config.clockNoBackgroundForZero
        }

        Rectangle {
            width: Config.clockSeperatorWidth
            height: parent.height
            color: Config.clockSeperator1Color
        }

        ClockNumber {
            id: minute1Num
            bgColor: Qt.darker(Config.clockColor, 1.5)
            fixedWidth: Config.clockFixedWidth
            textShadowWidth: Config.clockTextShadowWidth
            noBackgroundForZero: Config.clockNoBackgroundForZero
        }

        ClockNumber {
            id: minute2Num
            bgColor: Qt.darker(Config.clockColor, 1.5)
            fixedWidth: Config.clockFixedWidth
            textShadowWidth: Config.clockTextShadowWidth
            noBackgroundForZero: Config.clockNoBackgroundForZero
        }

        Rectangle {
            width: Config.clockSeperatorWidth
            height: parent.height
            color: Config.clockSeperator2Color
            visible: Config.clockShowSeconds
        }

        ClockNumber {
            id: second1Num
            bgColor: Qt.darker(Config.clockColor, 2)
            fixedWidth: Config.clockFixedWidth
            visible: Config.clockShowSeconds
            textShadowWidth: Config.clockTextShadowWidth
            noBackgroundForZero: Config.clockNoBackgroundForZero
        }

        ClockNumber {
            id: second2Num
            bgColor: Qt.darker(Config.clockColor, 2)
            fixedWidth: Config.clockFixedWidth
            visible: Config.clockShowSeconds
            textShadowWidth: Config.clockTextShadowWidth
            noBackgroundForZero: Config.clockNoBackgroundForZero
        }


    }
}