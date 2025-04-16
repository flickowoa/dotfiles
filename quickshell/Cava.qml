pragma Singleton

import QtQuick
import QtQuick.Window
import Quickshell
import Quickshell.Io

Singleton {

    property var values: []

    property int barCount: 10

    property real avg_t: 0

    // vec4 colorA = vec4(0.95, 0.59, 1.0, 1.0);
    // vec4 colorB = vec4(0.95, 0.42, 1.0, 1.0);
    // vec4 colorC = vec4(1.0, 0.58, 0.78, 1.0);

    property color colorA: Qt.rgba(0.95, 0.59, 1.0, 1.0)
    property color colorB: Qt.rgba(0.95, 0.42, 1.0, 1.0)
    property color colorC: Qt.rgba(1.0, 0.58, 0.78, 1.0)
    property var colors: [colorA, colorB, colorC]

    function pulse() {
        for (var i = 0; i < values.length; i++) {
            values[i] += 0.3;
        }
        return new Promise((resolve) => {
            setTimeout(() => {
                // decrease values by 0.3 for 1 second
                for (var i = 0; i < values.length; i++) {
                    values[i] -= 0.3;
                }
                resolve();
            }, 1000);
        });
    }

    Process {
        id: cava
        running: true
        command: [Qt.resolvedUrl("root:/scripts/cava.sh").toString().replace("file://", ""), barCount]

        stdout: SplitParser {
            onRead: data => {
                var bars = data.split(";");
                bars.pop();

                values = bars.map(function (bar) {
                    return parseFloat(bar) / 1000;
                });

                avg_t = values.reduce((a, b) => a + b, 0) / values.length;
                // console.log(values);
            }
        }
    }
}
