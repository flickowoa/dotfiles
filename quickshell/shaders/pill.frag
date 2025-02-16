#version 440

layout(location = 0) in vec2 qt_TexCoord0;

layout(location = 0) out vec4 fragColor;

layout(binding = 1) uniform sampler2D source;

layout(std140, binding = 0) uniform buf {
    float qt_Opacity;

    uniform int gheight;
    uniform int gwidth;

    uniform float treshold;

    uniform float pointA_x;
    uniform float pointA_y;
    uniform float pointB_x;
    uniform float pointB_y;
    uniform float pointC_x;
    uniform float pointC_y;

    uniform float radiusA;
    uniform float radiusB;
    uniform float radiusC;
} ubuf;

void main() {
    float x = qt_TexCoord0.x * ubuf.gwidth;
    float y = qt_TexCoord0.y * ubuf.gheight;

    float influenceBg = 0.0;
    float influenceFg = 0.0;

    float A = (x - ubuf.pointA_x) * (x - ubuf.pointA_x) + (y - ubuf.pointA_y) * (y - ubuf.pointA_y);
    float B = (x - ubuf.pointB_x) * (x - ubuf.pointB_x) + (y - ubuf.pointB_y) * (y - ubuf.pointB_y);
    float C = (x - ubuf.pointC_x) * (x - ubuf.pointC_x) + (y - ubuf.pointC_y) * (y - ubuf.pointC_y);

    float influenceA = ubuf.radiusA * ubuf.radiusA / A;
    float influenceB = ubuf.radiusB * ubuf.radiusB / B;
    float influenceC = ubuf.radiusC * ubuf.radiusC / C;

    vec4 colorA = vec4(0.95, 0.59, 1.0, 1.0);
    vec4 colorB = vec4(0.95, 0.42, 1.0, 1.0);
    vec4 colorC = vec4(1.0, 0.58, 0.78, 1.0);
    vec4 colorD = vec4(1.0, 0.47, 0.47, 1.0);
    vec4 colorE = vec4(0.49, 0.42, 1.0, 1.0);
    vec4 colorF = vec4(1.0, 0.94, 0.46, 1.0);

    influenceBg = influenceA + influenceB + influenceC;

    fragColor = texture(source, qt_TexCoord0) * ubuf.qt_Opacity;

    if(influenceA > ubuf.treshold) {
        fragColor = mix(fragColor, colorA, influenceA * (ubuf.radiusA / 2) / influenceBg) * ubuf.qt_Opacity;
    }
    if(influenceB > ubuf.treshold) {
        fragColor = mix(fragColor, colorB, influenceB * (ubuf.radiusB / 2) / influenceBg) * ubuf.qt_Opacity;
    }
    if(influenceC > ubuf.treshold) {
        fragColor = mix(fragColor, colorC, influenceC * (ubuf.radiusC / 2) / influenceBg) * ubuf.qt_Opacity;
    }
}