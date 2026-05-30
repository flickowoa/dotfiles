const resource = (file) => `resource:///com/github/Aylur/ags/${file}.js`;
const require = async (file) => (await import(resource(file))).default;
const service = async (file) => await require(`service/${file}`);

const App = await require("app");
const Widget = await require("widget");
const Variable = await require("variable");
const Utils = await import(resource("utils"));

const Hyprland = await service("hyprland");

const { min, max, round, abs, sqrt, random } = Math;

const { Gdk } = imports.gi;

const { Window, EventBox, Box, Overlay,Scrollable } = Widget;
const {exec} = Utils;

async function get_cursor() {
  return Hyprland.sendMessage("cursorpos").then((res) => {
    return res.split(",").map((n) => Number(n));
  });
}

const SCREEN_WIDTH = Number(
    exec(
      `bash -c "xrandr --current | grep '*' | uniq | awk '{print $1}' | cut -d 'x' -f1 | head -1"`
    )
  );
const SCREEN_HEIGHT = Number(
    exec(
      `bash -c "xrandr --current | grep '*' | uniq | awk '{print $1}' | cut -d 'x' -f2 | head -1"`
    )
  );

const rand_int = (a,b) => round(random()*(b-a)+a);
const dist_from_center = (x,y,center_x,center_y,width,height) => {
  let x_offset = abs(x-center_x)/2;
  let y_offset = abs(y-center_y);

  return (x_offset**2 + y_offset**2)**0.5;
}

const pos_mapper = (x,y,size1_x,size1_y,size2_x,size2_y) => {
  let x_ratio = x/size1_x;
  let y_ratio = y/size1_y;

  return [x_ratio*size2_x,y_ratio*size2_y];
}


let dark = false

await Utils.execAsync("ags -r dark.value").then((res) => {
  dark = res == "true";
}).catch(() => {});

let colors = dark?[218/255, 212/255, 187/255]:[87/255, 84/255, 74/255];

const parentConfigDir = App.configDir.split("/").slice(0,-2).join("/");

const {Gtk} = imports.gi;

const draw_triangle = (context, center_x,center_y, width, height, color, inverted, leftratio,rightratio,yratio) => {
  if (leftratio <= 0.001 || rightratio <= 0.001 || yratio <= 0.001) {
    return
  }
    
  context.setSourceRGBA(...color);
  let leftpoint,rightpoint,ypoint;

  if (inverted) {
      leftpoint = [center_x-width/2,center_y+height/2];
      rightpoint = [center_x+width/2,center_y+height/2];
      ypoint = [center_x,center_y-height/2];
  }
  else {
      leftpoint = [center_x-width/2,center_y-height/2];
      rightpoint = [center_x+width/2,center_y-height/2];
      ypoint = [center_x,center_y+height/2];
  }

  if (leftratio < 0.9){
    let vector_left_right = [(rightpoint[0]-leftpoint[0])*(1-leftratio),(rightpoint[1]-leftpoint[1])*(1-leftratio)];
    let vector_left_y = [(ypoint[0]-leftpoint[0])*(1-leftratio),(ypoint[1]-leftpoint[1])*(1-leftratio)];
    leftpoint = [
      leftpoint[0]+vector_left_right[0]/2+vector_left_y[0]/2,
      leftpoint[1]+vector_left_right[1]/2+vector_left_y[1]/2
    ];
  }
  if (rightratio < 0.9){
    let vector_right_left = [(leftpoint[0]-rightpoint[0])*(1-rightratio),(leftpoint[1]-rightpoint[1])*(1-rightratio)];
    let vector_right_y = [(ypoint[0]-rightpoint[0])*(1-rightratio),(ypoint[1]-rightpoint[1])*(1-rightratio)];
    rightpoint = [
      rightpoint[0]+vector_right_left[0]/2+vector_right_y[0]/2,
      rightpoint[1]+vector_right_left[1]/2+vector_right_y[1]/2
    ];
  }
  if (yratio < 0.9){
    let vector_y_left = [(leftpoint[0]-ypoint[0])*(1-yratio),(leftpoint[1]-ypoint[1])*(1-yratio)];
    let vector_y_right = [(rightpoint[0]-ypoint[0])*(1-yratio),(rightpoint[1]-ypoint[1])*(1-yratio)];
    ypoint = [
        ypoint[0]+vector_y_left[0]/2+vector_y_right[0]/2,
        ypoint[1]+vector_y_left[1]/2+vector_y_right[1]/2
    ];
  } 

  

  

  context.moveTo(...leftpoint);
  context.lineTo(...rightpoint);
  context.lineTo(...ypoint);

  context.fill();
}

