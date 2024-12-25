import QtQuick
import Quickshell
import Quickshell.Io
import Quickshell.Wayland
import Quickshell.Hyprland
import QtQuick.Layouts
import Qt5Compat.GraphicalEffects
import QtQuick.Shapes

import "root:/"

Rectangle {
    id: musicLineContainer
    height: parent.height
    width: curveWidth * (1+curveSpill*2/10)
    color: "transparent"

    property int segments: 10;
    property int curveWidth: Config.barWidth/10;
    property int curveHeight: Config.barHeight/2;
    property double curveSpill: 1.5;

    property variant cavaData: [0,0,0,0];

    Process {
        id: cava
        running: true
        command: [Qt.resolvedUrl("root:/scripts/cava.sh").toString().replace("file://", ""),segments]
		
		stdout: SplitParser {
			onRead: data => {
                var bars = data.split(";");
                bars.pop();

                cavaData = bars.map(function(bar) {
                    return parseFloat(bar)/1000;
                });
            }
        }
    }

    Glow {
        anchors.fill: parent
        radius: 15
        samples: 17
        color: Qt.rgba(0, 0, 0, 0.2)
        source: musicLine
    }

    Shape {
        id: musicLine
        width: parent.width
        height: parent.height
        anchors.centerIn: parent
        preferredRendererType: Shape.CurveRenderer
        // asynchronous: true

        Instantiator {
            model: segments
            onObjectAdded: (index,cubicPath) => {
                print("Object added "+cubicPath)
                cubicPath.strokeColor1 = Qt.binding(() => Colors.primary);
                cubicPath.strokeColor2 = Qt.binding(() => Colors.tertiary);
                cubicPath.segments = segments;
                cubicPath.curveHeight = curveHeight;
                cubicPath.curveWidth = curveWidth;
                // cubicPath.strokeWidth = 4;
                musicLine.data.push(cubicPath)
            }
            delegate: ShapePath {
                readonly property int index: model.index
                property color strokeColor1: "white";
                property color strokeColor2: "black";

                property int segments: 100;

                property int curveHeight: 100;
                property int curveWidth: 200;

                function color_mix (color1, color2, weight) {
                    var w = weight * 2 - 1;
                    var w1 = (w/2) + 0.5;
                    var w2 = 1 - w1;
                    return Qt.rgba(
                        color1.r * w1 + color2.r * w2,
                        color1.g * w1 + color2.g * w2,
                        color1.b * w1 + color2.b * w2,
                        color1.a * w1 + color2.a * w2
                    );
                }

                strokeWidth: 6-2*cavaData[index];
                strokeColor: (index%2==0?Qt.darker(color_mix(strokeColor1, strokeColor2, index/segments),1.5):color_mix(strokeColor1, strokeColor2, index/segments))
                fillColor: "transparent"
                startX: 0; startY: parent.height/2
                pathHints: ShapePath.PathQuadratic
                PathCubic { 
                    x: curveWidth;
                    y: parent.height/2;

                    control1X: (index>segments/2?index-1+cavaData[index]*curveSpill:index-1-cavaData[index]*curveSpill)* curveWidth/(segments);
                    control1Y:  parent.height/2 + (index<segments/4 || index > segments*3/4 ?-(curveHeight) * (cavaData[index]):(curveHeight) * (cavaData[index]));

                    control2X:  curveWidth;
                    control2Y:  parent.height/2;
                }
            }
        }

        ShapePath {
            strokeColor: "transparent"
            fillColor: Colors.primary
            startX: 0; startY: parent.height/2
            // pathHints: ShapePath.PathQuadratic
 
            PathAngleArc {
                centerX: 0; centerY: parent.height/2
                radiusX: 6; radiusY: 6
                startAngle: 0
                sweepAngle: 360
            }
        }

        ShapePath {
            strokeColor: "transparent"
            fillColor: Colors.tertiary
            startX: 0; startY: parent.height/2
            // pathHints: ShapePath.PathQuadratic
 
            PathAngleArc {
                centerX: curveWidth; centerY: parent.height/2
                radiusX: 6; radiusY: 6
                startAngle: 0
                sweepAngle: 360
            }
        }
    }
    
}