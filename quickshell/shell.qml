import QtQuick
import Quickshell
import Quickshell.Io
import Quickshell.Wayland
import Quickshell.Hyprland

import "root:/"


ShellRoot {
	id: root

	Main {	}

	// Timer {
	// 	interval: 500
	// 	running: true
	// 	onTriggered: {
	// 		var shellComponent = Qt.createComponent("root:/Main.qml")
	// 		if (shellComponent.status == Component.Ready) {
	// 			var shell = shellComponent.createObject(root)
	// 			if (shell == null) {
	// 				console.log("Error creating shell")
	// 			}
	// 		} else {
	// 			console.log("Error loading shell")
	// 			// get err
	// 			console.log(shellComponent.errorString())
	// 		}
	// 	}
	// }
	
	Component.onCompleted: {
		print(Colors.primary)
		print(Hyprland.activeWorkspace)

		if (Config.autoWorkspaceFontSize) {
			Config.workspaceFontSize = Config.barHeight
		}
	}
}
