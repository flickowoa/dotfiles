#version 440

layout(location=0) in vec2 qt_TexCoord0;

layout(location=0) out vec4 fragColor;

layout(binding=1) uniform sampler2D source;

layout(std140, binding=0) uniform buf {
    mat4 qt_Matrix;
    float qt_Opacity;
    uniform int gheight;
    uniform int gwidth;
    uniform vec2 pointA;
    uniform vec2 pointB;
    uniform vec2 pointC;
    uniform vec2 pointD;
    uniform vec2 pointE;
} ubuf;

// layout(binding=1) uniform sampler2D source;

void main() {
    // make circle at pointA

    float x = qt_TexCoord0.x * ubuf.gwidth;
    float y = qt_TexCoord0.y * ubuf.gheight;

    vec2 xy = vec2(x, y);
    
    float influence = 0.0;
    // float radius = 100;
    float radiusA = 30;
    float radiusB = 25;
    float radiusC = 0;
    float radiusD = 0;
    float radiusE = 0;

    float A = (x - ubuf.pointA.x) * (x - ubuf.pointA.x) + (y - ubuf.pointA.y) * (y - ubuf.pointA.y);
    float B = (x - ubuf.pointB.x) * (x - ubuf.pointB.x) + (y - ubuf.pointB.y) * (y - ubuf.pointB.y);
    float C = (x - ubuf.pointC.x) * (x - ubuf.pointC.x) + (y - ubuf.pointC.y) * (y - ubuf.pointC.y);
    float D = (x - ubuf.pointD.x) * (x - ubuf.pointD.x) + (y - ubuf.pointD.y) * (y - ubuf.pointD.y);
    float E = (x - ubuf.pointE.x) * (x - ubuf.pointE.x) + (y - ubuf.pointE.y) * (y - ubuf.pointE.y);

    float influenceA = radiusA*radiusA/A;
    float influenceB = radiusB*radiusB/B;
    float influenceC = radiusC*radiusC/C;
    float influenceD = radiusD*radiusD/D;
    float influenceE = radiusE*radiusE/E;

    vec4 colorA = vec4(0.95, 0.58, 1.0, 1.0);
    vec4 colorB = vec4(0.4, 0.81, 1.0, 1.0);
    vec4 colorC = vec4(0.21, 0.55, 0.55, 1.0);
    vec4 colorD = vec4(0.0, 1.0, 0.0, 1.0);
    vec4 colorE = vec4(0.0, 0.0, 0.0, 1.0);
    

    influence = influenceA + influenceB + influenceC + influenceD + influenceE;

    if ( influence > 1.5) {
        //#88D6BA 
        vec4 color1 = vec4(0.53, 0.84, 0.73, 1.0);
        //#274B5D
        vec4 color2 = vec4(0.15, 0.29, 0.36, 1.0);

        float ratio = influenceA;
        // fragColor = mix(color1,color2,ratio) * ubuf.qt_Opacity;
        // return;
    } else if (influence > 0.7 && influence < 1) {
        //#C3E8FE
        vec4 color1 = vec4(0.76, 0.91, 0.99, 1.0);
        //#88D6BA
        vec4 color2 = vec4(0.53, 0.84, 0.73, 1.0);

        float ratio = influenceA / influence;
        // fragColor = color1 * ubuf.qt_Opacity;
        fragColor = mix(color1,color2,ratio) * ubuf.qt_Opacity;
        return;
    }

    fragColor = texture(source, qt_TexCoord0) * ubuf.qt_Opacity;

    // if (distance(xy, ubuf.pointB) < 100) {
    //     fragColor = vec4(0.0, 1.0, 0.0, 1.0) * ubuf.qt_Opacity;
    // } else if (distance(xy, ubuf.pointA) < 100) {
    //     fragColor = vec4(0.21, 0.55, 0.55, 1.0) * ubuf.qt_Opacity;
    // } else {
    //     fragColor = vec4(0.0, 0.0, 0.0, 1.0) * ubuf.qt_Opacity;
    // }
}