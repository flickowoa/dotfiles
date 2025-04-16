#version 440
#define M_PI 3.14159265358979323846

layout(location = 0) in vec2 qt_TexCoord0;

layout(location = 0) out vec4 fragColor;

layout(binding = 1) uniform sampler2D source;

layout(std140, binding = 0) uniform buf {
    mat4 qt_Matrix;
    float qt_Opacity;

    uniform int gheight;
    uniform int gwidth;

    uniform float treshold;
    uniform float strength;

    uniform vec4 colorBg;
    uniform vec4 colorFg;
    uniform vec4 colorA;
    uniform vec4 colorB;
    uniform vec4 colorC;

    uniform float bars[10];

    uniform float bar0;
    uniform float bar1;
    uniform float bar2;
    uniform float bar3;
    uniform float bar4;
    uniform float bar5;
    uniform float bar6;
    uniform float bar7;
    uniform float bar8;
    uniform float bar9;

    uniform float t;
} ubuf;

////////////////
const mat2 myt = mat2(.12121212, .13131313, -.13131313, .12121212);
const vec2 mys = vec2(1e4, 1e6);

vec2 rhash(vec2 uv) {
    uv *= myt;
    uv *= mys;
    return fract(fract(uv / mys) * uv);
}

vec3 hash(vec3 p) {
    return fract(sin(vec3(dot(p, vec3(1.0, 57.0, 113.0)), dot(p, vec3(57.0, 113.0, 1.0)), dot(p, vec3(113.0, 1.0, 57.0)))) *
        43758.5453);
}

float voronoi2d(const in vec2 point) {
    vec2 p = floor(point);
    vec2 f = fract(point);
    float res = 0.0;
    for(int j = -1; j <= 1; j++) {
        for(int i = -1; i <= 1; i++) {
            vec2 b = vec2(i, j);
            vec2 r = vec2(b) - f + rhash(p + b);
            res += 1. / pow(dot(r, r), 8.);
        }
    }
    return pow(1. / res, 0.0625);
}

///////////////

float grayscale(vec4 color, float contrast) {
    float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    float contrasted = (gray - 0.5) * contrast + 0.5;
    return contrasted;
}

float rand(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}
float rand(vec2 co, float l) {
    return rand(vec2(rand(co), l));
}
float rand(vec2 co, float l, float t) {
    return rand(vec2(rand(co, l), t));
}

float noise(vec2 pos, float scale, float time) {
    float c = sin(pos.x * pos.y * pow(scale, 20) / 400 + time);
    return c;
}

float dots(vec2 pos, float scale, float time) {
    //pipes 
    float tlc = sin((pow(pos.x, 1.5) + pos.y) / scale + time);
    float tls = sin((pow(pos.y, 1.5) + pos.x) / scale + time);

    float brc = sin((pow(ubuf.gwidth - pos.x, 1.5) + pos.y) / scale + time);
    float brs = sin((pow(ubuf.gheight - pos.y, 1.5) + pos.x) / scale + time);

    float blc = sin((pow(pos.x, 1.5) + ubuf.gheight - pos.y) / scale + time);
    float bls = sin((pow(pos.y, 1.5) + ubuf.gwidth - pos.x) / scale + time);

    float trc = sin((pow(ubuf.gwidth - pos.x, 1.5) + ubuf.gheight - pos.y) / scale + time);
    float trs = sin((pow(ubuf.gheight - pos.y, 1.5) + ubuf.gwidth - pos.x) / scale + time);

    // float c = sin(cos(pos.x) * tan(pos.y) * pow(scale, 40) / 4000 + time / scale);
    // float s = sin((pos.x - pos.y) * pow(scale, 1) / 10 + time);
    return tlc * tls + brc * brs + blc * bls + trc * trs;

}

void main() {
    float x = qt_TexCoord0.x * ubuf.gwidth;
    float y = qt_TexCoord0.y * ubuf.gheight;
    float t = ubuf.t;

    float[10] bars = float[](ubuf.bar0, ubuf.bar1, ubuf.bar2, ubuf.bar3, ubuf.bar4, ubuf.bar5, ubuf.bar6, ubuf.bar7, ubuf.bar8, ubuf.bar9);

    float angle = t;

    fragColor = texture(source, qt_TexCoord0) * ubuf.qt_Opacity;

    float grayColor = grayscale(texture(source, qt_TexCoord0), 1);
    // vec4 tintColor = mix(ubuf.colorBg, ubuf.colorA, grayColor * smoothstep(0, 1, dots(vec2(x, y), pow(grayColor, 1) / 200, t)));

    float ratio = (1 - voronoi2d(vec2(x, sin(y)) * 0.1 * grayColor + t / 2));
    float cava_avg = (bars[0] + bars[1] + bars[2] + bars[3] + bars[4] + bars[5] + bars[6] + bars[7] + bars[8] + bars[9]) / 10;
    // float ratio = (1 - voronoi2d(vec2(x, sin(y)) * 0.008 * grayColor + t));

    //float ratio = (1 - voronoi2d(vec2(x * (1 - grayColor), y * (1 - grayColor)) * 0.15 * grayColor + t));

    vec4 c1 = mix(ubuf.colorBg, ubuf.colorFg, grayColor * (0.5 + smoothstep(0.5, 1, ratio)));
    // vec4 c2 = mix(ubuf.colorBg, ubuf.colorC, grayColor * (0.5 + smoothstep(0, 0.5, ratio)));
// (1 - voronoi2d(vec2(x, y) * 0.001 * grayColor + t))

    vec4 voronoi = mix(c1, vec4(0, 0, 0, 1), smoothstep(0.9, 1, noise(vec2(x, y), 1, t)));

    // vec4 voronoi = c1;
    fragColor = voronoi * ubuf.qt_Opacity;

    // vec4 particleColor = mix(ubuf.colorBg, ubuf.colorA, grayColor * smoothstep(0.9, 1, noise(vec2(x, y), pow(grayColor, 0.5) + tan(t), t)));
    // tintColor = mix(tintColor, ubuf.colorC, grayColor * (smoothstep(1, 0, noise(vec2(x, y), grayColor, t))));

    // vec4 colors[3] = vec4[](ubuf.colorA, ubuf.colorB, ubuf.colorC);

    // fragColor = mix(fragColor, ubuf.colorA, grayColor * smoothstep(0.999, 1, noise(vec2(x, y), 10, t))) * ubuf.qt_Opacity;

}