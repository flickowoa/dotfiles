
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

	property string starshipConf : `
"\\$schema" = 'https://starship.rs/config-schema.json'

add_newline = true

format = """
[](${Colors.primary})\\
\\$directory[](${Colors.primary}) """

right_format = """\\$character [](fg:${Colors.tertiary})\\$cmd_duration[](fg:${Colors.tertiary})"""

[cmd_duration]
min_time = 0
format = "[\\$duration](bg:${Colors.tertiary} fg:${Colors.on_tertiary})"

[character]
format = "\\$symbol"
success_symbol = ""
error_symbol = "[](fg:${Colors.error})[](fg:${Colors.error})"



[fill]
symbol = ''
style = 'bold fg:${Colors.primary}'

[directory]
style = "bg:${Colors.primary} fg:${Colors.on_primary}"
format = "[ \\$path ](\\$style)"
truncation_length = 3
truncation_symbol = "…/"
`
	running: true
	command: [
		"bash","-c",
		`cat > ${Qt.resolvedUrl("root:/shell/starship.toml").toString().replace("file://","")} <<- EOM ${starshipConf}`]
}
