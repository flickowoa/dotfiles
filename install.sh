##############################################################################################################
# thanks to @cutie_230 from discord for sending me this
##############################################################################################################

clear
echo "initzializing install script...."
echo "done..."

echo "master branch time"
echo "installing programs the 1st"
paru -S hyprland-git foot grim slurp swww-git fish light-git swaylock-effects-git swayidle theme.sh sddm --noconfirm
echo "Git Cloning from github...."
git clone https://github.com/flick0/dotfiles /tmp/flick0-dotfiles 
echo "copying..."
cd /tmp/flick0-dotfiles && cp -r ./config/* ~/.config/ && cd
echo "YorHa time!!!"
echo "installing programs the 2nd"
paru -S aylurs-gtk-shell-git sassc starship cava imagemagick hyprland-plugin-hyprbars-git --noconfirm
echo "Please Insert Password"
sudo curl -L https://raw.githubusercontent.com/flick0/sttt/main/sttt -o /usr/local/bin/sttt
sudo chmod a+rx /usr/local/bin/sttt
echo "git blah blah"
mkdir ~/.config/hypr/themes && git clone -b hyprland-yorha https://github.com/flick0/dotfiles ~/.config/hypr/themes/yorha

echo "change the \$THEME variable in hyprland conf to \$HERE/themes/yorha"
