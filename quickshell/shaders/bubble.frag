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

    uniform float invert;
    uniform int heightOverflow;
} ubuf;

float squareDistance(float x1, float y1, float x2, float y2) {
    float dx = x1 - x2;
    float dy = y1 - y2;
    return dx * dx + dy * dy;
}

void main() {
    float x = qt_TexCoord0.x * ubuf.gwidth;
    float y = qt_TexCoord0.y * ubuf.gheight;

    float influenceBg = 0.0;

    // influence wraps around edges

    float A = squareDistance(x, y, ubuf.pointA_x, ubuf.pointA_y);
    float B = squareDistance(x, y, ubuf.pointB_x, ubuf.pointB_y);
    float C = squareDistance(x, y, ubuf.pointC_x, ubuf.pointC_y);

    // wrap around

    float wrappedTopA = squareDistance(x, y, ubuf.pointA_x, ubuf.pointA_y + ubuf.gheight);
    float wrappedTopB = squareDistance(x, y, ubuf.pointB_x, ubuf.pointB_y + ubuf.gheight);
    float wrappedTopC = squareDistance(x, y, ubuf.pointC_x, ubuf.pointC_y + ubuf.gheight);

    float wrappedBottomA = squareDistance(x, y, ubuf.pointA_x, ubuf.pointA_y - ubuf.gheight);
    float wrappedBottomB = squareDistance(x, y, ubuf.pointB_x, ubuf.pointB_y - ubuf.gheight);
    float wrappedBottomC = squareDistance(x, y, ubuf.pointC_x, ubuf.pointC_y - ubuf.gheight);

    // A *= squareDistance(x, y, ubuf.pointA_x + ubuf.gwidth, ubuf.pointA_y);
    // B *= squareDistance(x, y, ubuf.pointB_x + ubuf.gwidth, ubuf.pointB_y);
    // C *= squareDistance(x, y, ubuf.pointC_x + ubuf.gwidth, ubuf.pointC_y);

    // A *= squareDistance(x, y, ubuf.pointA_x - ubuf.gwidth, ubuf.pointA_y);
    // B *= squareDistance(x, y, ubuf.pointB_x - ubuf.gwidth, ubuf.pointB_y);
    // C *= squareDistance(x, y, ubuf.pointC_x - ubuf.gwidth, ubuf.pointC_y);

    // A *= squareDistance(x, y, ubuf.pointA_x, ubuf.pointA_y + ubuf.gheight);
    // B *= squareDistance(x, y, ubuf.pointB_x, ubuf.pointB_y + ubuf.gheight);
    // C *= squareDistance(x, y, ubuf.pointC_x, ubuf.pointC_y + ubuf.gheight);

    // A *= squareDistance(x, y, ubuf.pointA_x, ubuf.pointA_y - ubuf.gheight);
    // B *= squareDistance(x, y, ubuf.pointB_x, ubuf.pointB_y - ubuf.gheight);
    // C *= squareDistance(x, y, ubuf.pointC_x, ubuf.pointC_y - ubuf.gheight);

    // float influenceA = ubuf.radiusA * ubuf.radiusA / A;
    // float influenceB = ubuf.radiusB * ubuf.radiusB / B;
    // float influenceC = ubuf.radiusC * ubuf.radiusC / C;

    float influenceA = ubuf.radiusA * ubuf.radiusA / A;
    float influenceB = ubuf.radiusB * ubuf.radiusB / B;
    float influenceC = ubuf.radiusC * ubuf.radiusC / C;

    float influenceTopA = ubuf.radiusA * ubuf.radiusA / wrappedTopA;
    float influenceTopB = ubuf.radiusB * ubuf.radiusB / wrappedTopB;
    float influenceTopC = ubuf.radiusC * ubuf.radiusC / wrappedTopC;

    float influenceBottomA = ubuf.radiusA * ubuf.radiusA / wrappedBottomA;
    float influenceBottomB = ubuf.radiusB * ubuf.radiusB / wrappedBottomB;
    float influenceBottomC = ubuf.radiusC * ubuf.radiusC / wrappedBottomC;

    // vec4 colorA = vec4(0.95, 0.59, 1.0, 1.0);
    // vec4 colorB = vec4(0.95, 0.42, 1.0, 1.0);
    // vec4 colorC = vec4(1.0, 0.58, 0.78, 1.0);

    influenceBg = influenceA + influenceB + influenceC + influenceTopA + influenceTopB + influenceTopC + influenceBottomA + influenceBottomB + influenceBottomC;

    fragColor = texture(source, qt_TexCoord0) * ubuf.qt_Opacity;

    float ratioA = influenceA * (ubuf.radiusA / ubuf.strength) / influenceBg;
    float ratioB = influenceB * (ubuf.radiusB / ubuf.strength) / influenceBg;
    float ratioC = influenceC * (ubuf.radiusC / ubuf.strength) / influenceBg;
    float ratioTopA = influenceTopA * (ubuf.radiusA / ubuf.strength) / influenceBg;
    float ratioTopB = influenceTopB * (ubuf.radiusB / ubuf.strength) / influenceBg;
    float ratioTopC = influenceTopC * (ubuf.radiusC / ubuf.strength) / influenceBg;
    float ratioBottomA = influenceBottomA * (ubuf.radiusA / ubuf.strength) / influenceBg;
    float ratioBottomB = influenceBottomB * (ubuf.radiusB / ubuf.strength) / influenceBg;
    float ratioBottomC = influenceBottomC * (ubuf.radiusC / ubuf.strength) / influenceBg;

    ratioA = pow(ratioA, ubuf.invert);
    ratioB = pow(ratioB, ubuf.invert);
    ratioC = pow(ratioC, ubuf.invert);
    ratioTopA = pow(ratioTopA, ubuf.invert);
    ratioTopB = pow(ratioTopB, ubuf.invert);
    ratioTopC = pow(ratioTopC, ubuf.invert);
    ratioBottomA = pow(ratioBottomA, ubuf.invert);
    ratioBottomB = pow(ratioBottomB, ubuf.invert);
    ratioBottomC = pow(ratioBottomC, ubuf.invert);

    if(influenceA > ubuf.treshold) {
        fragColor = mix(fragColor, ubuf.colorA, ratioA) * ubuf.qt_Opacity;
    }
    if(influenceB > ubuf.treshold) {
        fragColor = mix(fragColor, ubuf.colorB, ratioB) * ubuf.qt_Opacity;
    }
    if(influenceC > ubuf.treshold) {
        fragColor = mix(fragColor, ubuf.colorC, ratioC) * ubuf.qt_Opacity;
    }
    if(influenceTopA > ubuf.treshold) {
        fragColor = mix(fragColor, ubuf.colorA, ratioTopA) * ubuf.qt_Opacity;
    }
    if(influenceTopB > ubuf.treshold) {
        fragColor = mix(fragColor, ubuf.colorB, ratioTopB) * ubuf.qt_Opacity;
    }
    if(influenceTopC > ubuf.treshold) {
        fragColor = mix(fragColor, ubuf.colorC, ratioTopC) * ubuf.qt_Opacity;
    }
    if(influenceBottomA > ubuf.treshold) {
        fragColor = mix(fragColor, ubuf.colorA, ratioBottomA) * ubuf.qt_Opacity;
    }
    if(influenceBottomB > ubuf.treshold) {
        fragColor = mix(fragColor, ubuf.colorB, ratioBottomB) * ubuf.qt_Opacity;
    }
    if(influenceBottomC > ubuf.treshold) {
        fragColor = mix(fragColor, ubuf.colorC, ratioBottomC) * ubuf.qt_Opacity;
    }

    // if(distance(vec2(x, y), vec2(ubuf.pointA_x, ubuf.pointA_y)) < 3) {
    //     fragColor = vec4(0.0, 0.0, 0.0, 1.0) * ubuf.qt_Opacity;
    // }

    // if(distance(vec2(x, y), vec2(ubuf.pointB_x, ubuf.pointB_y)) < 3) {
    //     fragColor = vec4(0.0, 0.0, 0.0, 1.0) * ubuf.qt_Opacity;
    // }

    // if(distance(vec2(x, y), vec2(ubuf.pointC_x, ubuf.pointC_y)) < 3) {
    //     fragColor = vec4(0.0, 0.0, 0.0, 1.0) * ubuf.qt_Opacity;
    // }
}