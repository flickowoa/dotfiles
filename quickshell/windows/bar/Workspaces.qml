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
                    color: activeWs ? Colors.on_primary : Colors.on_background
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

        Timer {
            id: xshiftReset
            interval: 150
            running: false
            onTriggered: {
                shaderClip.xshift = 0;
                xshiftReset.running = false;
            }
        }

        Connections {
            target: workspaces
            function onActivePillChanged() {
                blur.from_x = blur.x;
                blur.to_x = activePill.x;
                blur.x = blur.to_x;
                shaderClip.xshift = (blur.to_x - blur.from_x);
                xshiftReset.running = true;
            }
        }

        x: 0

        transparentBorder: true

        Behavior on x {
            NumberAnimation {
                duration: 400
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
    }

    ClippingRectangle {
        id: shaderClip
        // visible: false

        height: activePill.height
        width: activePill.width

        property real xshift: 0

        Behavior on xshift {
            NumberAnimation {
                duration: 1000
                easing.type: Easing.OutExpo
            }
        }

        // color: "transparent"

        radius: 50

        Rectangle {
            id: shader
            color: Colors.background
            anchors.fill: parent

            layer.enabled: true
            layer.effect: ShaderEffect {
                property int gheight: parent.height
                property int gwidth: parent.width

                property int heightOverflow: 80
                property int widthOverflow: 0

                property real treshold: 0
                property real strength: 5

                property real pointA_x: 0
                property real pointA_y: 0
                property real pointB_x: gwidth / 2
                property real pointB_y: gheight / 2
                property real pointC_x: gwidth
                property real pointC_y: gheight

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

                property bool verticalWarp: false

                Behavior on radiusA {
                    NumberAnimation {
                        duration: Config.slowPill ? 5000 : 0
                        easing.type: Easing.OutExpo
                    }
                }

                Behavior on radiusB {
                    NumberAnimation {
                        duration: Config.slowPill ? 5000 : 0
                        easing.type: Easing.OutExpo
                    }
                }

                Behavior on radiusC {
                    NumberAnimation {
                        duration: Config.slowPill ? 5000 : 0
                        easing.type: Easing.OutExpo
                    }
                }

                property color colorA: Cava.colors[2]
                property color colorB: Cava.colors[2]
                property color colorC: Cava.colors[2]

                property real minDistance: gwidth / 10

                property real invert: -1

                fragmentShader: "root:shaders/bubble.frag.qsb"

                function distance(x1, y1, x2, y2) {
                    return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
                }

                Connections {
                    target: Cava
                    function onValuesChanged() {
                        let points = [[pointA_x, pointA_y, radiusA, pointA_vx, pointA_vy, angleA], [pointB_x, pointB_y, radiusB, pointB_vx, pointB_vy, angleB], [pointC_x, pointC_y, radiusC, pointC_vx, pointC_vy, angleC]];

                        strength = 0.3;
                        // blur.radius = 50 * Cava.avg_t;
                        // blur.samples = 16 + 16 * (1 - Cava.avg_t);
                        // bright.brightness = 0 + 1 * Cava.avg_t;
                        // bright.contrast = 0.5 + 0.5 * Cava.avg_t;

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
                            // vx += Math.cos(angle) * gwidth / 2 * t;
                            vy = -30 + 10 * Math.random();
                            // vy += Math.sin(angle) * gheight / 2 * t;
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
                                y = gheight + heightOverflow;
                            }

                            if (y > gheight + heightOverflow) {
                                y = 0 - heightOverflow;
                            }

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

                            vx *= 0.9 * Math.random();
                            vy *= 0.9 * Math.random();

                            if (shaderClip.xshift) {
                                vx += shaderClip.xshift;
                            }

                            x += vx * 0.01;
                            y += vy * 0.01;

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
                            point[2] = 50;
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
}
