import QtQuick
import Quickshell
import Quickshell.Io
import Quickshell.Wayland
import Quickshell.Hyprland
import QtQuick.Layouts
import QtQuick.Shapes
import Qt5Compat.GraphicalEffects

import "root:/"

Rectangle {
    id: seperatorContainer
    height: 100
    // width: 2000
    color: "transparent"

    anchors {
        fill: parent
    }

    Glow {
        anchors.fill: parent
        radius: 15
        samples: 17
        color: Qt.rgba(0, 0, 0, 0.2)
        source: seperatorLine
    }

    Shape {
        id: seperatorLine
        width: parent.width
        height: parent.height
        anchors.centerIn: parent
        preferredRendererType: Shape.CurveRenderer
        // asynchronous: true

        ShapePath {
            strokeColor: Colors.primary
            fillColor: "transparent"
            strokeWidth: 6
            startX: 0; startY: parent.height/2
            // pathHints: ShapePath.PathQuadratic
 
            PathLine {
                x: parent.width;
                y: parent.height/2
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
                centerX: parent.width; centerY: parent.height/2
                radiusX: 6; radiusY: 6
                startAngle: 0
                sweepAngle: 360
            }
        }
    }
    
}