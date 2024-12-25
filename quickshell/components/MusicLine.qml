import QtQuick
import Quickshell
import Quickshell.Io
import Quickshell.Wayland
import Quickshell.Hyprland
import QtQuick.Layouts

import "root:/"

Rectangle {
    height: 150
    width: 500
    color: "transparent"

    property int sections: 3;

    property variant values;
    property double prev_end : 0.0;

    onValuesChanged: {
        canvas.requestPaint();
    }

    Process {
        id: cava
        running: true
        command: [Qt.resolvedUrl("root:/scripts/cava.sh").toString().replace("file://", ""),sections]
		
		stdout: SplitParser {
			onRead: data => {
                var bars = data.split(";");
                bars.pop();

                values = bars.map(function(bar) {
                    return parseFloat(bar)/1000;
                });
            }
        }
    }

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

    Canvas {
        id: canvas
        anchors.fill: parent

        onPaint: {
            var ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            
            ctx.moveTo(0, canvas.height/2);

            for (var i = 0; i < sections; i++) {
                ctx.strokeStyle = (i%2==0?Qt.darker(color_mix(Colors.primary, Colors.tertiary, i/sections),1):color_mix(Colors.primary, Colors.tertiary, i/sections));

                ctx.lineWidth = 1+3*;
                ctx.beginPath();
                ctx.bezierCurveTo(
                    0,
                    canvas.height/2,
                    (i)*canvas.width/(sections),

                    // height
                    canvas.height/2 + (i<sections/4 || i > sections*3/4 ?-(canvas.height) * (values[i]):(canvas.height) * (values[i])),

                    canvas.width,
                    canvas.height/2
                );
                ctx.moveTo(0, canvas.height/2);
                ctx.stroke();
                ctx.closePath();
            }
            
           
        }
    }
}