import QtQuick
import Quickshell
import Quickshell.Widgets
import Qt5Compat.GraphicalEffects

import "root:components"
import "root:"

Rectangle {
    id: island
    height: Config.pillHeight

    // GaussianBlur {
    //     anchors.fill: contentclip
    //     source: content
    //     radius: 40
    //     transparentBorder: true
    // }


    ClippingRectangle {
        id: contentclip
        color: "transparent"

        anchors {
            verticalCenter: parent.verticalCenter
        }

        implicitWidth: content.width
        implicitHeight: Config.pillHeight

        radius: 50

        layer.enabled: true

        Pill {
            id: content

            color: "white"

            y: 0
            width: childrenRect.width ? childrenRect.width + Config.pillHPadding : Config.pillWidth * 4
            height: Config.pillHeight

            anchors {
                horizontalCenter: parent.horizontalCenter
            }

            layer.enabled: true
            layer.effect: ShaderEffect {
                property real t: 0
                property int gheight: parent.height
                property int gwidth: parent.width

                // property var pointA: Qt.point(width / 3, height / 2)
                // property var pointB: Qt.point(2 * width / 3, height / 2)

                property real treshold: 0

                property real pointA_x: 10
                property real pointA_y: 10
                property real pointB_x: 0
                property real pointB_y: 0
                property real pointC_x: 0
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

                // Behavior on radiusA {
                //     NumberAnimation {
                //         duration: 500
                //         easing.type: Easing.InOutCubic
                //     }
                // }

                // Behavior on radiusB {
                //     NumberAnimation {
                //         duration: 500
                //         easing.type: Easing.InOutCubic
                //     }
                // }

                // Behavior on radiusC {
                //     NumberAnimation {
                //         duration: 1000
                //         easing.type: Easing.InOutCubic
                //     }
                // }

                fragmentShader: "root:shaders/pill.frag.qsb"

                NumberAnimation on t {
                    from: 0
                    to: 0.5
                    duration: 1000
                    loops: Animation.Infinite
                    running: true
                }

                function distance(x1, y1, x2, y2) {
                    return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
                }

                Connections {
                    target: Cava
                    function onValuesChanged() {
                        let points = [[pointA_x, pointA_y, radiusA, pointA_vx, pointA_vy], [pointB_x, pointB_y, radiusB, pointB_vx, pointB_vy], [pointC_x, pointC_y, radiusC, pointC_vx, pointC_vy]];

                        points.forEach(function (point, index) {
                            let x = point[0];
                            let y = point[1];
                            let r = point[2];
                            let vx = point[3];
                            let vy = point[4];
                            let cx = gwidth / 2;
                            let cy = gheight / 2;

                            let dcx = cx - x;
                            let dcy = cy - y;

                            let t = Cava.values[index];

                            vx += gwidth * (Math.random() - 0.5);
                            vy += gheight * (Math.random() - 0.5);

                            // console.log("vx", vx, "vy", vy);

                            vx *= 0.999 * t;
                            vy *= 0.999 * t;

                            vx += dcx * 0.01;
                            vy += dcy * 0.01;

                            // wall

                            if (x < 0) {
                                x = r;
                                vx = -vx;
                            }

                            if (x > gwidth) {
                                x = gwidth - r;
                                vx = -vx;
                            }

                            if (y < 0) {
                                y = r;
                                vy = -vy;
                            }

                            if (y > gheight) {
                                y = gheight - r;
                                vy = -vy;
                            }

                            points.forEach(function (other, other_index) {
                                if (index !== other_index) {
                                    let ox = other[0];
                                    let oy = other[1];
                                    let or = other[2];
                                    let ovx = other[3];
                                    let ovy = other[4];

                                    let d = distance(x, y, ox, oy);
                                }
                            });

                            x += vx * 0.03;
                            y += vy * 0.03;

                            point[0] = x;
                            point[1] = y;
                            point[2] = 10 * Cava.values[index];
                            point[3] = vx;
                            point[4] = vy;
                        });

                        // // apply velocities
                        // for (let i = 0; i < points.length; i++) {
                        //     points[i][0] += points[i][3] * 0.01;
                        //     points[i][1] += points[i][4] * 0.01;
                        // }

                        // for (let i = 0; i < points.length; i++) {
                        //     points[i][2] = 5 * Cava.values[i];
                        // }

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
                    }
                }
            }
        }
    }
}
