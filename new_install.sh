#!/usr/bin/env bash
set -e

REPO="https://github.com/ARCANGEL0/yorha-dotfiles.git"
BRANCH="hyprland-yorha"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -d "$SCRIPT_DIR/.git" ] && git -C "$SCRIPT_DIR" remote get-url origin 2>/dev/null | grep -q "yorha-dotfiles"; then
  THEME_DIR="$SCRIPT_DIR"
  echo "Already inside the repo at $THEME_DIR"
else
  THEME_DIR="${1:-$HOME/.config/hypr/themes/yorha}"
  if [ ! -d "$THEME_DIR" ]; then
    echo "Theme dir not found. Cloning fork into $THEME_DIR"
    mkdir -p "$(dirname "$THEME_DIR")"
    git clone -b "$BRANCH" "$REPO" "$THEME_DIR"
  fi
fi

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
sudo pacman -S --needed --noconfirm git curl sassc imagemagick wl-clipboard xorg-xrandr cpio cmake meson gcc make pkgconf base-devel gcc-libs

echo "Installing AUR packages"
paru -S --needed --noconfirm hyprland-git foot grim slurp swww fish light swaylock-effects-git swayidle theme.sh sddm
paru -S --needed --noconfirm aylurs-gtk-shell-git sassc starship cava imagemagick
paru -S --needed --noconfirm ags libastal-gjs libastal-hyprland-git libastal-mpris-git libastal-notifd-git libastal-network-git libastal-bluetooth-git libastal-wireplumber-git

echo "Cloning flick0/dotfiles for base config..."
git clone https://github.com/flick0/dotfiles /tmp/flick0-dotfiles
cp -rf /tmp/flick0-dotfiles/config/* "$HOME/.config/"
rm -rf /tmp/flick0-dotfiles

echo "Installing sttt..."
sudo curl -L https://raw.githubusercontent.com/flick0/sttt/main/sttt -o /usr/local/bin/sttt
sudo chmod a+rx /usr/local/bin/sttt

AGSDIR="$THEME_DIR/components/ags"

echo "Setting up AGS node_modules..."
mkdir -p "$AGSDIR/node_modules"
[ -d /usr/share/astal/gjs ] && ln -sf /usr/share/astal/gjs "$AGSDIR/node_modules/astal" && echo "linked /usr/share/astal/gjs"
[ -d /usr/share/ags/js ] && ln -sf /usr/share/ags/js "$AGSDIR/node_modules/ags" && echo "linked /usr/share/ags/js"
[ -d /usr/share/ags/js/node_modules/gnim ] && ln -sf /usr/share/ags/js/node_modules/gnim "$AGSDIR/node_modules/gnim" && echo "linked gnim"

if ! command -v ags >/dev/null 2>&1; then
  echo "Warning: ags binary not found in PATH after install. Check AUR logs!"
fi

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

monitor=,preferred,auto,1

exec-once = env QT_MEDIA_BACKEND=ffmpeg qs
exec-once = pkill waybar
exec-once = pkill dunst
exec-once = pkill mako
exec-once = pkill swaync
exec-once = awww-daemon
exec-once = udiskie
env = XCURSOR_SIZE,24
env = QT_QPA_PLATFORM,wayland
env = QT_WAYLAND_DISABLE_WINDOWDECORATION,1
animations {
    enabled = true
    bezier = niercurve, 0.4, 0, 0.2, 1
    animation = windows,      1, 4, niercurve, slide
    animation = windowsOut,   1, 3, niercurve, slide
    animation = fade,         1, 4, niercurve
    animation = workspaces,   1, 5, niercurve, slidevert
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
bindm = SUPER, mouse:272, movewindow
bindm = SUPER, mouse:273, resizewindow
bind = , XF86MonBrightnessUp,   exec, brightnessctl set 5%+
bind = , XF86MonBrightnessDown, exec, brightnessctl set 5%-
env = HYPRCURSOR_THEME,nier_cursors
env = HYPRCURSOR_SIZE,48
exec-once = hyprctl setcursor nier_cursors 48
unbind = , Print
bind = , Print, exec, $yorha/scripts/screenshot
bind = ALT, F11, exec, echo "dismiss-notifs" | socat - UNIX-CONNECT:$XDG_RUNTIME_DIR/astal/yorha.sock
bind = CTRL ALT, W, exec, $yorha/scripts/overkill
submap = kill
bind = , mouse:272, exec, $yorha/scripts/overkill kill
bind = , ESC, exec, $yorha/scripts/overkill exit
bind = , escape, exec, $yorha/scripts/overkill exit
submap = reset
EOF

echo "Written fresh $HYPR_CONF with theme config"

echo "Copying land configs to $HOME/.config/hypr/land..."
mkdir -p "$HOME/.config/hypr/land"
cp -rf "$THEME_DIR/land/"* "$HOME/.config/hypr/land/"
echo "Land configs installed to $HOME/.config/hypr/land"

echo "Starting AGS in background (log -> /tmp/ags-yorha.log)"
setsid ags run --gtk 3 "$AGSDIR/app.ts" >/tmp/ags-yorha.log 2>&1 &

echo "Installation finished. Check /tmp/ags-yorha.log for runtime errors :)"