const NierGeom = ({

  anchor_x1 = Variable(-2, {}),
  anchor_y1 = Variable(-2, {}),
  anchor_x2 = Variable(-2, {}),
  anchor_y2 = Variable(-2, {}),
  DESTRUCTION = false,

  cell_width = 200,
  cell_height = round(sqrt(cell_width*cell_width-(cell_width/2)*(cell_width/2))),

  cell_grid = new Gtk.DrawingArea(),
  wait_for_draw = false,
  wait_for_complete_draw = false,
  draw_t = 0,
  draw_duration = 1000,
  final_draw = true,
  gap = 3,
  rows = round(SCREEN_HEIGHT/cell_height) + 1,
  cols = round(SCREEN_WIDTH*2/cell_width) + 1,
  cells = Array.from({ length: rows*cols }, (_, i) => {return [0,0 ,0,0 ,0,0 ,0,0, 0,0]}),

  opacity_step = 10,
  vertex_step = 10,

  first_update = 0,
  entered = false,

  update_css = async (self) => {try{
    if (first_update < 4) {
      first_update++;
      return
    }
    let [tmp_cell_x1,tmp_cell_y1] = pos_mapper(anchor_x1.value,anchor_y1.value,SCREEN_WIDTH,SCREEN_HEIGHT,cols,rows);
    let [tmp_cell_x2,tmp_cell_y2] = pos_mapper(anchor_x2.value,anchor_y2.value,SCREEN_WIDTH,SCREEN_HEIGHT,cols,rows);
    
    let real_x1 = min(tmp_cell_x1,tmp_cell_x2);
    let real_y1 = min(tmp_cell_y1,tmp_cell_y2);
    let real_x2 = max(tmp_cell_x1,tmp_cell_x2);
    let real_y2 = max(tmp_cell_y1,tmp_cell_y2);

    let cell_x1 = real_x1-2
    let cell_y1 = real_y1-2

    let cell_x2 = real_x2+1
    let cell_y2 = real_y2+1

    let center_x = (cell_x1+cell_x2)/2;
    let center_y = (cell_y1+cell_y2)/2;

    let x_dist = abs(cell_x2-cell_x1)/2;
    let y_dist = abs(cell_y2-cell_y1)/2;

    vertex_step = 2;
    for (let i = 0; i< rows*cols; i++){
      let x = i%cols;
      let y = (i-x)/cols;
      let [c_opacity,t_opacity, c_left,t_left ,c_right,t_right ,c_y,t_y,inited,s_override] = cells[i] 
      let leftside =  x < cell_x2 && dist_from_center(x,y,real_x1+y_dist,center_y,cols,rows) < y_dist 
      let rightside = x > cell_x1 && dist_from_center(x,y,real_x2-y_dist,center_y,cols,rows) < y_dist
      let topside = x > cell_x1 && x < cell_x2 && y < cell_y2 && dist_from_center(x,y,center_x,real_y1+x_dist-2,cols,rows) < x_dist
      let bottomside = x > cell_x1 && x < cell_x2 && y > cell_y1 && dist_from_center(x,y,center_x,real_y2-x_dist+1,cols,rows) < x_dist
      
      let inside = leftside || rightside || topside || bottomside
      if ([t_left,t_right,t_y].includes(0) && inside) {
        continue
      }
      if (inside) {
        if (!inited || !entered) {
          s_override = true;
        } 
        
        let inverted = (x%2==0?y%2==1:y%2==0);
        if ((y > (cell_y2-1) && inverted) || (y < (cell_y1+1) && !inverted)) {
          [t_y,t_left,t_right] = [0,1,1]
        } else if ((x > (cell_x2-1)) || (x > center_x)) {
          [t_y,t_left,t_right] = [1,0,1]
        } else if ((x <= (cell_x1+1)) || x < center_x) {
          [t_y,t_left,t_right] = [1,1,0]
        }
      } else {
        s_override = false
        t_right = 1;
        t_left = 1;
        t_y = 1;
        t_opacity = 0.7;
      }
      cells[i] = [c_opacity,t_opacity, c_left,t_left ,c_right,t_right ,c_y,t_y,inited,s_override];
    }
    wait_for_draw = true;
    cell_grid.queue_draw()
    while (wait_for_draw) {
      await new Promise((r) => setTimeout(r, 1));
    }

    let alloc = self.get_allocation();
    let width = alloc.width;
    let height = alloc.height;
    self.css = `margin-left:${min(
      anchor_x1.value,
      anchor_x2.value
    )}px;margin-top:${min(anchor_y1.value, anchor_y2.value)}px;margin-right:${
      width - max(anchor_x1.value, anchor_x2.value)
    }px;margin-bottom:${
      height - max(anchor_y1.value, anchor_y2.value)
    }px;`;
  }catch(e){print(e)}},
}) =>
  Window({
    name: "geom",
    classNames: ["geom"],
    margin: [0, 0, 0, 0],
    anchor: ["top", "left", "bottom", "right"],
    exclusivity: "ignore",
    layer: "overlay",
    focusable: true,
    setup: (self) =>
      Utils.timeout(1, () => {
        cell_grid.connect("draw", (self, context) => {
          let stable = true;
          for (let i = 0; i < rows*cols; i++) {
              let x = i%cols;
              let y = (i-x)/cols;
              let [c_opacity,t_opacity, c_left,t_left ,c_right,t_right ,c_y,t_y,inited,s_override] = cells[i]
              if (s_override == true) {
                continue
              }
              if (abs(c_opacity-t_opacity) > 0.01) {
                stable = false;
                c_opacity = c_opacity + (t_opacity-c_opacity)/opacity_step;
              }

              if (abs(c_left-t_left) > 0.001) {
                stable = false;
                c_left = c_left + (t_left-c_left)/vertex_step;
              }

              if (abs(c_right-t_right) > 0.001) {
                stable = false;
                c_right = c_right + (t_right-c_right)/vertex_step;
              }

              if (abs(c_y-t_y) > 0.001) {
                stable = false;
                c_y = c_y + (t_y-c_y)/vertex_step;
              }

              draw_triangle(context, x*cell_width/2, y*cell_height, cell_width - gap, cell_height - gap/2, [...colors,c_opacity], (x%2==0?y%2==1:y%2==0),c_left,c_right,c_y);

              cells[i] = [c_opacity,t_opacity, c_left,t_left ,c_right,t_right ,c_y,t_y,inited,s_override]
          }
          wait_for_draw = false;
          if (final_draw && !stable){
              // print("stabling")
              cell_grid.queue_draw();
          } else if (final_draw && stable) {
            wait_for_complete_draw = false;
          }
        })
        self.connect("key-press-event", async (widget, event) => {try{
          if (event.get_keyval()[1] == Gdk.KEY_Escape) {
            const [x,y] = await get_cursor()            
            // cell_grid exit
            let start = Date.now();
            draw_duration = 1000;
            let fps = 15;

            draw_t = start
            final_draw = false;
            vertex_step = 3;
            opacity_step = 2;

            let [real_x,real_y] = await get_cursor();
            let [center_x,center_y] = pos_mapper(real_x,real_y,SCREEN_WIDTH,SCREEN_HEIGHT,cols,rows);

            let max_dist = (max(center_x,rows-center_x)**2 + max(center_y,cols-center_y)**2)**0.5 + 1;
                        while (true) {
              let frame_start = Date.now();
              let time_ratio = (draw_t - start)/draw_duration;
              for (let i = 0; i< rows*cols; i++){
                let x = i%cols;
                let y = (i-x)/cols;
                let [c_opacity,t_opacity, c_left,t_left ,c_right,t_right ,c_y,t_y,inited,s_override] = cells[i]
                if (s_override) {
                  entered = true;
                  return
                }
                let dist = dist_from_center(x,y,center_x,center_y,cols,rows)
                if (time_ratio>1?1:dist < max_dist*time_ratio*(rand_int(10,100)/100)) {
                  inited = true;
                  t_opacity = 0
                }
                cells[i] = [c_opacity,t_opacity, c_left,t_left ,c_right,t_right ,c_y,t_y,inited,s_override];
              }
              final_draw = true;
              wait_for_complete_draw = true;
              wait_for_draw = true;
              cell_grid.queue_draw();
              while (wait_for_draw) {
                await new Promise((r) => setTimeout(r, 1));
              }
              if (time_ratio > 0.6) { // this cud need changing
                entered = true;
                print("selection cancelled")
                App.quit();
              }
              draw_t = Date.now();
              await new Promise((r) => setTimeout(r, max(0,1000/fps - (draw_t-frame_start))));
            }
          }
          // it ctrl
          if (event.get_keyval()[1] == 65507) {
            let tmp1 = anchor_x1.value;
            let tmp2 = anchor_y1.value;
            anchor_x1.setValue(anchor_x2.value);
            anchor_y1.setValue(anchor_y2.value);
            anchor_x2.setValue(tmp1);
            anchor_y2.setValue(tmp2);
            Hyprland.sendMessage(`dispatch movecursor ${round(tmp1)} ${round(tmp2)}`);
          }
      }catch(e){print(e)}});}),
    child: EventBox({
      classNames: ["nier-geom-container"],
      child: Overlay({
        child: Scrollable({
          child:cell_grid,
          setup: (self) => Utils.timeout(1, async () => {try{
            let start = Date.now();
            draw_duration = 3000;
            let fps = 15;
  
            draw_t = start
            final_draw = false;
            vertex_step = 3;
            opacity_step = 10;
  
            let [real_x,real_y] = await get_cursor();
            let [center_x,center_y] = pos_mapper(real_x,real_y,SCREEN_WIDTH,SCREEN_HEIGHT,cols,rows);
  
            let max_dist = (max(center_x,rows-center_x)**2 + max(center_y,cols-center_y)**2)**0.5 + 1;
            
            while (true) {
              let frame_start = Date.now();
              let time_ratio = (draw_t - start)/draw_duration;
              for (let i = 0; i< rows*cols; i++){
                let x = i%cols;
                let y = (i-x)/cols;
                let [c_opacity,t_opacity, c_left,t_left ,c_right,t_right ,c_y,t_y,inited,s_override] = cells[i]
                if (s_override) {
                  entered = true;
                  return
                }
                let dist = dist_from_center(x,y,center_x,center_y,cols,rows)
                if (time_ratio>1?1:dist < max_dist*time_ratio*(rand_int(50,100)/100)) {
                  if (!inited){
                    inited = true;
                    c_opacity = 1;
                  }
                  t_opacity = 0.5
                  if (dist < 2) {
                    t_y = 1;
                    [c_left,t_left,c_right,t_right] = [1,1,1,1]
                  }else if (x < center_x) {
                    t_left = 1;
                    [c_right,t_right,c_y,t_y] = [1,1,1,1]
                  } else {
                    t_right = 1;
                    [c_left,t_left,c_y,t_y] = [1,1,1,1]
                  }
                }
                cells[i] = [c_opacity,t_opacity, c_left,t_left ,c_right,t_right ,c_y,t_y,inited,s_override];
              }
              final_draw = true;
              wait_for_complete_draw = true;
              wait_for_draw = true;
              cell_grid.queue_draw();
              while (wait_for_draw) {
                await new Promise((r) => setTimeout(r, 1));
              }
              if (time_ratio > 1) { // this cud need changing
                entered = true;
                break
              }
              draw_t = Date.now();
              await new Promise((r) => setTimeout(r, max(0,1000/fps - (draw_t-frame_start))));
            }
            
  
            
        }catch(e){print(e)}})
        }),
        overlays: [
          Box({
            vertical: true,
            hexpand: false,
            vexpand: false,
            classNames: ["nier-geom-select"],
            connections: [
                [anchor_x1, update_css],
                [anchor_x2, update_css],
                [anchor_y1, update_css],
                [anchor_y2, update_css],
              ],
          })
        ]
      }),
      
      setup: (self) =>
        Utils.timeout(1, () => {
          self.connect("button-press-event", (self, event) => {
            let [, x, y] = event.get_coords();
            anchor_x1.setValue(x);
            anchor_y1.setValue(y);
            anchor_x2.setValue(x);
            anchor_y2.setValue(y);
          });
          self.connect("button-release-event", (self, event) => {
            let [, x, y] = event.get_coords();
            anchor_x2.setValue(x);
            anchor_y2.setValue(y);
            DESTRUCTION = true;
            self.css = `opacity: 0;transition: opacity 0s linear;`
            Utils.timeout(10, () => {
              print(`${round(min(anchor_x1.value, anchor_x2.value))},${round(min(anchor_y1.value, anchor_y2.value))} ${abs(round(anchor_x2.value-anchor_x1.value))+1}x${abs(round(anchor_y2.value-anchor_y1.value))+1}`);
              App.quit();
            });
          });
          self.connect("motion-notify-event", (self, event) => {
            let [, x, y] = event.get_coords();
            anchor_x2.setValue(x);
            anchor_y2.setValue(y);
          });
        }),
    }),
  });

export default {
    style: App.configDir + "/style.css",
    windows: [
        NierGeom({})
    ]
}