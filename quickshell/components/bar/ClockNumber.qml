import QtQuick
// import QtGraphicalEffects 1.15

import "root:/"


Canvas {
    id: canvas


    property int paddingLeft: 5
    property int paddingRight: 5
    property int paddingTopBottom: Config.barHeight/2
    property int toNum: 9
    property int textY: 50
    property int textX: 0
    property int textWidth: 10

    property bool fixedWidth: false

    property color bgColor: "red"
    property color boxShadow: "red"
    property int textShadowWidth: 2
    property bool noBackgroundForZero: false

    Component.onCompleted: {
        toNum = 0;
    }

    width: textWidth + paddingLeft + paddingRight
    height: Config.barHeight - paddingTopBottom
    onTextXChanged: {
        requestPaint();
    }
    onTextYChanged: {
        requestPaint();
    }
    onToNumChanged: {
        if (toNum == 10)
            toNum = 0;

        requestPaint();
        textY = - parent.height * (toNum - 1) + 1;
    }

    TextMetrics {
        id: txtMeter
        font.family: "Cantarell"
        font.pixelSize: Config.workspaceFontSize/2
        font.bold: true
        text: toNum
    }

    onBgColorChanged: {
        requestPaint();
    }

    onPaint: {
        var now = new Date();
        var ctx = getContext("2d");
        ctx.reset();
        ctx.font = `bold ${Config.workspaceFontSize/2}px Cantarell`;
        for (let i = 0; i < 10; i++) {

            if (fixedWidth) {
                var text_width = ctx.measureText(toNum).width
                if (text_width > textWidth) {
                    textWidth = text_width;
                }
            } else {
                textWidth = ctx.measureText(toNum).width;
            }

            if (noBackgroundForZero && i == 0) {
                ctx.fillStyle = bgColor;
                ctx.fillText(i, textX + paddingLeft, textY + parent.height * i - Config.barHeight/2 + paddingTopBottom/2 + txtMeter.tightBoundingRect.height/2);
            } else {
                ctx.shadowBlur = 0
                ctx.fillStyle = Qt.lighter(bgColor, 1 + i / 10);
                ctx.fillRect(0, textY + parent.height * (i-1), textWidth + paddingRight + paddingLeft, parent.height);

                ctx.save();
                
                ctx.shadowBlur = 2

                ctx.globalCompositeOperation = "destination-out";

                ctx.fillText(i, textX + paddingLeft, textY + parent.height * i - Config.barHeight/2 + paddingTopBottom/2 + txtMeter.tightBoundingRect.height/2);
                
                ctx.globalCompositeOperation = "source-over";

                ctx.restore();
            }            
        }
    }

    Behavior on textX {
        PropertyAnimation {
        }
    }

    Behavior on textY {
        PropertyAnimation {
            duration: 500
            easing.type: Easing.OutQuint
        }
    }

    Behavior on textWidth {
        PropertyAnimation {
            duration: 300
            easing.type: Easing.OutQuint
        }
    }

    // DropShadow {
    //     anchors.fill: parent
    //     horizontalOffset: 3
    //     verticalOffset: 3
    //     radius: 8.0
    //     samples: 17
    //     color: "#80000000"
    //     source: parent
    // }
}
