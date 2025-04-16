import QtQuick
import Quickshell
import Quickshell.Widgets
import Qt5Compat.GraphicalEffects
import Quickshell.Services.Mpris
import Quickshell.Hyprland

import "root:components"
import "root:"

Rectangle {
    id: island

    anchors.centerIn: parent

    property int pillWidth: songname.width + 200
    // property int pillWidth: parent.width
    property int pillHeight: Config.pillHeight

    property real xshift: 0

    Behavior on xshift {
        NumberAnimation {
            duration: 1000
            easing.type: Easing.OutExpo
        }
    }

     Timer {
                        id: xshiftReset
                        interval: 250
                        running: false
                        onTriggered: {
                            xshift = 0;
                            // cavacon.onValuesChanged();
                        }
                    }
    

    height: pillHeight
    width: pillWidth + 20

    Behavior on pillWidth {
        NumberAnimation {
            duration: 300
            easing.type: Easing.InOutQuad
        }
    }

    color: "transparent"

    Component.onCompleted: {
        console.log("Mpris.players", Mpris.players.values[0]);
    }

    RectangularGlow {
        id: shadow
        anchors.centerIn: parent
        height: pillHeight
        width: pillWidth
        color: Colors.primary

        cornerRadius: content.radius
    }

    GaussianBlur {
        id: blur
        source: bright
        radius: 50
        samples: 32
        visible: true
        anchors.centerIn: parent
        height: bright.height
        width: bright.width
        transparentBorder: true

        // Behavior on radius {
        //     NumberAnimation {
        //         duration: Config.slowPill ? 5000 : 0
        //         easing.type: Easing.InOutQuad
        //     }
        // }

        // Behavior on samples {
        //     NumberAnimation {
        //         duration: Config.slowPill ? 5000 : 0
        //         easing.type: Easing.InOutQuad
        //     }
        // }
    }

    BrightnessContrast {
        id: bright
        anchors.centerIn: parent
        height: cava.height
        width: cava.width
        visible: false
        source: cava
        brightness: -2
        contrast: 2

        // Behavior on brightness {
        //     NumberAnimation {
        //         duration: Config.slowPill ? 5000 : 0
        //         easing.type: Easing.OutExpo
        //     }
        // }

        // Behavior on contrast {
        //     NumberAnimation {
        //         duration: Config.slowPill ? 5000 : 0
        //         easing.type: Easing.OutExpo
        //     }
        // }
    }

    ShaderEffectSource {
        id: cava
        visible: false
        height: pillHeight + 5
        width: pillWidth + 5
        mipmap: false
        anchors {
            horizontalCenter: parent.horizontalCenter
        }
        sourceItem: contentwrap
        live: true
        wrapMode: ShaderEffectSource.ClampToEdge
        // hideSource: true
    }

    Item {
        id: contentwrap
        // visible: false
        anchors.centerIn: parent
        width: pillWidth
        height: pillHeight

        ClippingRectangle {
            id: contentclip
            anchors.fill: parent
            // visible: false
            color: "transparent"

            anchors {
                verticalCenter: parent.verticalCenter
            }

            width: pillWidth
            height: pillHeight

            // implicitWidth: content.width
            // implicitHeight: pillHeight

            radius: content.radius

            layer.enabled: true



            Pill {
                id: content
                visible: true

                color: Colors.background

                // radius: 0

                y: 0
                width: pillWidth + 10
                height: pillHeight

                anchors {
                    horizontalCenter: parent.horizontalCenter
                    verticalCenter: parent.verticalCenter
                }

                layer.enabled: true
                layer.effect: ShaderEffect {
                    property int gheight: parent.height
                    property int gwidth: parent.width

                    property int heightOverflow: 50
                    property int widthOverflow: 0

                    property real treshold: 0
                    property real strength: 5

                    property real pointA_x: 10
                    property real pointA_y: gheight / 2
                    property real pointB_x: gwidth / 2
                    property real pointB_y: gheight / 2
                    property real pointC_x: gwidth - 10
                    property real pointC_y: gheight / 2

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

                    property color colorA: Cava.colors[1]
                    property color colorB: Cava.colors[2]
                    property color colorC: Cava.colors[0]

                    property real minDistance: gwidth / 10

                    property real gxshift: xshift

                    property real invert: Config.darkMode ? 1 : 0.5

                    fragmentShader: "root:shaders/pill.frag.qsb"

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

                   

                    Connections {
                        id: cavacon
                        target: Cava
                        function onValuesChanged() {
                            let points = [[pointA_x, pointA_y, radiusA, pointA_vx, pointA_vy, angleA], [pointB_x, pointB_y, radiusB, pointB_vx, pointB_vy, angleB], [pointC_x, pointC_y, radiusC, pointC_vx, pointC_vy, angleC]];

                            strength = (Config.darkMode ? 5 : 3) - 3 * Cava.avg_t;
                            blur.radius = 50 * Cava.avg_t;
                            blur.samples = 16 + 16 * (1 - Cava.avg_t);
                            bright.brightness = 0 + 1 * Cava.avg_t;
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
                                vy *= 0.99 * t;
                                if (xshift)
                                    vx = 0;
                                vx -= xshift;

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
                                point[2] = (12 * t) + (xshift/100);
                                // console.log("point[2]", xshift);
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
    Text {
        id: songname
        // visible: false

        property bool playing: Mpris.players.values[0].isPlaying

        property string activeWindow: ""

        Connections {
            target: Hyprland
            function onRawEvent(event) {
                if (songname.playing) {
                    return
                }
                if (event.name === "activewindow") {
                    var args = event.data.split(",");

                    var title = args[args.length - 1];
                    songname.activeWindow = title;
                    console.log("activewindow", title);
                    island.xshift = 1000;
                    xshiftReset.running = true;
                }
            }
        }

        text: playing ? Mpris.players.values[0].trackTitle : activeWindow
        color: Config.darkMode ? Cava.avg_t > 0 ? Colors.background : Colors.on_background : Cava.avg_t > 0 ? Colors.primary : Colors.on_background
        x: xshift
        font.weight: 700
        font.pixelSize: 20
        anchors.centerIn: parent
    }

    // DropShadow {
    //     anchors.fill: songname
    //     source: songname
    //     radius: 20
    //     samples: 20
    //     color: Cava.background
    //     visible: true
    // }
}
