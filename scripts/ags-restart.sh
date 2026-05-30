#!/bin/sh
# Hard-restart the YorHa AGS.
ags quit -i yorha 2>/dev/null
pkill -9 -f '[a]gs.js'
pkill -9 -f '[a]gs run'
sleep 1
setsid ags run --gtk 3 "$HOME/.config/hypr/themes/yorha/components/ags/app.ts" \
    >/tmp/ags-yorha.log 2>&1 </dev/null &
