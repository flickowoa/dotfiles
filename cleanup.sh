#!/usr/bin/bash

# kill ags
pkill ags
pkill swww

hyprctl plugin unload /lib/hyprland-plugins/hyprbars.so
