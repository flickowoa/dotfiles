#!/usr/bin/env bash
set -e

REPO="https://github.com/ARCANGEL0/yorha-dotfiles.git"
BRANCH="hyprland-yorha"
TARGET="$HOME/.config/hypr/themes/yorha"
if [ -d .git ]; then
    cp -rf . "$TARGET"
else
    git clone -b "$BRANCH" "$REPO" "$TARGET"
fi
THEME_DIR="$TARGET" 
echo "=============="
echo "Installing Nier Automata Rice !!"
echo "=============="
echo ""
echo "Theme dir: $THEME_DIR"

if ! command -v pacman >/dev/null 2>&1; then
  echo "Rice only for Arch! Sorryy :("
  exit 1
fi

if ! command -v paru >/dev/null 2>&1; then
  echo "paru not found! Install paru first and re-run this script."
  echo "$ git clone https://aur.archlinux.org/paru.git && cd paru && makepkg -si"
  exit 1
fi

echo "Installing base packages"
sudo pacman -S  --needed  wf-recorder gcc-libs gcc glibc lib32-glibc socat kitty mpv  cmake cpio pkgconf gcc git
echo "Installing AUR packages..."
set +e 
paru -S --ask 4 --needed hyprland-git foot swww grim slurp wl-clipboard fish light swaylock-effects-git swayidle theme.sh sddm sassc starship cava imagemagick hyprlock-git xdg-desktop-portal-hyprland-git aylurs-gtk-shell-git libastal-gjs libastal-hyprland-git libastal-mpris-git libastal-notifd-git libastal-network-git libastal-bluetooth-git libastal-wireplumber-git
if [ $? -ne 0 ]; then
    echo "AUR installation failed. Fix the errors and run the script again."
    exit 1
fi

