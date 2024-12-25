import QtQuick
import QtQuick.Layouts
import "root:/"

Rectangle {
	property bool autoSize: false
	color: "#80ff0000"
	border.color: "#80ff0000"
	border.width: 1
	implicitWidth: autoSize ? container.implicitWidth + container.anchors.margins * 2 : 0
	implicitHeight: autoSize ? container.implicitHeight + container.anchors.margins * 2 : 0
	default property alias content: container.children
	property alias spacing: container.spacing
	property alias margins: container.anchors.margins

	RowLayout {
		id: container
		anchors.fill: parent
	}
}