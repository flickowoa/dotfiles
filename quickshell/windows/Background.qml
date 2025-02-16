import QtQuick
import Quickshell
import Quickshell.Io
import Quickshell.Wayland
import Quickshell.Hyprland
import QtQuick.Controls
import QtQuick.Layouts


PanelWindow {
	id: background
    
	exclusionMode: ExclusionMode.Ignore
    WlrLayershell.layer: WlrLayer.Background

    color: "white"

    anchors {
        top: true
        left: true
        right: true
        bottom: true
    }

    Image {
        id: bg
        source: "root:../wallpapers/cloud.png"
        anchors.fill: parent
        fillMode: Image.PreserveAspectCrop
    }

}
