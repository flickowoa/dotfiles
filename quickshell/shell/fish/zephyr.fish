function theme --on-signal USR2
    theme.sh < $HOME/.config/hyprtheme/themes/zephyr/quickshell/shell/colors
end

if status is-interactive
	theme &
	sttt doom -d 0.3 -b .8,.3,.87,.47 -c 9
	# sttt -d 0.5 grow -c 9 --grow-center 0.5,1 && echo "" &
	starship init fish | source &
	# sttt -d 0.7 --scanline-width 1 --scanline-scale-width 1.1 scanline
	# pokemon-colorscripts -r --no-title &
end