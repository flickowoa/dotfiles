#!/bin/sh
if [ -n "$TMUX" ]; then
    sttt grow -d 0.4
else
    sttt scanline --scanline-reverse true -d 0.5
fi
exec "${SHELL:-/bin/sh}"
