// importing
import {
  App,
  Widget,
  Utils,
  Mpris,
  Variable,
} from "./imports.js";

import {
  arradd,
  dark,
  arrremove,
  rand_int,
  parentConfigDir,
  badapple
} from "./utils.js";



const { Box, Label, Button, EventBox, Revealer } = Widget;
const { execAsync, timeout } = Utils;
const { GdkPixbuf, Pango, Gtk } = imports.gi;

const { round } = Math;

const opacity_map_len = 512;
const opacity_map = Array.from({ length: opacity_map_len+1 }, (_, i) => i / opacity_map_len);

const cava = Variable([],{
  listen: [App.configDir + '/scripts/cava', out => out.split(";").filter(n => n).map(n => Number(n)/1000)]
})

let colors = dark.value?[218/255, 212/255, 187/255]:[87/255, 84/255, 74/255];

dark.connect("changed",() => {
  colors = dark.value?[218/255, 212/255, 187/255]:[87/255, 84/255, 74/255];
})

const color_mix = (c1, c2, t) => {
  return [
    c1[0] * (1 - t) + c2[0] * t,
    c1[1] * (1 - t) + c2[1] * t,
    c1[2] * (1 - t) + c2[2] * t,
  ];
}

const color_diff = (c1, c2) => {
  return [
    Math.abs(c1[0] - c2[0]),
    Math.abs(c1[1] - c2[1]),
    Math.abs(c1[2] - c2[2]),
  ];
}

const image_to_matrix = async (inputPath, imagedat, threshold = 128) => {
  // Load the image from file
  print("making image to matrix")
  const resizedPixbuf = GdkPixbuf.Pixbuf.new_from_file(inputPath);

  const pixels = resizedPixbuf.get_pixels();
  const rowstride = resizedPixbuf.get_rowstride();
  const channels = resizedPixbuf.get_n_channels();

  let max = 0;
  let min = 1;
  const darknessMatrix = [];
  for (let y = 0; y < resizedPixbuf.get_height(); y++) {
    for (let x = 0; x < resizedPixbuf.get_width(); x++) {
      const index = y * rowstride + x * channels;
      const [r, g, b] = pixels.slice(index, index + channels);

      const intensity = Math.round(0.3 * r + 0.59 * g + 0.11 * b);
      const darkness = dark.value?1 - intensity / 255.0:intensity / 255.0;
      if (darkness > max) {
        max = darkness;
      }
      if (darkness < min) {
        min = darkness;
      }
      darknessMatrix.push([r/255,g/255,b/255,darkness]);
    }
  }

  for (let i = 0; i < resizedPixbuf.get_height()*resizedPixbuf.get_width(); i++) {
    const cell = darknessMatrix[i][3] + (dark.value?(-min):(1-max));
    // const darkness =  1-cell;
    const darkness = 1 - opacity_map[Math.round(cell * (opacity_map.length - 1))];
    darknessMatrix[i][3] = [darkness]
  }
  imagedat.value = darknessMatrix;

  print("done making image to matrix")
  return [min, max];
};

const cava_vis = ({
  bar1_pos = 1,
  bar2_pos = 1,
}) => Box({
  classNames: ["cava-vis"],
  children: [
    Box({
      classNames: ["cava-bar-thin"],
      connections: [
        [cava, (self) => {
          let cava_val = cava.value[1];
          if (isNaN(bar1_pos)) {
            bar1_pos = 0;
          }
          self.css = `background-position: 100% ${bar1_pos}%;`;
          
          bar1_pos = bar1_pos - (cava_val>0.5?cava_val>0.9?cava_val*10:cava_val*5:cava_val) - 0.01;
          if (bar1_pos < -200) {
            bar1_pos = 0;
          }
        }]
      ]
    }),
    Box({
      classNames: ["cava-bar-thick"],
      connections: [
        [cava, (self) => {
          let cava_val = cava.value[round(cava.value.length/2)];
          if (isNaN(bar2_pos)) {
            bar2_pos = 0;
          }
          self.css = `background-position: 100% ${bar2_pos}%;`;
          bar2_pos = bar2_pos + (cava_val>0.5?cava_val>0.9?cava_val*10:cava_val*5:cava_val) + 0.01;
          if (bar2_pos > 200) {
            bar2_pos = 0;
          }
        }]
      ]
    })
  ]
})


