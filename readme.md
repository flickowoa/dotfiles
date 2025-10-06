<div>
    <img src="./assets/title.svg" height="30px">
</div>
<img src="https://github.com/flick0/dotfiles/assets/77581181/4b94622c-69f4-4f2d-82c4-7032d6e66ca4">
<div align="right">
        do check out the full showcase vid here ~>
        <a href="https://www.youtube.com/watch?v=YRDbhWHF8bY">
            <img alt="Youtube" src="https://img.shields.io/badge/YouTube-%23c2bda6.svg?style=for-the-badge&logo=YouTube&logoColor=48463d">
        </a>
        <a href="https://www.reddit.com/r/unixporn/comments/18zwfhj/hyprland_yorha/">
            <img alt="Reddit" src="https://img.shields.io/badge/Reddit-%23c2bda6.svg?style=for-the-badge&logo=Reddit&logoColor=48463d">
        </a>
</div>


# 👾 YoRHa

A rice inspired by `NieR:Automata` ui


## 📥 Installation
> [!IMPORTANT]
> you need to install the base config found in [master branch](https://github.com/flick0/dotfiles) before installing this (unless you are using the install script)

- ## Manual
    - ### Dependancies
        #### Arch
        > ```sh
        > paru -S hyprland-git foot grim swww-git fish theme.sh aylurs-gtk-shell-git sassc starship cava imagemagick hyprland-plugin-hyprbars-git gnome-bluetooth wl-clipboard libdbusmenu-gtk3 gnome-bluetooth-3.0 xorg-xrandr nerd-fonts cpio cmake git meson gcc
        > ```
        #### STTT
        > install from https://github.com/flick0/sttt
    - ### Install and enable `hyprbars` plugin via `hyprpm`
      > ```sh
      > hyprpm update
      > hyprpm add https://github.com/hyprwm/hyprland-plugins
      > hyprpm enable hyprbars
      > ```
    - ### Clone to theme folder
      ```sh
      mkdir ~/.config/hypr/themes && git clone -b hyprland-yorha https://github.com/flick0/dotfiles ~/.config/hypr/themes/yorha
      ```
   
    
    - ### Apply theme
      
      - manual
         > add this under the `$THEME`` variable in `hyprland.conf`
         > ```
         > $yorha=$THEME/yorha
         > source=$nier/theme.conf
         > ```
      
      - hyprtheme
         > soon

- ## ~~Install Script~~ (outdated, will fix soon)
    ```sh
    curl -s -L https://raw.githubusercontent.com/flick0/dotfiles/hyprland-yorha/install.sh | bash
    ```
    > provided by [@cutie_230](https://discord.com/channels/@me/1193218215380254740) on discord

## ✨ Features
 - ### Music Widget
   > https://github.com/flick0/dotfiles/assets/77581181/4c10b974-11e1-41c2-89fe-3a1cfb405fd6

 - ### Slurp clone made in ags
   > https://github.com/flick0/dotfiles/assets/77581181/efd9363e-47f4-4768-bdd9-3d8d15e5a9c4

 - ### Light/Dark mode with transitions
   > https://github.com/flick0/dotfiles/assets/77581181/663c9a12-ff65-4130-aa19-7c38cb6e90e6


## Thanks to
- https://www.platinumgames.com/official-blog/article/9624 amazing blog by the creators of NieR:Automata
- https://github.com/accrazed/YoRHA-UI-BetterDiscord (for the wallpapers)
- https://codepen.io/RobotsPlay/pen/bGeNGdx (few svgs and for reference)
