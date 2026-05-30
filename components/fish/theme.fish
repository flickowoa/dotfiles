function theme --on-signal USR2
    theme.sh < $COLORFILE
end

function _sttt_resize --on-signal WINCH
    sttt shrink -d 0.3
end

if status is-interactive
    starship init fish | source &
    theme
    sttt scanline --scanline-reverse true -d 0.5
end