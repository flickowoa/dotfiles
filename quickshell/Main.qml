import QtQuick
// import QtQuick.Layouts
import Quickshell
import Quickshell.Io
import Quickshell.Wayland
import Quickshell.Hyprland

import "root:/"
import "./components" as Components
import "./components/bar" as Bar
import "./windows" as Windows


Rectangle {
    anchors.fill: parent

    Windows.Background {}
    Windows.Bar {
		leftItems: [
            Bar.Workspace {},
            // Components.MusicLine {},
            Components.FastMusicLine {}
        ]

		

		// centerItems: [
		// ]

		rightItems: [
			Bar.Clock {}
		]
	}

    SocketServer {
        id: socket
        property variant geom: null

        Component.onDestruction: {
            if (socket.geom != null) {
                socket.geom.destroy()
            }
        }

        Component.onCompleted: {
            // var geomComponent = Qt.createComponent("root:/windows/Geom.qml")
            //             if (geomComponent.status == Component.Ready) {
            //                 socket.geom = geomComponent.createObject(root)
            //                 if (socket.geom == null) {
            //                     console.log("Error creating geom")
            //                 }
            //             } else {
            //                 console.log("Error loading geom")
            //                 console.log(geomComponent.errorString())
            //             }
        }

        active: true
        path: "/tmp/quickshell_zephyr.sock"
        handler: Socket {
            id: handler
            onConnectedChanged: {
                console.log(connected ? "new connection!" : "connection dropped!")
            }
            parser: SplitParser {
                onRead: msg => {
                    if (msg == "geom") {
                        if (socket.geom != null) {
                            socket.geom.destroy()
                        }
                        var geomComponent = Qt.createComponent("root:/windows/Geom.qml")
                        if (geomComponent.status == Component.Ready) {
                            socket.geom = geomComponent.createObject(root)
                            if (socket.geom == null) {
                                console.log("Error creating geom")
                            }
                        } else {
                            console.log("Error loading geom")
                            console.log(geomComponent.errorString())
                        }
                        socket.geom.socket = handler
                    }

                    if (msg == "exitgeom") {
                        socket.geom.destroy()
                    }
                }
            }
        }
    }
}
