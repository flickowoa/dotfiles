import App from 'resource:///com/github/Aylur/ags/app.js';
import Widget from 'resource:///com/github/Aylur/ags/widget.js';
import Variable from 'resource:///com/github/Aylur/ags/variable.js';
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';

import Notifications from 'resource:///com/github/Aylur/ags/service/notifications.js';

const css = App.configDir + "/style/style.css";

const { Box, Window, EventBox, Label, Overlay, Icon } = Widget;

const parentConfigDir = App.configDir.split("/").slice(0,-2).join("/");
const parentAssetsDir = () => `${parentConfigDir}/assets/${dark.value ? "dark" : "light"}`;

import Pango from 'gi://Pango';

import { NierButton, NierButtonGroup } from "../../nier/buttons.js";

const dark = Variable(false, {})
globalThis.dark = dark;

dark.connect("changed",() => Utils.timeout(100, () => {
    App.resetCss();
    App.applyCss(css);
}))

print(parentConfigDir)

const card = ({
    left = true,
    content = "",
    notification_obj = null,
    accent =  Box({
        classNames: ["notify-card-accent", left?"left":"right"],
        setup: (self) => {
           switch (notification_obj.urgency) {
                case "low":
                    self.toggleClassName("low",true);
                    break;
                case "normal":
                    self.toggleClassName("normal",true);
                    break;
                case "critical":
                    self.toggleClassName("critical",true);
                    break;
           }
        }
    }),
    card_content = Box({
        classNames: ["notify-card-content", left?"left":"right"],
        hpack: "start",
        hexpand: false,
        children: [
            Box({
                vpack: "center",
                classNames: ["notify-card-inner"],
                hpack: "fill",
                vertical: true,
                children: [
                    Label({
                        classNames: ["notify-card-title"],
                        hpack: "start",
                        vpack: "center",
                        justification: "left",
                        use_markup: true,
                        max_width_chars: 24,
                        wrap: true,
                        wrap_mode: Pango.WrapMode.WORD_CHAR,
                        label: notification_obj.summary?notification_obj.summary:notification_obj.app_name,
                    }),
                    Label({
                        classNames: ["notify-card-body"],
                        hpack: "start",
                        use_markup: true,
                        vpack: "center",
                        justification: "left",
                        max_width_chars: 24,
                        css: `min-width: 100px;`,
                        wrap: true,
                        wrap_mode: Pango.WrapMode.WORD_CHAR,
                        label: content,
                    }),
                ],
                setup: (self) => {
                    if (notification_obj.actions.length) {
                        print("has actions")
                        self.spacing = 20;
                        self.add(
                            NierButtonGroup({
                                classNames: ["notify-card-actions"],
                                buttons: notification_obj.actions.map((action) => {
                                    return NierButton({
                                        useAssetsDir: parentAssetsDir,
                                        label: action["label"],
                                        handleClick: () => {
                                            notification_obj.invoke(action["id"]);
                                            notification_obj.dismiss();
                                        }
                                    })
                                })
                            })
                        )
                        self.show_all()
                    }
                }
            }),
            Icon({
                hexpand: true,
                hpack: "end",
                size: 64,
                icon: notification_obj.app_icon,
            })
        ],
    }),
    press_cords = [0,0],
    hider = EventBox({
        classNames: ["notify-card-hider", left?"left":"right"],
    }),
    safe_to_overlay = false,
    closing = false,
    dismissed = false,
}) => Overlay({
    vexpand: false,
    vpack: "center",
    pass_through: true,
    child:EventBox({
        child: Box({
            classNames: ["notify-card", left?"left":"right"],
            children: [
                accent,
                card_content,
            ]
        }),
        setup: (self) => {

            self.connect("button-press-event", (self,event) => {
                let [_,x,y] = event.get_coords();
                press_cords = [x,y];
            })
            self.connect("button-release-event", (self,event) => {
                if (closing) {
                    return;
                }
                let [_,x,y] = event.get_coords();
                accent.css = `min-width: 10px;transition: min-width 0.2s cubic-bezier(0.15, 0.79, 0, 1);`
                card_content.css = `padding-left: 20px;transition: padding 0.3s cubic-bezier(0,1.77,.63,1.3);`
                let diff_x = x - press_cords[0];
                if (diff_x > 160) {
                    closing = true;
                    Utils.timeout(100, () => {
                        if ((!notification_obj.closed) && notification_obj.popup && (!dismissed) ){
                            notification_obj.dismiss();
                        }
                    })
                }
            })
            self.connect("motion-notify-event", (self,event) => {
                let [_,x,y] = event.get_coords();
                let diff_x = x - press_cords[0];
                if (diff_x > 10) {
                    accent.css = `min-width: ${100*(1-2.718**-(diff_x/100)) + diff_x/100}px;transition: min-width 0s linear;`
                    card_content.css = `padding-left: ${50*(1-2.718**-(diff_x/500))+10}px;transition: padding 0s linear;`
                }
            })

        }
    }),
    overlays: [
        hider
    ],
    setup: (self) => Utils.timeout(100,() => {
        let box = self.child.child;
        if (!left){
            box.children = box.children.reverse();
        };
        Utils.timeout(100, () => {
            hider.toggleClassName("enter",true);
            Utils.timeout(300, () => {
                box.toggleClassName("enter",true);
                hider.toggleClassName("enter-phase-2",true);
                Utils.timeout(300, () => {
                    self.overlays = [];
                })
            })
        })
    }),    
    connections: [
        [notification_obj, (self) => {
            if (!notification_obj.popup) {
                if (dismissed) {
                    return;    
                }
                dismissed = true;
                print("dismissed")
                
                let box = self.child.child;
                let box_alloc = box.get_allocation();

                self.connect("size-allocate", () => {
                    if (safe_to_overlay) {
                        return;
                    }
                    if (self.overlays.length) {
                        if (self.overlays[0].get_allocation().width > 1){
                            safe_to_overlay = true;
                            let wait_time = closing?0:100+300+300;
                            Utils.timeout(wait_time, () => { // shudnt be needed but just for safe guard
                                accent.toggleClassName("leave",true);
                                hider.toggleClassName("leave",true);
                                Utils.timeout(350, ()=>{
                                    box.toggleClassName("leave",true);
                                    hider.toggleClassName("leave-phase-2",true);
                                    Utils.timeout(300,() => {
                                        box.css = `margin-top: -${box_alloc.height}px;transition: margin 0.1s ease-out;`
                                        hider.css = `margin-top: -${box_alloc.height}px;transition: margin 0.1s ease-out;`
                                        Utils.timeout(100,() => {
                                            self.destroy();
                                        })
                                    }); 
                                })
                            }) 
                            return;
                        }
                    }
                })

                self.add_overlay(hider);
                self.show_all();
            }
        }, "dismissed"]
    ]
})


const holder = ({
}) => Box({
    css: `margin-top: 150px;min-width:10px;min-height:10px;border: 0px black solid;`,
    vertical: true,
    classNames: ["notifications-holder"],
    children: [
        
    ],
    spacing: 5,
    connections: [
        [Notifications, (self,id) => {
            let noti = Notifications.getPopup(id);
            if (noti){

                self.add(
                    card({
                        notification_obj: noti,
                        content: noti.body,
                    }),
                )
                self.show_all();
                    
                
            }
        }, "notified"],
    ]
    
})


const notify = () => Window({
    name: "player",
    classNames: ["player"],
    margin: [0, 0, 0, 0],
    anchor: ["top","left"],
    exclusivity: "ignore",
    layer: "top",
    focusable: false,
    visible: true,
    child: holder({})
});



export default {
    style: css,

    windows: [
        notify()
    ],
  };