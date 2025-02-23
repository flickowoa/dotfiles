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

    uniform vec4 colorA;
    uniform vec4 colorB;
    uniform vec4 colorC;

    uniform int invert;
} ubuf;

float wrappedDistance(float x1, float y1, float x2, float y2, float width, float height) {
    float dx = abs(x1 - x2);
    float dy = abs(y1 - y2);
    if(dx > width / 2) {
        dx = width - dx;
    }
    if(dy > height / 2) {
        dy = height - dy;
    }
    return sqrt(dx * dx + dy * dy);
}

float squareDistance(float x1, float y1, float x2, float y2) {
    float dx = x1 - x2;
    float dy = y1 - y2;
    return dx * dx + dy * dy;
}

float random() {
    return fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    float x = qt_TexCoord0.x * ubuf.gwidth;
    float y = qt_TexCoord0.y * ubuf.gheight;

    float influenceBg = 0.0;

    // float A = squareDistance(x, y, ubuf.pointA_x, ubuf.pointA_y);
    // float B = squareDistance(x, y, ubuf.pointB_x, ubuf.pointB_y);
    // float C = squareDistance(x, y, ubuf.pointC_x, ubuf.pointC_y);

    // A *= squareDistance(x, y, ubuf.pointA_x + ubuf.gwidth, ubuf.pointA_y);
    // B *= squareDistance(x, y, ubuf.pointB_x + ubuf.gwidth, ubuf.pointB_y);
    // C *= squareDistance(x, y, ubuf.pointC_x + ubuf.gwidth, ubuf.pointC_y);

    // A *= squareDistance(x, y, ubuf.pointA_x - ubuf.gwidth, ubuf.pointA_y);
    // B *= squareDistance(x, y, ubuf.pointB_x - ubuf.gwidth, ubuf.pointB_y);
    // C *= squareDistance(x, y, ubuf.pointC_x - ubuf.gwidth, ubuf.pointC_y);

    float A = abs(x - ubuf.pointA_x);
    float B = abs(x - ubuf.pointB_x);
    float C = abs(x - ubuf.pointC_x);

    // A *= abs(x - ubuf.pointA_x + ubuf.gwidth);
    // B *= abs(y - ubuf.pointA_y + ubuf.gwidth);
    // C *= abs(x - ubuf.pointB_x + ubuf.gwidth);

    // A *= abs(x - ubuf.pointA_x - ubuf.gwidth);
    // B *= abs(y - ubuf.pointA_y - ubuf.gwidth);
    // C *= abs(x - ubuf.pointB_x - ubuf.gwidth);

    float influenceA = A * pow(ubuf.radiusA, 2);
    float influenceB = B * pow(ubuf.radiusB, 2);
    float influenceC = C * pow(ubuf.radiusC, 2);

    influenceBg = influenceA + influenceB + influenceC;

    fragColor = texture(source, qt_TexCoord0) * ubuf.qt_Opacity;

    float ratioA = (influenceBg / influenceA) * (1 - y / ubuf.gheight);
    float ratioB = (influenceBg / influenceB) * (1 - y / ubuf.gheight);
    float ratioC = (influenceBg / influenceC) * (1 - y / ubuf.gheight);

    fragColor = mix(fragColor, ubuf.colorA, ratioA / 200) * ubuf.qt_Opacity;
    fragColor = mix(fragColor, ubuf.colorB, ratioB / 200) * ubuf.qt_Opacity;
    fragColor = mix(fragColor, ubuf.colorC, ratioC / 200) * ubuf.qt_Opacity;

    // if(influenceA) {

    // }
    // if(influenceB > 0.5) {
    //     fragColor = mix(fragColor, ubuf.colorB, ratioB) * ubuf.qt_Opacity;
    // }
    // if(influenceC > 0.5) {
    //     fragColor = mix(fragColor, ubuf.colorC, ratioC) * ubuf.qt_Opacity;
    // }

    // if(distance(vec2(x, y), vec2(ubuf.pointA_x, ubuf.pointA_y)) < 50) {
    //     fragColor = vec4(0.0, 0.0, 0.0, 1.0) * ubuf.qt_Opacity;
    // }

    // if(distance(vec2(x, y), vec2(ubuf.pointB_x, ubuf.pointB_y)) < 3) {
    //     fragColor = vec4(0.0, 0.0, 0.0, 1.0) * ubuf.qt_Opacity;
    // }

    // if(distance(vec2(x, y), vec2(ubuf.pointC_x, ubuf.pointC_y)) < 3) {
    //     fragColor = vec4(0.0, 0.0, 0.0, 1.0) * ubuf.qt_Opacity;
    // }
}