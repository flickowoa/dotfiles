#version 440

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

    uniform float pointA_x;
    uniform float pointA_y;
    uniform float pointB_x;
    uniform float pointB_y;
    uniform float pointC_x;
    uniform float pointC_y;

    uniform float radiusA;
    uniform float radiusB;
    uniform float radiusC;

    uniform vec4 colorBg;
    uniform vec4 colorFg;
    uniform vec4 colorA;
    uniform vec4 colorB;
    uniform vec4 colorC;

    uniform float t;
} ubuf;

float random() {
    return fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

float grayscale(vec4 color) {
    float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    return gray;
}

float diff(float a, float b) {
    return abs(a - b);
}

void main() {
    float x = qt_TexCoord0.x * ubuf.gwidth;
    float y = qt_TexCoord0.y * ubuf.gheight;

    fragColor = texture(source, qt_TexCoord0) * ubuf.qt_Opacity;

    float grayColor = grayscale(texture(source, qt_TexCoord0));

    float distanceA = distance(vec2(x, y), vec2(ubuf.pointA_x, ubuf.pointA_y));
    float distanceB = distance(vec2(x, y), vec2(ubuf.pointB_x, ubuf.pointB_y));
    float distanceC = distance(vec2(x, y), vec2(ubuf.pointC_x, ubuf.pointC_y));

    float minRadius = 10;

    float radiusA = max(ubuf.radiusA, minRadius);
    float radiusB = max(ubuf.radiusB, minRadius);
    float radiusC = max(ubuf.radiusC, minRadius);

    vec4 tintColor = mix(ubuf.colorBg, ubuf.colorA, clamp(grayColor * pow(radiusA, 1) / pow(distanceA, 0.4), 0, 1000));
    tintColor = mix(tintColor, ubuf.colorB, clamp(grayColor * pow(radiusB, 1) / pow(distanceB, 0.4), 0, 1000));
    tintColor = mix(tintColor, ubuf.colorC, clamp(grayColor * pow(radiusC, 1) / pow(distanceC, 0.4), 0, 1000));

    fragColor = tintColor * ubuf.qt_Opacity;

    // if(distance(vec2(x, y), vec2(ubuf.pointA_x, ubuf.pointA_y)) < ubuf.radiusA) {
    //     fragColor = ubuf.colorC * ubuf.qt_Opacity;
    // }

    // if(distance(vec2(x, y), vec2(ubuf.pointB_x, ubuf.pointB_y)) < ubuf.radiusB) {
    //     fragColor = ubuf.colorC * ubuf.qt_Opacity;
    // }

    // if(distance(vec2(x, y), vec2(ubuf.pointC_x, ubuf.pointC_y)) < ubuf.radiusC) {
    //     fragColor = ubuf.colorC * ubuf.qt_Opacity;
    // }
}