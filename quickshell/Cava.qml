pragma Singleton

import QtQuick
import QtQuick.Window
import Quickshell
import Quickshell.Io

Singleton {

    property var values: []

    property int barCount: 5

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
                // console.log(values);
            }
        }
    }
}
