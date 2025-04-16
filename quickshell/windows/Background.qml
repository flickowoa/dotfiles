import QtQuick
import Quickshell
import Quickshell.Io
import Quickshell.Wayland
import Quickshell.Hyprland
import QtQuick.Controls
import QtQuick.Layouts
import Qt5Compat.GraphicalEffects
import QtMultimedia

import "root:"

PanelWindow {
    id: background

    exclusionMode: ExclusionMode.Ignore
    WlrLayershell.layer: WlrLayer.Background
    color: "white"

    property color accentColor: Config.darkMode ? Colors.background : Colors.tertiary

    Behavior on accentColor {
        ColorAnimation {
            duration: 1000
            easing.type: Easing.InOutQuad
        }
    }

    anchors {
        top: true
        left: true
        right: true
        bottom: true
    }

    Rectangle {
        id: bgRect
        // visible: false
        anchors.fill: parent

        color: "transparent"
        Image {
            id: bg
            cache: false
            visible: false
            asynchronous: false
            anchors.fill: parent
            fillMode: Image.PreserveAspectCrop
            // fillMode: Image.PreserveAspectFit

            // source: Config.darkMode ? "root:../wallpapers/pinkflower.png" : "root:../wallpapers/migu-light.png"
            // source: Config.darkMode ? "root:../wallpapers/rocket.jpg" : "root:../wallpapers/migu-light.png"
            // source: Config.darkMode ? "root:../wallpapers/plane.png" : "root:../wallpapers/migu-light.png"
            source: "root:../wallpapers/cloud.png"

            // source: Config.darkMode ? "root:../wallpapers/miku-lightondark.png" : "root:../wallpapers/migu-light.png"

            // Connections {
            //     target: Colors
            //     onCoverArtUpdateChanged: () => {
            //         bg.source = "/tmp/dreamyv2/cover.png?" + Math.random();
            //     }
            // }
        }

        // Video {
        //     id: bg
        //     fillMode: VideoOutput.PreserveAspectCrop
        //     muted: true
        //     autoPlay: true
        //     loops: 1
        //     anchors.fill: parent
        //     source: "root:../wallpapers/linus.mp4"
        // }

        // Colorize {
        //     id: colorize
        //     anchors.fill: bg
        //     source: bg
        //     hue: accentColor.hslHue
        //     saturation: accentColor.hslSaturation
        //     lightness: accentColor.hslLightness
        // }

        BrightnessContrast {
            id: bright
            anchors.fill: bg
            source: bg
            brightness: Config.darkMode ? -0.7 : 0
            // brightness: 0.02
            contrast: Config.darkMode ? 0.7 : 0
        }

        layer.enabled: true
        layer.effect: ShaderEffect {
            property int gheight: bg.height
            property int gwidth: bg.width

            property int heightOverflow: 50
            property int widthOverflow: 0

            property real treshold: 0
            property real strength: 70

            // property real pointA_x: 10
            // property real pointA_y: gheight
            // property real pointB_x: gwidth / 2
            // property real pointB_y: gheight
            // property real pointC_x: gwidth - 10
            // property real pointC_y: gheight

            // property real pointA_vx: 0
            // property real pointA_vy: 0

            // property real pointB_vx: 0
            // property real pointB_vy: 0

            // property real pointC_vx: 0
            // property real pointC_vy: 0

            // property real radiusA: 2
            // property real radiusB: 2
            // property real radiusC: 2

            // property real angleA: 0
            // property real angleB: 0
            // property real angleC: 0

            property real bar0: Cava.values[0]
            property real bar1: Cava.values[1]
            property real bar2: Cava.values[2]
            property real bar3: Cava.values[3]
            property real bar4: Cava.values[4]
            property real bar5: Cava.values[5]
            property real bar6: Cava.values[6]
            property real bar7: Cava.values[7]
            property real bar8: Cava.values[8]
            property real bar9: Cava.values[9]

            property color colorFg: Colors.primary
            property color colorBg: Colors.background

            property color colorA: Cava.colors[0]
            property color colorB: Cava.colors[1]
            property color colorC: Cava.colors[2]

            property real gxshift: xshift
            property real t: 0

            fragmentShader: "root:shaders/wall.frag.qsb"

            Timer {
                interval: 1000 / 60
                running: true
                repeat: true
                onTriggered: {
                    t += 0.005 + 0.1 * Cava.avg_t;

                    if (t > 1000) {
                        t = 0;
                    }
                }
            }

            Connections {
                target: Mpris.players.values[0]

                function onTrackTitleChanged() {
                    xshift = 10000;
                    xshiftReset.running = true;
                }
            }

            Timer {
                id: xshiftReset
                interval: 250
                running: false
                onTriggered: {
                    xshift = 0;
                }
            }
        }
    }
}