set -e
echo "Cloning flick0/dotfiles for base config..."
git clone https://github.com/flick0/dotfiles /tmp/flick0-dotfiles
cp -rf /tmp/flick0-dotfiles/config/* "$HOME/.config/"
rm -rf /tmp/flick0-dotfiles
echo "Copying land configs to $HOME/.config/hypr/land..."
mkdir -p "$HOME/.config/hypr/land"
cp -rf "$THEME_DIR/land/"* "$HOME/.config/hypr/land/"
echo "Land configs installed to $HOME/.config/hypr/land"
echo "Installing sttt..."
sudo curl -L https://raw.githubusercontent.com/flick0/sttt/main/sttt -o /usr/local/bin/sttt
sudo chmod a+rx /usr/local/bin/sttt
chmod +x "$THEME_DIR/components/kitty/startup.sh"
mkdir -p "$HOME/.config/tmux"
echo "source-file $THEME_DIR/components/tmux/yorha.conf" >> "$HOME/.config/tmux/tmux.conf"

AGSDIR="$THEME_DIR/components/ags"

echo "Setting up AGS node_modules..."
mkdir -p "$AGSDIR/node_modules"
ln -sf /usr/share/astal/gjs "$AGSDIR/node_modules/astal"
ln -sf /usr/share/ags/js "$AGSDIR/node_modules/ags"
ln -sf /usr/share/ags/js/node_modules/gnim "$AGSDIR/node_modules/gnim"

echo "Adding hyprbars"
set +e
hyprpm update
hyprpm add https://github.com/hyprwm/hyprland-plugins
hyprpm enable hyprbars
set -e

echo "Installing nier_cursors cursor theme..."
CURSOR_SRC="$THEME_DIR/EXTRAS/cursor/nier_cursors"
if [ -d "$CURSOR_SRC" ]; then
  sudo cp -r "$CURSOR_SRC" /usr/share/icons/nier_cursors 2>/dev/null && echo "Installed system-wide /usr/share/icons/nier_cursors"
  mkdir -p "$HOME/.local/share/icons"
  cp -r "$CURSOR_SRC" "$HOME/.local/share/icons/nier_cursors" 2>/dev/null && echo "Installed user ~/.local/share/icons/nier_cursors"
  echo "Cursor theme installed. Set with: hyprctl setcursor nier_cursors 48"
else
  echo "Warning: cursor theme not found at $CURSOR_SRC"
fi

HYPR_CONF="$HOME/.config/hypr/hyprland.conf"

if [ -f "$HYPR_CONF" ]; then
  cp "$HYPR_CONF" "$HYPR_CONF.bkp"
  echo "Backed up existing $HYPR_CONF to $HYPR_CONF.bkp"
fi

cat > "$HYPR_CONF" << 'EOF'
source=./land/defaults.conf # this needs to be sourced before theme file

$yorha=$HOME/.config/hypr/themes/yorha
source=$HOME/.config/hypr/themes/yorha/theme.conf
source=./land/general.conf
source=./land/binds.conf
source=./land/rules.conf
source=./profiles/power.conf


monitor=,preferred,auto,1
exec-once = env QT_MEDIA_BACKEND=ffmpeg qs
exec-once = pkill waybar
exec-once = pkill dunst
exec-once = pkill mako
exec-once = pkill swaync
exec-once = awww-daemon
exec-once = nm-applet --indicator
exec-once = blueman-applet
exec-once = udiskie
env = XCURSOR_SIZE,24
env = QT_QPA_PLATFORM,wayland
env = QT_WAYLAND_DISABLE_WINDOWDECORATION,1

# ── Général ──
general {
    gaps_in = 4
    gaps_out = 8
    border_size = 1
    col.active_border = rgba(c8b89aee)
    col.inactive_border = rgba(1a1814aa)
    layout = dwindle
}

# ── Décoration ── 
decoration {
    rounding = 0
    blur {
        enabled = false
    }
    shadow {
        enabled = false
    }
}

animations {
    enabled = 1
    bezier = swiftOut, 0.05, 0.7, 0.1, 1.0
    animation = windows, 1, 4, swiftOut, slide left
    animation = windowsIn, 1, 4, swiftOut, slide left
    animation = windowsOut, 1, 3, swiftOut, slide right
    animation = windowsMove, 1, 4, swiftOut, slide
    animation = fade, 0
    animation = fadeIn, 0
    animation = fadeOut, 0
    animation = workspaces, 0
}


# ── Layout dwindle ──
dwindle {
    preserve_split = true
}

# ── Layout master ──
master {
    new_status = master
    mfact = 0.55
}

windowrule = float on,     match:class ^(quickshell)$
windowrule = pin on,       match:class ^(quickshell)$
windowrule = no_blur on,   match:class ^(quickshell)$
windowrule = no_shadow on, match:class ^(quickshell)$
windowrule = workspace special:spotify, match:class ^(Spotify)$
windowrule = fullscreen on,             match:class ^(Spotify)$
windowrule = float on,     match:class ^(qs-yazi-picker)$
windowrule = size 900 600, match:class ^(qs-yazi-picker)$
windowrule = center 1,     match:class ^(qs-yazi-picker)$
bind = SUPER SHIFT, minus, exec, $yorha/scripts/screenrecord
bind = ALT, 1, exec, hyprctl dispatch workspace 1
bind = ALT, 2, exec, hyprctl dispatch workspace 2
bind = ALT, 3, exec, hyprctl dispatch workspace 3
bind = ALT, 4, exec, hyprctl dispatch workspace 4
bind = ALT, 5, exec, hyprctl dispatch workspace 5
bind = ALT, 6, exec, hyprctl dispatch workspace 6
bind = ALT, 7, exec, hyprctl dispatch workspace 7
bind = ALT, 8, exec, hyprctl dispatch workspace 8
bind = ALT, 9, exec, hyprctl dispatch workspace 9
bind = ALT, 0, exec, hyprctl dispatch workspace 10
bind = SUPER, 1, exec, $yorha/scripts/ws-go 1
bind = SUPER, 2, exec, $yorha/scripts/ws-go 2
bind = SUPER, 3, exec, $yorha/scripts/ws-go 3
bind = SUPER, 4, exec, $yorha/scripts/ws-go 4
bind = SUPER, 5, exec, $yorha/scripts/ws-go 5
bind = SUPER, 6, exec, $yorha/scripts/ws-go 6
bind = SUPER, 7, exec, $yorha/scripts/ws-go 7
bind = SUPER, 8, exec, $yorha/scripts/ws-go 8
bind = SUPER, 9, exec, $yorha/scripts/ws-go 9
bind = SUPER, 0, exec, $yorha/scripts/ws-go 10
bind = , XF86AudioRaiseVolume, exec, wpctl set-volume @DEFAULT_AUDIO_SINK@ 5%+
bind = , XF86AudioLowerVolume, exec, wpctl set-volume @DEFAULT_AUDIO_SINK@ 5%-
bind = , XF86AudioMute,        exec, wpctl set-mute @DEFAULT_AUDIO_SINK@ toggle
bind = , XF86MonBrightnessUp,   exec, brightnessctl set 5%+
bind = , XF86MonBrightnessDown, exec, brightnessctl set 5%-
env = HYPRCURSOR_THEME,nier_cursors
env = HYPRCURSOR_SIZE,48
exec-once = hyprctl setcursor nier_cursors 48
unbind = , Print

# --- some keybinds of mine 
bind = SUPER, T, exec, /usr/bin/kitty
# SUPER + Left Click -> Drag & move a floating window around
bindm = SUPER, mouse:272, movewindow
# SUPER + Right Click -> Freely resize a floating window 
bindm = SUPER, mouse:273, resizewindow
# Move windows
bind = SUPER SHIFT, Left, movewindow, l
bind = SUPER SHIFT, Down, movewindow, d
bind = SUPER SHIFT, Up, movewindow, u
bind = SUPER SHIFT, Right, movewindow, r
# Resize windows
bind = SUPER CTRL, Left, resizeactive, -20 0
bind = SUPER CTRL, Down, resizeactive, 0 20
bind = SUPER CTRL, Up, resizeactive, 0 -20
bind = SUPER CTRL, Right, resizeactive, 20 0
bind = SUPER, Q,      killactive
bind = SHIFT SUPER, F,      fullscreen
bind = SUPER, V,      togglefloating
bind = SUPER, Escape, exit
bind = SUPER, D,      fullscreen, 1
bind = SUPER, W,       exec, hyprctl keyword general:layout master
bind = SUPER SHIFT, W, exec, hyprctl keyword general:layout dwindle
#------


bind = , Print, exec, $yorha/scripts/screenshot
bind = ALT, F11, exec, echo "dismiss-notifs" | socat - UNIX-CONNECT:$XDG_RUNTIME_DIR/astal/yorha.sock
bind = CTRL ALT, W, exec, $yorha/scripts/overkill
submap = kill
bind = , mouse:272, exec, $yorha/scripts/overkill kill
bind = , ESC, exec, $yorha/scripts/overkill exit
bind = , escape, exec, $yorha/scripts/overkill exit
submap = reset
EOF

pkill waybar
pkill dunst
pkill mako
pkill swaync
awww-daemon
udiskie
hyprctl setcursor nier_cursors 48
echo "Reloading Hyprctl and starting AGS in background (log -> /tmp/ags-yorha.log)"
hyprctl reload 
echo "Installation finished. Check /tmp/ags-yorha.log for runtime errors :)"
