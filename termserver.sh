#!/usr/bin/sh

mkdir -p /tmp/hyprtheme/
touch /tmp/hyprtheme/zephyr.sock
foot --server="/tmp/hyprtheme/zephyr.sock" --config=".config/hyprtheme/themes/zephyr/foot.ini"