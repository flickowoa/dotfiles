pragma Singleton

import QtQuick
import Quickshell
import Quickshell.Io
import Quickshell.Services.Mpris

import "root:/theme/"

Singleton {
    // property color primary: "black"

    property string coverArtUrl: Mpris.players.values[0].trackArtUrl

    property int coverArtUpdate: 1

    onCoverArtUrlChanged: {
        getCoverArt.command = ["curl", "--create-dirs", "-o", "/tmp/dreamyv2/cover.png", coverArtUrl]; // coverArtUrl doesnt update in time when using under Process somehow(?)
        getCoverArt.running = true;
    }

    Process {
        id: getCoverArt
        running: false
        // command: ["curl", "--create-dirs", "-o", "/tmp/dreamyv2/cover.png", coverArtUrl]

        onExited: () => {
            colorGen.running = true;
            getCoverArt.running = false;
        }
    }

    Loader {
        id: hypr
        active: false
        source: "root:/theme/Hypr.qml"
    }

    Process {
        id: colorGen
        running: false

        //scheme-content, scheme-expressive, scheme-fidelity, scheme-fruit-salad, scheme-monochrome, scheme-neutral, scheme-rainbow, scheme-tonal-spot
        command: ["matugen", "image", "/tmp/dreamyv2/cover.png", "--json", "hex", "-t", "scheme-fidelity"]

        stdout: SplitParser {
            onRead: data => {
                var colors = JSON.parse(data).colors;
                Colors.source_color = colors.light.source_color;

                Cava.colors = [colors.dark.primary, colors.dark.secondary, colors.dark.tertiary];

                if (Config.darkMode) {
                    colors = colors.dark;
                } else {
                    colors = colors.light;
                }

                Colors.background = colors.background;
                Colors.error = colors.error;
                Colors.error_container = colors.error_container;
                Colors.inverse_on_surface = colors.inverse_on_surface;
                Colors.inverse_primary = colors.inverse_primary;
                Colors.inverse_surface = colors.inverse_surface;
                Colors.on_background = colors.on_background;
                Colors.on_error = colors.on_error;
                Colors.on_error_container = colors.on_error_container;
                Colors.on_primary = colors.on_primary;
                Colors.on_primary_container = colors.on_primary_container;
                Colors.on_primary_fixed = colors.on_primary_fixed;
                Colors.on_primary_fixed_variant = colors.on_primary_fixed_variant;
                Colors.on_secondary = colors.on_secondary;
                Colors.on_secondary_container = colors.on_secondary_container;
                Colors.on_secondary_fixed = colors.on_secondary_fixed;
                Colors.on_secondary_fixed_variant = colors.on_secondary_fixed_variant;
                Colors.on_surface = colors.on_surface;
                Colors.on_surface_variant = colors.on_surface_variant;
                Colors.on_tertiary = colors.on_tertiary;
                Colors.on_tertiary_container = colors.on_tertiary_container;
                Colors.on_tertiary_fixed = colors.on_tertiary_fixed;
                Colors.on_tertiary_fixed_variant = colors.on_tertiary_fixed_variant;
                Colors.outline = colors.outline;
                Colors.outline_variant = colors.outline_variant;
                Colors.primary = colors.primary;
                Colors.primary_container = colors.primary_container;
                Colors.primary_fixed = colors.primary_fixed;
                Colors.primary_fixed_dim = colors.primary_fixed_dim;
                Colors.scrim = colors.scrim;
                Colors.secondary = colors.secondary;
                Colors.secondary_container = colors.secondary_container;
                Colors.secondary_fixed = colors.secondary_fixed;
                Colors.secondary_fixed_dim = colors.secondary_fixed_dim;
                Colors.shadow = colors.shadow;
                Colors.surface = colors.surface;
                Colors.surface_bright = colors.surface_bright;
                Colors.surface_container = colors.surface_container;
                Colors.surface_container_high = colors.surface_container_high;
                Colors.surface_container_highest = colors.surface_container_highest;
                Colors.surface_container_low = colors.surface_container_low;
                Colors.surface_container_lowest = colors.surface_container_lowest;
                Colors.surface_dim = colors.surface_dim;
                Colors.surface_variant = colors.surface_variant;
                Colors.tertiary = colors.tertiary;
                Colors.tertiary_container = colors.tertiary_container;
                Colors.tertiary_fixed = colors.tertiary_fixed;
                Colors.tertiary_fixed_dim = colors.tertiary_fixed_dim;

                colorGen.running = false;
                coverArtUpdate++;

                hypr.active = false;
                hypr.active = true;
            }
        }
    }

    property color background: Qt.rgba(26 / 255, 18 / 255, 13 / 255, 1)
    property color error: Qt.rgba(255 / 255, 180 / 255, 171 / 255, 1)
    property color error_container: Qt.rgba(147 / 255, 0 / 255, 10 / 255, 1)
    property color inverse_on_surface: Qt.rgba(56 / 255, 46 / 255, 41 / 255, 1)
    property color inverse_primary: Qt.rgba(140 / 255, 78 / 255, 41 / 255, 1)
    property color inverse_surface: Qt.rgba(240 / 255, 223 / 255, 215 / 255, 1)
    property color on_background: Qt.rgba(240 / 255, 223 / 255, 215 / 255, 1)
    property color on_error: Qt.rgba(105 / 255, 0 / 255, 5 / 255, 1)
    property color on_error_container: Qt.rgba(255 / 255, 218 / 255, 214 / 255, 1)
    property color on_primary: Qt.rgba(83 / 255, 34 / 255, 1 / 255, 1)
    property color on_primary_container: Qt.rgba(255 / 255, 219 / 255, 202 / 255, 1)
    property color on_primary_fixed: Qt.rgba(51 / 255, 18 / 255, 0 / 255, 1)
    property color on_primary_fixed_variant: Qt.rgba(111 / 255, 55 / 255, 20 / 255, 1)
    property color on_secondary: Qt.rgba(67 / 255, 43 / 255, 29 / 255, 1)
    property color on_secondary_container: Qt.rgba(255 / 255, 219 / 255, 202 / 255, 1)
    property color on_secondary_fixed: Qt.rgba(43 / 255, 22 / 255, 10 / 255, 1)
    property color on_secondary_fixed_variant: Qt.rgba(92 / 255, 65 / 255, 50 / 255, 1)
    property color on_surface: Qt.rgba(240 / 255, 223 / 255, 215 / 255, 1)
    property color on_surface_variant: Qt.rgba(215 / 255, 194 / 255, 185 / 255, 1)
    property color on_tertiary: Qt.rgba(52 / 255, 50 / 255, 8 / 255, 1)
    property color on_tertiary_container: Qt.rgba(234 / 255, 229 / 255, 171 / 255, 1)
    property color on_tertiary_fixed: Qt.rgba(30 / 255, 28 / 255, 0 / 255, 1)
    property color on_tertiary_fixed_variant: Qt.rgba(75 / 255, 72 / 255, 29 / 255, 1)
    property color outline: Qt.rgba(159 / 255, 141 / 255, 132 / 255, 1)
    property color outline_variant: Qt.rgba(82 / 255, 68 / 255, 60 / 255, 1)
    property color primary: Qt.rgba(255 / 255, 182 / 255, 142 / 255, 1)
    property color primary_container: Qt.rgba(111 / 255, 55 / 255, 20 / 255, 1)
    property color primary_fixed: Qt.rgba(255 / 255, 219 / 255, 202 / 255, 1)
    property color primary_fixed_dim: Qt.rgba(255 / 255, 182 / 255, 142 / 255, 1)
    property color scrim: Qt.rgba(0 / 255, 0 / 255, 0 / 255, 1)
    property color secondary: Qt.rgba(230 / 255, 190 / 255, 171 / 255, 1)
    property color secondary_container: Qt.rgba(95 / 255, 67 / 255, 52 / 255, 1)
    property color secondary_fixed: Qt.rgba(255 / 255, 219 / 255, 202 / 255, 1)
    property color secondary_fixed_dim: Qt.rgba(230 / 255, 190 / 255, 171 / 255, 1)
    property color shadow: Qt.rgba(0 / 255, 0 / 255, 0 / 255, 1)
    property color surface: Qt.rgba(26 / 255, 18 / 255, 13 / 255, 1)
    property color surface_bright: Qt.rgba(65 / 255, 55 / 255, 50 / 255, 1)
    property color surface_container: Qt.rgba(39 / 255, 30 / 255, 25 / 255, 1)
    property color surface_container_high: Qt.rgba(50 / 255, 40 / 255, 35 / 255, 1)
    property color surface_container_highest: Qt.rgba(61 / 255, 51 / 255, 46 / 255, 1)
    property color surface_container_low: Qt.rgba(34 / 255, 26 / 255, 21 / 255, 1)
    property color surface_container_lowest: Qt.rgba(20 / 255, 12 / 255, 9 / 255, 1)
    property color surface_dim: Qt.rgba(26 / 255, 18 / 255, 13 / 255, 1)
    property color surface_variant: Qt.rgba(82 / 255, 68 / 255, 60 / 255, 1)
    property color tertiary: Qt.rgba(206 / 255, 201 / 255, 145 / 255, 1)
    property color tertiary_container: Qt.rgba(75 / 255, 72 / 255, 29 / 255, 1)
    property color tertiary_fixed: Qt.rgba(234 / 255, 229 / 255, 171 / 255, 1)
    property color tertiary_fixed_dim: Qt.rgba(206 / 255, 201 / 255, 145 / 255, 1)
    property color source_color: Qt.rgba(192 / 255, 96 / 255, 33 / 255, 1)
}
