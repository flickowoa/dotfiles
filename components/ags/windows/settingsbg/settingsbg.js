const resource = (file) => `resource:///com/github/Aylur/ags/${file}.js`;
const require = async (file) => (await import(resource(file))).default;

const App = await require("app");
const Widget = await require("widget");
const Utils = await import(resource("utils"));

const { max, round, abs, sqrt, random } = Math;

const { Window, EventBox, Overlay, Scrollable } = Widget;
const {exec} = Utils;

globalThis.App = App;

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
  DESTRUCTION = false,

  cell_width = 512,
  cell_height = round(sqrt(cell_width*cell_width-(cell_width/2)*(cell_width/2))),

  cell_grid_1 = new Gtk.DrawingArea(),
  wait_for_draw_1 = false,
  wait_for_complete_draw_1 = false,
  draw_t_1 = 0,
  draw_duration_1 = 1000,
  final_draw_1 = true,
  gap = 0,
  rows = round(SCREEN_HEIGHT/cell_height) + 1,
  cols = round(SCREEN_WIDTH*2/cell_width) + 1,
  cells_1 = Array.from({ length: rows*cols }, (_, i) => {return [0,0 ,0,0 ,0,0 ,0,0, 0,0]}),

  opacity_step = 10,
  vertex_step = 10,

  first_update = 0,
  entered = false,
}) =>
  Window({
    name: "bg_settings",
    classNames: ["bg_settings"],
    margin: [0, 0, 0, 0],
    anchor: ["top", "left", "bottom", "right"],
    exclusivity: "ignore",
    layer: "top",
    focusable: false,
    setup: (self) =>
      Utils.timeout(1, () => {
        cell_grid_1.connect("draw", (self, context) => {
          // print("drawing")
          let stable = true;
          for (let i = 0; i < rows*cols; i++) {
              let x = i%cols;
              let y = (i-x)/cols;
              let [c_opacity,t_opacity, c_left,t_left ,c_right,t_right ,c_y,t_y,inited,s_override] = cells_1[i]
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

              cells_1[i] = [c_opacity,t_opacity, c_left,t_left ,c_right,t_right ,c_y,t_y,inited,s_override]
          }
          wait_for_draw_1 = false;
          if (final_draw_1 && !stable){
              // print("stabling")
              cell_grid_1.queue_draw();
          } else if (final_draw_1 && stable) {
            wait_for_complete_draw_1 = false;
          }
        })
    }),
    connections: [
      [
        App,
        (self, windowName, visible) => {
          if (windowName ==  "bg_settings") {
            print("bg_visibility",visible)

            if (!visible) {
              Utils.timeout(1, async () => {try{

                ////////////////////////////////////////////////////////////////////////////////////////////////////////
                // exit part
                ////////////////////////////////////////////////////////////////////////////////////////////////////////
    
                let start = Date.now();
                draw_duration_1 = 1000;
                let fps = 30;
      
                draw_t_1 = start
                final_draw_1 = false;
                opacity_step = 2;
                vertex_step = 2;
      
                let [center_x,center_y] = [0,rand_int(rows/4,3*rows/4)];
      
                let max_dist = (max(center_x,rows-center_x)**2 + max(center_y,cols-center_y)**2)**0.5 + 1;
                
                while (true) {
                  let frame_start = Date.now();
                  let time_ratio = (draw_t_1 - start)/draw_duration_1;
                  for (let i = 0; i< rows*cols; i++){
                    let x = i%cols;
                    let y = (i-x)/cols;
                    let [c_opacity,t_opacity, c_left,t_left ,c_right,t_right ,c_y,t_y,inited,s_override] = cells_1[i]
                    if (s_override) {
                      entered = true;
                      return
                    }
                    let dist = dist_from_center(x,y,center_x,center_y,cols,rows)
                    if (time_ratio>1?1:dist < max_dist*time_ratio*(rand_int(0,100)/100)) {
                      if (inited == true) {
                        inited = false;
                        c_opacity = 1;
                      }
                      t_opacity = 0
                    }
                    cells_1[i] = [c_opacity,t_opacity, c_left,t_left ,c_right,t_right ,c_y,t_y,inited,s_override];
                  }
                  final_draw_1 = true;
                  wait_for_complete_draw_1 = true;
                  wait_for_draw_1 = true;
                  cell_grid_1.queue_draw();
                  while (wait_for_draw_1) {
                    await new Promise((r) => setTimeout(r, 1));
                  }
                  if (time_ratio > 1) {
                    break
                  }
                  draw_t_1 = Date.now();
                  await new Promise((r) => setTimeout(r, max(0,1000/fps - (draw_t_1-frame_start))));
                }
                ////////////////////////////////////////////////////////////////////////////////////////////////////////
              }catch(e){print(e)}})
            } else {
            }
        }},
        "window-toggled",
      ],
    ],
    child: EventBox({
      classNames: ["nier-geom-container"],
      child: Overlay({
        child: Scrollable({
          child:cell_grid_1,
          setup: (self) => Utils.timeout(1, async () => {try{
            globalThis.App = App;
            ////////////////////////////////////////////////////////////////////////////////////////////////////////
            // first part
            ////////////////////////////////////////////////////////////////////////////////////////////////////////

            let start = Date.now();
            draw_duration_1 = 1000;
            let fps = 30;
  
            draw_t_1 = start
            final_draw_1 = false;
            vertex_step = 2;
  
            let [center_x,center_y] = [0,rand_int(rows/4,3*rows/4)];
  
            let max_dist = (max(center_x,rows-center_x)**2 + max(center_y,cols-center_y)**2)**0.5 + 1;
            
            while (true) {
              let frame_start = Date.now();
              let time_ratio = (draw_t_1 - start)/draw_duration_1;
              for (let i = 0; i< rows*cols; i++){
                let x = i%cols;
                let y = (i-x)/cols;
                let [c_opacity,t_opacity, c_left,t_left ,c_right,t_right ,c_y,t_y,inited,s_override] = cells_1[i]
                if (s_override) {
                  entered = true;
                  return
                }
                let dist = dist_from_center(x,y,center_x,center_y,cols,rows)
                if (time_ratio>1?1:dist < max_dist*time_ratio*(rand_int(50,100)/100)) {
                  if (inited == false) {
                    inited = true;
                    c_opacity = 1;
                  }
                  t_opacity = 0.6
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
                cells_1[i] = [c_opacity,t_opacity, c_left,t_left ,c_right,t_right ,c_y,t_y,inited,s_override];
              }
              final_draw_1 = true;
              wait_for_complete_draw_1 = true;
              wait_for_draw_1 = true;
              cell_grid_1.queue_draw();
              while (wait_for_draw_1) {
                await new Promise((r) => setTimeout(r, 1));
              }
              if (time_ratio > 1) {
                break
              }
              // draw_t_1++;
              draw_t_1 = Date.now();
              await new Promise((r) => setTimeout(r, max(0,1000/fps - (draw_t_1-frame_start))));
            }
            ////////////////////////////////////////////////////////////////////////////////////////////////////////
  
            
        }catch(e){print(e)}})
        }),
        overlays: [
          
        ]
      }),
    }),
  });

export default {
    closeWindowDelay: {
        bg_settings: 1100,
    },
    windows: [
        NierGeom({})
    ]
}