export const NowPlaying = ({
  rows = 64,
  showingdat = Variable(
    Array.from({ length: rows*rows }, (_, i) => [0,0,0,1,1,0]),
  {}
  ),
  imagedat = Variable(
    Array.from({ length: rows*rows }, (_, i) => [1,1,1,1]),
    {}
  ),
  prevdat = [],
  cell_width = 10,
  cell_height = 10,
  preparing_cover = false,
  orig_vis_alloc = null,
  orig_container_alloc = null,
  orig_player_alloc = null,
  drawingArea = new Gtk.DrawingArea(),
  //
  wait_for_draw = false,
  draw_t = 0,
  draw_duration = 1000,
  drawing_rn = false,
  current_info = "",
  current_cover_info = "",
  badappling = false,
  wait_for_apples = false,
  prev_apples = 0,
  apples=0,
  apple_names = ["【東方】Bad Apple!! ＰＶ【影絵】","Bad Apple!! - Full Version w/video [Lyrics in Romaji, Translation in English]","Bad Apple!!"]
}) =>
Box({
  classNames: ["player"],
  children: [
    Box({
      vertical: true,
      classNames: ["nowplaying-container"],
      children: [
        Box({
          css: `min-width: ${rows * cell_width + 30 + 30 - 20}px;`,
          hpack: "end",
          children: [
            Button({
              hpack: "end",
              classNames: ["player-buttons"],
              hexpand: true,
              child: Label({
                label: "⏮",
                classNames: ["heading"],
              }),
              onClicked: async (self) => {
                const player = Mpris.players[0];
                player.previous();
                self.classNames = arradd(self.classNames, "pressed");
                await new Promise((r) => setTimeout(r, 100));
                self.classNames = arrremove(self.classNames, "pressed");
              },
            }),
            Button({
              hpack: "end",
              classNames: ["player-buttons"],
              child: Label({
                label: "▪",
                classNames: ["heading"],
                connections: [
                  [
                    Mpris,
                    (self) => {
                      const player = Mpris.players[0];
                      if (!player) {
                        return;
                      }
                      if (player.play_back_status === "Playing") {
                        self.label = "⏸";
                      } else {
                        self.label = "▪";
                      }
                    },
                  ],
                ],
              }),
              onClicked: async (self) => {
                const player = Mpris.players[0];
                if (!player) {
                  return;
                }
                player.playPause();
  
                if (player.play_back_status === "Playing") {
                  self.child.label = "▪";
                } else {
                  self.child.label = "⏸";
                }
  
                self.classNames = arradd(self.classNames, "pressed");
                await new Promise((r) => setTimeout(r, 100));
                self.classNames = arrremove(self.classNames, "pressed");

                let self_alloc = self.get_allocation();

                let forward_alloc = self.parent.children[2].get_allocation();

                let forward_cells = Math.floor(forward_alloc.width/cell_width);
                let self_cells = Math.floor((self_alloc.width/2)/cell_width);

                let cell_x = rows - (forward_cells+self_cells);
                let cell_y = 0;

                let max_thick = 10;

                let max_dist = (
                  ((Math.max(cell_x, rows - cell_x))) ** 2
                  + (Math.max(cell_y, rows - cell_y)) ** 2
                ) ** 0.5 + max_thick

                for (let t = 0; t<max_dist; t++){
                  for (let i = 0; i < rows*rows; i++){
                    let this_x = i%rows;
                    let this_y = Math.floor(i/rows);
  
                    let dist_x = Math.abs(this_x - cell_x);
                    let dist_y = Math.abs(this_y - cell_y);
  
                    let dist = (dist_x**2 + dist_y**2)**0.5;
  
                    if (Math.abs(dist - t) < rand_int(-10,max_thick)*(1 - t/max_dist)) {
                      let [r2,g2,b2,darkness] = [0,0,0,0]
                      if (badappling) {
                        [r2,g2,b2,darkness] = [imagedat.value[i],imagedat.value[i],imagedat.value[i],imagedat.value[i]];
                      } else {
                        [r2,g2,b2,darkness] = imagedat.value[i];
                      }
                      let [r,g,b,o,opacity,offset] = showingdat.value[i];
  
                      [r,g,b,o,offset] = [r2,g2,b2,1,1];
                      opacity = darkness;
  
                      showingdat.value[i] = [r,g,b,o,opacity,offset];
                    }
                  }
                  drawingArea.queue_draw();
                  wait_for_draw = true;
                  while (wait_for_draw) {
                    await new Promise((r) => setTimeout(r, 1));
                  }
                  await new Promise((r) => setTimeout(r, 20*(t/max_dist)));
                }
              },
            }),
            Button({
              hpack: "end",
              classNames: ["player-buttons"],
              css: "margin-right: 15px;",
              child: Label({
                label: "⏭",
                classNames: ["heading"],
              }),
              onClicked: async (self) => {
                const player = Mpris.players[0];
                player.next();
                self.classNames = arradd(self.classNames, "pressed");
                await new Promise((r) => setTimeout(r, 100));
                self.classNames = arrremove(self.classNames, "pressed");
              },
            }),
          ],
        }),
        EventBox({
          setup: (self) => Utils.timeout(1, () => {
            self.connect("motion-notify-event", (widget, event) => {
              let [_,x,y] = event.get_coords();

              let drawing_alloc = drawingArea.get_allocation();
              
              let [drawing_x,drawing_y] = [drawing_alloc.x,drawing_alloc.y];
              
              let real_x = x - drawing_x;
              let real_y = y - drawing_y;

              let cell_x = Math.floor(real_x/cell_width);
              let cell_y = Math.floor(real_y/cell_height);

              let cell_index = cell_y*rows + cell_x;

              let [r2,g2,b2,darkness] = [0,0,0,0]
              if (badappling) {
                [r2,g2,b2,darkness] = [imagedat.value[cell_index],imagedat.value[cell_index],imagedat.value[cell_index],imagedat.value[cell_index]];
              } else {
                [r2,g2,b2,darkness] = imagedat.value[cell_index];
              }
              let [r,g,b,o,opacity,offset] = showingdat.value[cell_index];
  
              [r,g,b,o,offset] = [r2,g2,b2,1,1];
              opacity = darkness;
  
              showingdat.value[cell_index] = [r,g,b,o,opacity,offset];
              drawingArea.queue_draw();
            })
          }),
          child:Box({
            classNames: ["image-matrix-container"],
            hpack: "center",
            css: `min-height: ${rows*cell_height}px; min-width: ${rows*cell_width}px;`,
            children: [
              drawingArea,
            ],
            connections: [
              [1000,() => {
                  drawingArea.queue_draw();
              }]
           ],
            setup: (self) => Utils.timeout(1, () => {
              drawingArea.hexpand = true;
              drawingArea.hpack = "end";
              drawingArea.connect('draw', (widget, context) => {
                for (let i = 0; i < rows*rows; i++){
                  const x = i%rows;
                  const y = Math.floor(i/rows);
  
                  let [r,g,b,current_opacity,opacity,offset] = showingdat.value[i];
  
                  if (opacity == 0 && current_opacity == 0) {
                    continue;
                  }
  
                  let diff = !color_diff([r,g,b], colors).every(n => n < 1/255);
  
                  let opacity_diff = Math.abs(current_opacity - opacity) > 1/255;

                  if (badappling) {
                    if (diff && opacity_diff <= Math.abs(current_opacity + (opacity-current_opacity)/2)){
                      [r,g,b] = color_mix([r,g,b], colors, 0.1);
                    }
    
                    if (opacity_diff){
                      current_opacity = current_opacity + (opacity-current_opacity)*(0.1);
                    }
                  } else {
                    if (diff && opacity_diff <= Math.abs(current_opacity + (opacity-current_opacity)/2)){
                      [r,g,b] = color_mix([r,g,b], colors, 0.2);
                    }
    
                    if (opacity_diff){
                      current_opacity = current_opacity + (opacity-current_opacity)*(0.2);
                    }
                  }
  
                  
  
                  if (offset!=0 && offset < 100) {
                    let now_offset = offset;
                    if (now_offset > 50){
                      now_offset = 100 - now_offset;
                      if (badappling){
                        offset += 3
                      } else {
                        offset += 5;
                      }
                    } else {
                      if (badappling){
                        offset += 3
                      } else {
                        offset += 3;
                      }
                    }
                    const centerX = (x*cell_width) + (now_offset/100)*2*cell_width/2;
                    const centerY = (y*cell_height) + (now_offset/100)*2*cell_height/2;

                    context.setSourceRGBA(r,g,b, 2*current_opacity);
                    context.rectangle(centerX, centerY, cell_width, cell_height);
                    context.fill();
                    
                  } else {
                    context.setSourceRGBA(r,g,b,current_opacity);
                    context.rectangle(x*cell_width,y*cell_height,cell_width,cell_height);
                    context.fill();
                  }
  
                  showingdat.value[i] = [r,g,b,current_opacity,opacity,offset];
                  if (diff || opacity_diff || offset!=0){
                    drawingArea.queue_draw();
                  }
                }
                wait_for_draw = false;
              })
            }),
            connections: [
              [
                dark,
                (self) => {
                  Utils.timeout(500,async () => {
                    preparing_cover = true;
                    await image_to_matrix("/tmp/bg.png", imagedat, rows).catch((e) => {
                      preparing_cover = false;
                      console.log(e);
                    })
                    preparing_cover = false;
                    imagedat.emit("changed");
                  })
                },
                "changed"
              ],
              [
                imagedat,
                (self) => Utils.timeout(1, async () => {
                      try{

                        if (!badappling){
                          if (preparing_cover) {
                            return;
                          }
                          if (prevdat == JSON.stringify(imagedat.value)) {
                            print("same cover, returning :0 :: ")
                            return;
                          }
                          prevdat = JSON.stringify(imagedat.value);
                        }
              
                        console.log("got matrix update");
        
                        while (drawing_rn) {
                          await new Promise((r) => setTimeout(r, 1));
                        }
                        drawing_rn = true;

                        let now = Date.now();
                        let till = now + 5000;
                        let fps = 30;
                        if (badappling) {
                          wait_for_apples = true;
                          till = now + fps/1000;
                        }
                        
                        draw_t = 0;
                        draw_duration = till - now;
          
                        let final_draw = false;
      
                        while (true) {

                          let elapsed = Date.now();
                          for (let i = 0; i < rows*rows; i++){
                            // print(imagedat.value[i])
                            let [r2,g2,b2,darkness] = [0,0,0,0]
                            if (badappling) {
                              [r2,g2,b2,darkness] = [imagedat.value[i],imagedat.value[i],imagedat.value[i],imagedat.value[i]];
                            } else {
                              [r2,g2,b2,darkness] = imagedat.value[i];
                            }
                            let [r,g,b,o,opacity,offset] = showingdat.value[i];
          
                            if (!badappling && Math.abs(darkness-opacity) > 1/255) {
                              let time_ratio = draw_t/draw_duration;
                              if (darkness < time_ratio) {
                                [r,g,b,o,offset] = [r2,g2,b2,1,1];
                                opacity = darkness;
                              }
                            } else if (Math.abs(darkness-opacity) > 1/255) {
                              [r,g,b,o,offset] = [...colors,1,1];
                              opacity = darkness;
                            }

                            showingdat.value[i] = [r,g,b,o,opacity,offset];
                          }
                          drawingArea.queue_draw();
                          wait_for_draw = true;
                          while (wait_for_draw) {
                            await new Promise((r) => setTimeout(r, 1));
                          }
                          draw_t = Date.now() - now;
                          if (final_draw){
                            break;
                          }
                          if (draw_t >= draw_duration) {
                            final_draw = true;
                          }
                          await new Promise((r) => setTimeout(r, 1000/fps - (Date.now()-elapsed)));
                        }
                        drawing_rn = false
                        if (badappling) {wait_for_apples = false;}
                        console.log("relocking cover");
                      
                      }catch(e){
                        print(e)
                      }
                }),
                "changed",
              ],
              [
                Mpris,
                (self) => Utils.timeout(10,() => {
                  const player = Mpris.players[0];
                  if (!player) {
                    return;
                  }
                  if (preparing_cover) {
                    console.log("skipping mpris");
                    return;
                  }

                  if (current_cover_info == player.cover_path) {
                    console.log("same cover, returning");
                    return;
                  }

                  console.log("preparing cover ",current_cover_info);
                  current_cover_info = player.cover_path;


                  /////////////////////////////////////////////////////////////////////////////
                  // appols
                  /////////////////////////////////////////////////////////////////////////////

                  const pos_to_frame = (pos) => {
                    let pos_ratio = pos/player.length;
                    let frame = Math.floor(pos_ratio*badapple.length);
                    if (frame >= badapple.length) {
                      print("out of frame")
                      return badapple[0];
                    }
                    return badapple[frame];
                  }

                  Utils.timeout(1, async () => {
                    try{
                      if (apple_names.includes(player.track_title)) {
                        if (apples > 1 || badappling){
                          return
                        }
                        apples++;
                        prevdat=""
                        badappling = true;
                        while (apple_names.includes(player.track_title)) {
                          if (Math.abs(player.position-prev_apples) > 1/1000) {
                            prev_apples = player.position;
                            imagedat.value = pos_to_frame(player.position);
                            print("sent a frame")
                            while (wait_for_apples && badappling) {
                              await new Promise((r) => setTimeout(r, 1));
                            }
                          } else {await new Promise((r) => setTimeout(r, 1));}
                        }
                        badappling = false;
                        drawing_rn = false;
                        wait_for_draw = false;
                        return
                      }else{
                        badappling = false
                        wait_for_apples = false
                      }
                    }catch(e){
                      print(e)
                    }
                  })
          
                  /////////////////////////////////////////////////////////////////////////////

                  execAsync(["cp", player.cover_path, "/tmp/to_bg.png"])
                    .then((out) => {
                      print(out)
                      preparing_cover = true;
                      execAsync([
                        App.configDir + "/scripts/prepare_cover.sh",
                        player.cover_path,
                        `${rows}`,
                      ])
                        .then((out) => {
                          console.log("cover prepared");
                          Promise.resolve(
                            image_to_matrix("/tmp/bg.png", imagedat, rows).catch((e) => {
                              preparing_cover = false;
                              console.log(e);
                            })
                          ).then(() => {
                            preparing_cover = false;
                            imagedat.emit("changed");
                          }).catch(print);
                        })
                        .catch((e) => {
                          preparing_cover = false;
                          console.log(e);
                        });
                    })
                    .catch((e) => {
                      preparing_cover = false;
                      console.log(e);
                    });
                }),
              ],
            ],
          }),
        }),
        Box({
          classNames: ["nowplaying-info-container"],
          css: `margin-left: ${5}`,
          children: [
            Revealer({
              revealChild: false,
              transitionDuration: 1000,
              child: Label({
                label: "woa",
                classNames: ["heading"],
                css: `min-width: ${rows * cell_width}px;`,
                hpack: "end",
                xalign: 0,
                wrap: true,
                max_width_chars: 20,
                setup: (self) =>
                  Utils.timeout(1, () => {
                    self.set_line_wrap_mode(Pango.WrapMode.WORD_CHAR);
                    self.set_ellipsize(Pango.EllipsizeMode.END);
                  }),
              }),
              transition: "slide_left",
              connections: [
                [
                  Mpris,
                  async (self) => {
                    const player = Mpris.players[0];
                    if (!player) {
                      return;
                    }
                    if (player.track_title != current_info) {
                      current_info = player.track_title
                      let cursor = self.parent.children[1];
                      await new Promise((r) => setTimeout(r, 1500));
                      cursor.classNames = arrremove(cursor.classNames, "hidden");
                      await new Promise((r) => setTimeout(r, 1500));
                      self.revealChild = false;
                      await new Promise((r) => setTimeout(r, 1500));
                      self.child.label = current_info;
                      self.revealChild = true;
                      await new Promise((r) => setTimeout(r, 1500));
                      cursor.classNames = arradd(cursor.classNames, "hidden");
                    }
                  },
                ],
              ],
            }),
            Box({
              classNames: ["nowplaying-info-cursor"],
            }),
          ],
        }),
      ],
      connections: [],
    }),
    cava_vis({}),
    Box({
      classNames: ["nowplaying-hider"],
    })
  ],
  connections: [
    [
      App,
      (self, windowName, visible) => {
          if (windowName ==  "player") {
              let player = self
              let container = player.children[0];
              let vis = player.children[1];
              let hider = player.children[2];

              let buttons = container.children[0];
              let matrix = container.children[1];
              let info = container.children[2];


              if (!visible) {
                print("closing")
                let container_alloc = container.get_allocation();
                let vis_alloc = vis.get_allocation();
                let player_alloc = player.get_allocation();

                if (vis_alloc.width == 1){ // for some reason this ran twice and messed up orig var :0
                  return
                }

                Utils.timeout( 10, () => {
                  orig_container_alloc = container_alloc.width;
                  orig_vis_alloc = vis_alloc.width;
                  orig_player_alloc = player_alloc.width;
                  vis.toggleClassName("hiding",true);
                  vis.css = `margin-top: 0px;margin-bottom: 0px;transition: margin 0.2s cubic-bezier(0.15, 0.79, 0, 1);`;
                  container.css = `margin-right: -${vis_alloc.width*3}px;margin-left: ${vis_alloc.width*3}px;transition: margin 0.5s cubic-bezier(0.15, 0.79, 0, 1);`;
                  timeout(300, () => {
                    container.css = `margin-right: 0px;margin-left: ${vis_alloc.width}px;transition: margin 0.5s cubic-bezier(0.15, 0.79, 0, 1);`;
                    vis.css = `margin-top: 0px;margin-bottom: 0px;margin-left: -${container_alloc.width+vis_alloc.width}px;transition: margin 0.5s cubic-bezier(0.15, 0.79, 0, 1);`;
                    hider.css = `margin-left: -${container_alloc.width}px;transition: margin 0.5s cubic-bezier(0.15, 0.79, 0, 1);`;
                    timeout(600, () => {
                      draw_t = 0;
                      player.css = `margin-right: -${player_alloc.width-5}px;transition: margin 0.5s cubic-bezier(0.15, 0.79, 0, 1);`;
                    })
                    
                  })
                })
              } else {
                print("opening",orig_container_alloc,orig_player_alloc,orig_vis_alloc)

                container.css = `margin-right: ${orig_vis_alloc}px;`;
                player.css = `margin-right: -${orig_player_alloc-5}px;`;
                vis.css = `margin-top: 0px;margin-bottom: 0px;margin-left: -${orig_container_alloc+orig_vis_alloc}px;`;
                hider.css = `margin-left: -${orig_container_alloc}px;`;
                
                
                timeout(10, () => {
                  player.css = `margin-right: 0px;transition: margin 0.5s cubic-bezier(0.15, 0.79, 0, 1);`;
                  timeout(500, () => {
                    vis.css = `margin-top: 0px;margin-bottom: 0px;margin-left: 0px;transition: margin 0.5s cubic-bezier(0.15, 0.79, 0, 1);`;
                    hider.css = `margin-left: 0px;transition: margin 0.5s cubic-bezier(0.15, 0.79, 0, 1);`;
                    container.css = `margin-right: 0px;transition: margin 0.1s cubic-bezier(0.15, 0.79, 0, 1);`;
                    timeout(500, () => {
                      vis.toggleClassName("hiding",false);
                      vis.css = `margin-top: ${buttons.get_allocation().height}px;margin-bottom: ${info.get_allocation().height}px;transition: margin 0.3s cubic-bezier(0.15, 0.79, 0, 1);`;
                      hider.css = "opacity: 0;"
                      container.css = ""
                    })
                  })
                })
              }
          }
      },
      "window-toggled",
    ],
  ]
});
  
