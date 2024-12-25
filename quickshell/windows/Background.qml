import QtQuick
import Quickshell
import Quickshell.Io
import Quickshell.Wayland
import Quickshell.Hyprland

import "root:/components" as Components

PanelWindow {
	id: background
    
	exclusionMode: ExclusionMode.Ignore
    WlrLayershell.layer: WlrLayer.Background

    color: "transparent"

    anchors {
        top: true
        left: true
        right: true
        bottom: true
    }

	Components.BackgroundImage {}

    Components.WorkspaceLine {}
}