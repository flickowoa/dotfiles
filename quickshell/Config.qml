pragma Singleton

import QtQuick
import Quickshell

import "root:/"



Singleton {

    function alpha(color, alpha) {
        return Qt.rgba(color.r, color.g, color.b, alpha)
    }

    // bar
    readonly property int barHeight : 80
    readonly property int barWidth : 2000

    // workspace
    readonly property int workspaceGap : 20

    readonly property bool autoWorkspaceFontSize : true
    property int workspaceFontSize : 20

    // clock

    readonly property bool clockFixedWidth : false
    readonly property bool clockShowSeconds : true
    readonly property bool clockNoBackgroundForZero : true
    readonly property bool clock24Hour : false

    readonly property int clockTextShadowWidth : 0
    readonly property int clockBoxShadowWidth : 0
    readonly property int clockSeperatorWidth : 10

    readonly property color clockColor : Colors.primary
    readonly property color clockBoxShadow : Colors.background
    readonly property color clockSeperator1Color : alpha(Colors.surface_bright,0.8)
    readonly property color clockSeperator2Color : alpha(Colors.surface,0.8)

    //

    property int workspaceBottomMargin : 10

    readonly property url wallpaperImage : "root:/assets/hill.mp4"
    readonly property bool darkMode : true
}