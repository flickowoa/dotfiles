import QtQuick
import Quickshell
import Quickshell.Widgets
import Qt5Compat.GraphicalEffects
import Quickshell.Services.Mpris

import "root:components"
import "root:"

Rectangle {
    id: island
    height: Config.pillHeight
    width: Config.pillWidth * 4 + 20

    color: "transparent"

    Component.onCompleted: {
        console.log("mpris", Mpris.players[0]);
    }

    GaussianBlur {
        id: blur
        source: bright
        radius: 30
        samples: 16
        anchors.centerIn: parent
        height: Config.pillHeight
        width: Config.pillWidth * 4
        transparentBorder: true
    }

    BrightnessContrast {
        id: bright
        anchors.centerIn: parent
        height: Config.pillHeight
        width: Config.pillWidth * 4
        source: cava
        brightness: 0.5
        contrast: 1
    }

    ShaderEffectSource {
        id: cava
        visible: false
        height: Config.pillHeight
        width: Config.pillWidth * 4
        mipmap: true
        anchors {
            horizontalCenter: parent.horizontalCenter
        }
        sourceItem: contentwrap
        // live: true
        wrapMode: ShaderEffectSource.ClampToEdge
        // hideSource: true
    }
    Item {
        id: contentwrap
        // visible: false
        anchors.centerIn: parent
        width: Config.pillWidth * 4
        height: Config.pillHeight

        ClippingRectangle {
            id: contentclip
            anchors.fill: parent
            // visible: false
            color: "transparent"

            anchors {
                verticalCenter: parent.verticalCenter
            }

            width: Config.pillWidth * 4
            height: Config.pillHeight

            implicitWidth: content.width
            implicitHeight: Config.pillHeight * 0.5

            radius: content.radius

            layer.enabled: true

            Pill {
                id: content
                // visible: false
                color: "white"

                // radius: 0

                y: 0
                width: childrenRect.width ? childrenRect.width + Config.pillHPadding : Config.pillWidth * 4 + 5
                height: Config.pillHeight

                anchors {
                    horizontalCenter: parent.horizontalCenter
                }

                layer.enabled: true
                layer.effect: ShaderEffect {
                    property real t: 0
                    property int gheight: parent.height
                    property int gwidth: parent.width

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

                            let avg_t = Cava.values.reduce((a, b) => a + b, 0) / Cava.values.length;

                            blur.radius = 30 * avg_t;
                            blur.samples = 16 * avg_t;
                            bright.brightness = 0.5 + 0.5 * avg_t;

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

                                vx *= 0.999 * t;
                                vy *= 0.999 * t;

                                vx += dcx * 0.01;
                                vy += dcy * 0.01;

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

                                        if (d < r + or) {
                                            vx = -vx;
                                            vy = -vy;
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

                                x += vx * 0.01;
                                y += vy * 0.01;

                                point[0] = x;
                                point[1] = y;
                                point[2] = 10 * Cava.values[index];
                                point[3] = vx;
                                point[4] = vy;
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
                        }
                    }
                }
            }
        }
    }
    Text {
        id: songname
        text: "t"
        font.pixelSize: 20
        anchors.centerIn: parent
    }
}
