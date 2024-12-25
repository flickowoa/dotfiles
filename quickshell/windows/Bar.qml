import QtQuick
import Quickshell
import Quickshell.Io
import Quickshell.Wayland
import Quickshell.Hyprland

import QtQuick.Layouts

import "root:/"

import "root:/components" as Components

import "root:/components/bar" as Bar

PanelWindow {
	id: bar

    width: Config.barWidth
    height: Config.barHeight

    color: "transparent"

    WlrLayershell.layer: WlrLayer.Top

    property alias leftItems: container_left.data;
    // default property alias centerItems: container_center.data;
    property alias rightItems: container_right.data;

    Component.onCompleted: {
        Config.barVerticalCenter = bar.verticalCenter
    }

    anchors {
        left: true
        right: true
        top: true
        // bottom: true
    }	

    Rectangle {
            // color: "black"
            id: container_left_rect
            height: parent.height

            color: "transparent"
            // border.color: "red"
            // border.width: 5

            anchors {
                left: parent.left
                right: container_center_rect.left
                verticalCenter: parent.verticalCenter
            }

            Row {
                id: container_left
                spacing: 10

                anchors.left: parent.left
                anchors.leftMargin: 20
                anchors.verticalCenter: parent.verticalCenter
            }
        }

        Rectangle {
            color: "transparent"
            id: container_center_rect

            height: parent.height

            anchors {
                fill: parent
                leftMargin: container_left.implicitWidth
                rightMargin: container_right.implicitWidth + Config.clockSeperatorWidth*4
            }

            Components.Separator {

            }

            // color: "transparent"
            // border.color: "green"
            // border.width: 5
        }

        Rectangle {
            id: container_right_rect
            height: parent.height

            color: "transparent"
            // border.color: "yellow"
            // border.width: 5

            anchors {
                left: container_center_rect.right
                right: parent.right
                verticalCenter: parent.verticalCenter
            }

            Row {
                id: container_right
                spacing: 10

                anchors.right: parent.right
                anchors.rightMargin: 20
                anchors.verticalCenter: parent.verticalCenter
            }
        }

}