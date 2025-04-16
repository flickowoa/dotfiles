#version 440

layout(location = 0) in vec2 qt_TexCoord0;
layout(location = 0) out vec4 fragColor;
layout(binding = 1) uniform sampler2D source;
layout(std140, binding = 0) uniform buf {
    mat4 qt_Matrix;
    float qt_Opacity;

    uniform int gheight;
    uniform int gwidth;

    uniform vec4 colorBg;
    uniform vec4 colorFg;
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
float noise(vec2 pos, float scale, float time) {
    float c = sin(pos.x * pos.y * pow(scale, 20) / 400 + time);
    return c;
}
void main() {
    float x = qt_TexCoord0.x * ubuf.gwidth;
    float y = qt_TexCoord0.y * ubuf.gheight;
    float t = ubuf.t;
    fragColor = texture(source, qt_TexCoord0) * ubuf.qt_Opacity;
    float grayColor = grayscale(texture(source, qt_TexCoord0), 1);
    float ratio = (1 - voronoi2d(vec2(x, sin(y)) * 0.1 * grayColor + t / 2));
    vec4 c1 = mix(ubuf.colorBg, ubuf.colorFg, grayColor * (0.5 + smoothstep(0.5, 1, ratio)));
    vec4 voronoi = mix(c1, vec4(0, 0, 0, 1), smoothstep(0, 1, noise(vec2(x, y), 1, t)));
    fragColor = voronoi * ubuf.qt_Opacity;
}