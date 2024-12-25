#!/usr/bin/bash

pkill quickshell
hyprctl dispatch exec "quickshell -p $1/quickshell/shell.qml"