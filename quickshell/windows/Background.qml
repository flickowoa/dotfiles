import QtQuick
import Quickshell
import Quickshell.Io
import Quickshell.Wayland
import Quickshell.Hyprland
import QtQuick.Controls
import QtQuick.Layouts
import Qt5Compat.GraphicalEffects

import "root:"

PanelWindow {
    id: background

    exclusionMode: ExclusionMode.Ignore
    WlrLayershell.layer: WlrLayer.Background
    color: "white"

    property color accentColor: Config.darkMode ? Colors.background : Colors.primary

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
        anchors.fill: parent

        color: "transparent"
        Image {
            id: bg
            cache: false
            visible: false
            asynchronous: false
            anchors.fill: parent
            fillMode: Image.PreserveAspectCrop

            source: Config.darkMode ? "root:../wallpapers/rocket.jpg" : "root:../wallpapers/plane.png"

            // Connections {
            //     target: Colors
            //     onCoverArtUpdateChanged: () => {
            //         bg.source = "/tmp/dreamyv2/cover.png?" + Math.random();
            //     }
            // }
        }

        Colorize {
            id: colorize
            anchors.fill: bg
            source: bg
            hue: accentColor.hslHue
            saturation: accentColor.hslSaturation
            lightness: accentColor.hslLightness
        }

        BrightnessContrast {
            id: bright
            anchors.fill: colorize
            source: colorize
            // brightness: -0.7
            // brightness: 0.5
            // contrast: 0.5
        }

        layer.enabled: false
        layer.effect: ShaderEffect {
            property int gheight: bg.height
            property int gwidth: bg.width

            property int heightOverflow: 50
            property int widthOverflow: 0

            property real treshold: 0
            property real strength: 70
            property int invert: 1

            property real pointA_x: 10
            property real pointA_y: 0
            property real pointB_x: gwidth / 2
            property real pointB_y: 0
            property real pointC_x: gwidth - 10
            property real pointC_y: 0

            property real pointA_vx: 0
            property real pointA_vy: 0

            property real pointB_vx: 0
            property real pointB_vy: 0

            property real pointC_vx: 0
            property real pointC_vy: 0

            property real radiusA: 2
            property real radiusB: 2
            property real radiusC: 2

            property real angleA: 0
            property real angleB: 0
            property real angleC: 0

            property color colorA: Cava.colors[0]
            property color colorB: Cava.colors[1]
            property color colorC: Cava.colors[2]

            property real minDistance: gwidth / 10

            property real gxshift: xshift

            fragmentShader: "root:shaders/wall.frag.qsb"

            function distance(x1, y1, x2, y2) {
                return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
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

            Connections {
                target: Cava
                function onValuesChanged() {
                    let points = [[pointA_x, pointA_y, radiusA, pointA_vx, pointA_vy, angleA], [pointB_x, pointB_y, radiusB, pointB_vx, pointB_vy, angleB], [pointC_x, pointC_y, radiusC, pointC_vx, pointC_vy, angleC]];

                    points.forEach(function (point, index) {
                        let x = point[0];
                        let y = point[1];
                        let r = point[2];
                        let vx = point[3];
                        let vy = point[4];
                        let angle = point[5];

                        let cx = gwidth / 2;
                        let cy = gheight / 2;

                        let dcx = cx - x;
                        let dcy = cy - y;
                        // split Cava.values into 3 by avging them
                        // let avg_t = Cava.avg_t;

                        let slice = Cava.values.slice(Cava.barCount / 3 * index, Cava.barCount / 3 * (index + 1));

                        // console.log(`slice ${index}`, slice);
                        let t = slice.reduce((a, b) => a + b, 0) / slice.length;

                        // vx += -25 * avg_t;
                        angle += 0.1 * t;
                        angle = angle % (2 * Math.PI);
                        // angle
                        // console.log("angle", angle);
                        vx += Math.cos(angle) * gwidth / 2 * t;
                        vy += Math.sin(angle) * gheight / 2 * t;
                        // console.log("vx", vx);

                        // vx += dcx * 0.01;
                        // vy += dcy * 0.01;

                        // if (x < 0) {
                        //     x = r;
                        //     vx = -vx;
                        // }

                        // if (x > gwidth) {
                        //     x = gwidth - r;
                        //     vx = -vx;
                        // }

                        // if (y < 0) {
                        //     y = r;
                        //     vy = -vy;
                        // }

                        // if (y > gheight) {
                        //     y = gheight - r;
                        //     vy = -vy;
                        // }

                        if (x < -widthOverflow) {
                            x = gwidth;
                        }

                        if (x > gwidth + widthOverflow) {
                            x = 0;
                        }

                        if (y < -heightOverflow) {
                            y = gheight;
                        }

                        if (y > gheight + heightOverflow) {
                            y = 0;
                        }

                        points.forEach(function (other, other_index) {
                            if (index !== other_index && other_index !== 1) {
                                let ox = other[0];
                                let oy = other[1];
                                let or = other[2];
                                let ovx = other[3];
                                let ovy = other[4];

                                let d = distance(x, y, ox, oy);

                                let dxox = x - ox;
                                let dyoy = y - oy;

                                if (d < minDistance) {
                                    vx += dxox * 0.5;
                                    vy += dyoy * 0.5;
                                }
                            }
                        });

                        // if (vx > 100) {
                        //     vx = 100;
                        // }

                        // if (vy > 100) {
                        //     vy = 100;
                        // }

                        // if (vx < -100) {
                        //     vx = -100;
                        // }

                        // if (vy < -100) {
                        //     vy = -100;
                        // }

                        vx *= 0.99 * t;
                        // vy *= 0.99 * t;

                        x += vx * 0.01;
                        // y += vy * 0.01;

                        // console.log("point", point);

                        // nan check
                        if (isNaN(x) || isNaN(y) || isNaN(vx) || isNaN(vy)) {
                            console.log("nan detected");
                            x = 0;
                            y = 0;
                            vx = 0;
                            vy = 0;
                        }

                        point[0] = x;
                        point[1] = y;
                        point[2] = 12 * t;
                        point[3] = vx;
                        point[4] = vy;
                        point[5] = angle;
                    });

                    pointA_x = points[0][0];
                    pointA_y = points[0][1];
                    pointB_x = points[1][0];
                    pointB_y = points[1][1];
                    pointC_x = points[2][0];
                    pointC_y = points[2][1];

                    radiusA = points[0][2];
                    radiusB = points[1][2];
                    radiusC = points[2][2];

                    pointA_vx = points[0][3];
                    pointA_vy = points[0][4];
                    pointB_vx = points[1][3];
                    pointB_vy = points[1][4];
                    pointC_vx = points[2][3];
                    pointC_vy = points[2][4];

                    angleA = points[0][5];
                    angleB = points[1][5];
                    angleC = points[2][5];
                }
            }
        }
    }
}
