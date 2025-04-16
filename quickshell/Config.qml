pragma Singleton

import QtQuick
import QtQuick.Window
import Quickshell

Singleton {

    property bool centerPillOnScreen: false

    property bool darkMode: false

    property bool musicMode: false
    property bool slowPill: false

    property int barVMargin: Screen.desktopAvailableHeight * 0.01
    property int barHMargin: Screen.desktopAvailableWidth * 0.01
    property int barHeight: Screen.desktopAvailableHeight * 0.035

    property int pillHeight: barHeight * 1
    property int pillWidth: Screen.desktopAvailableWidth * 0.04
    property int pillHPadding: Screen.desktopAvailableWidth * 0.01
}
