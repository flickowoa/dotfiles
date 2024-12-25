import QtQuick
import Quickshell
import Quickshell.Io
import Quickshell.Wayland
import Quickshell.Hyprland
import QtMultimedia
import QtQuick.Shapes

import "root:/"

Rectangle {
    height: Hyprland.focusedMonitor.height
    width: Hyprland.focusedMonitor.width

    color: Colors.surface ?? "black"

    Video {
        id: wallpaper
        source: Config.wallpaperImage
        muted: true

        autoPlay: true
        loops: MediaPlayer.Infinite

        fillMode : VideoOutput.Stretch

        property int sourceHeight : wallpaper.metaData.value(27).height
        property int sourceWidth : wallpaper.metaData.value(27).width

        property real height_scale: sourceHeight / Hyprland.focusedMonitor.height
        height: sourceHeight / height_scale
        width: sourceWidth / height_scale

        property int extraWidth: wallpaper.width - Hyprland.focusedMonitor.width
        property int wallpaper_x: - (Hyprland.focusedMonitor.activeWorkspace.id - 1) * extraWidth / 9

        x: wallpaper_x

        Behavior on x {
            NumberAnimation {
                duration: 570

                easing.bezierCurve: [0.23,1,0.61,1,1,1]
                easing.type: Easing.BezierSpline
            }
        }
    }

    layer.enabled: true
        layer.effect: ShaderEffect {
                    id: shaderEffect
                    anchors.fill: parent
                    // width: parent.width/2
                    // height: parent.height/2

                    Process {
                id: cursorpos
                running: true
                command: [ "hyprctl", "cursorpos" ]
                stdout: SplitParser {
                    onRead: data => {
                        var pos = data.split(" ");
                        shaderEffect.pointA = Qt.point(parseInt(pos[0]), parseInt(pos[1]));
                    }
                }
            }

            Timer {
                id: timer
                interval: 1000 / 165
                running: true
                repeat: true

                onTriggered: {

                    function updateCursor() {
                        cursorpos.running = false;
                        cursorpos.running = true;
                    }

                    updateCursor();

                    function distance(p1, p2) {
                        return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
                    }

                    var d = distance(shaderEffect.pointA, Qt.point(parent.width/2,parent.height/2));

                    var dx = shaderEffect.pointA.x - shaderEffect.pointB.x;
                    var dy = shaderEffect.pointA.y - shaderEffect.pointB.y;

                    shaderEffect.pointB.x += 10*dx/500
                    shaderEffect.pointB.y += 10*dy/500

                    shaderEffect.pointB = shaderEffect.pointB;
                }
            }

                    property int gheight: parent.height
                    property int gwidth: parent.width

                    property var points: [Qt.point(200,200),Qt.point(500,500),Qt.point(width,height)]

                    property var pointA: Qt.point(width, height)
                    property var pointB: Qt.point(width/2, height/2)

                    fragmentShader: "shader.frag.qsb"
                }
    
    
}

