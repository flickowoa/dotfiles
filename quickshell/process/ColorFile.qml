
pragma Singleton

import QtQuick
import Quickshell.Io
import Quickshell

import "root:/"

Process {

	function color_mix(color1, color2, weight) {
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

	property string themeStr:
`0: ${Colors.primary}
8: ${Colors.tertiary}
1: ${color_mix(Colors.primary, Qt.rgba(255,0,0,1), 0.5)}
9: ${color_mix(Colors.primary, Qt.rgba(255,0,0,1), 0.5)}
2: ${color_mix(Colors.primary, Qt.rgba(0,255,0,1), 0.5)}
10: ${color_mix(Colors.primary, Qt.rgba(0,255,0,1), 0.5)}
3: ${color_mix(Colors.primary, Qt.rgba(255,255,0,1), 0.5)}
11: ${color_mix(Colors.primary, Qt.rgba(255,255,0,1), 0.5)}
4: ${color_mix(Colors.primary, Qt.rgba(0,0,255,1), 0.5)}
12: ${color_mix(Colors.primary, Qt.rgba(0,0,255,1), 0.5)}
5: ${color_mix(Colors.primary, Qt.rgba(255,0,255,1), 0.5)}
13: ${color_mix(Colors.primary, Qt.rgba(255,0,255,1), 0.5)}
6: ${color_mix(Colors.primary, Qt.rgba(0,255,255,1), 0.5)}
14: ${color_mix(Colors.primary, Qt.rgba(0,255,255,1), 0.5)}
7: ${color_mix(Colors.primary, Qt.rgba(255,255,255,1), 0.5)}
15: ${color_mix(Colors.primary, Qt.rgba(255,255,255,1), 0.5)}
background: ${Colors.background}
foreground: ${Colors.on_background}
cursor: ${Colors.primary}`

	running: true
	id: colorFile
	command: ["bash","-c",`printf "${themeStr}" > ${Qt.resolvedUrl("root:/shell/colors").toString().replace("file://","")}`]

    stderr: SplitParser {  
        onRead: data => {
            console.log("colorFile: "+data)
        }
    }
		
	stdout: SplitParser {
		onRead: data => {
			console.log("colorFile: "+data)
		}
	}
}
