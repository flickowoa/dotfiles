
pragma Singleton

import QtQuick
import Quickshell.Io
import Quickshell

import "root:/"

Process {
	running: true
	id: termColor
	command: ["pkill","-USR2","fish"]
}