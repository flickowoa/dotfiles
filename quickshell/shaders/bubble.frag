#version 440

layout(location = 0) in vec2 qt_TexCoord0;

layout(location = 0) out vec4 fragColor;

layout(binding = 1) uniform sampler2D source;

layout(std140, binding = 0) uniform buf {
    mat4 qt_Matrix;
    float qt_Opacity;

    uniform int gheight;
    uniform int gwidth;

    uniform float xshift;
    uniform float t;
    uniform vec4 colorA;
    uniform vec4 colorB;
    uniform vec4 colorC;

    uniform float strength;
    uniform float cava;
    // uniform float seed;
} ubuf;

float random(float seed, float t) {
    return fract(sin(dot(vec2(seed, t), vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    float x = qt_TexCoord0.x * ubuf.gwidth;
    float y = qt_TexCoord0.y * ubuf.gheight;
    float t = ubuf.t;

    float gwidth = float(ubuf.gwidth);
    float gheight = float(ubuf.gheight);

    float seeds[200] = float[](0.24, 0.13424, 0.6457, 0.234, 0.8754, 0.1234, 0.876, 0.247, 0.4635, 0.465, 0.24, 0.13424, 0.6457, 0.234, 0.8754, 0.1234, 0.876, 0.247, 0.4635, 0.465, 0.24, 0.13424, 0.6457, 0.234, 0.8754, 0.1234, 0.876, 0.247, 0.4635, 0.465, 0.24, 0.13424, 0.6457, 0.234, 0.8754, 0.1234, 0.876, 0.247, 0.4635, 0.465, 0.24, 0.13424, 0.6457, 0.234, 0.8754, 0.1234, 0.876, 0.247, 0.4635, 0.465, 0.24, 0.13424, 0.6457, 0.234, 0.8754, 0.1234, 0.876, 0.247, 0.4635, 0.465, 0.24, 0.13424, 0.6457, 0.234, 0.8754, 0.1234, 0.876, 0.247, 0.4635, 0.465, 0.24, 0.13424, 0.6457, 0.234, 0.8754, 0.1234, 0.876, 0.247, 0.4635, 0.465, 0.24, 0.13424, 0.6457, 0.234, 0.8754, 0.1234, 0.876, 0.247, 0.4635, 0.465, 0.24, 0.13424, 0.6457, 0.234, 0.8754, 0.1234, 0.876, 0.247, 0.4635, 0.465, 0.24, 0.13424, 0.6457, 0.234, 0.8754, 0.1234, 0.876, 0.247, 0.4635, 0.465, 0.24, 0.13424, 0.6457, 0.234, 0.8754, 0.1234, 0.876, 0.247, 0.4635, 0.465, 0.24, 0.13424, 0.6457, 0.234, 0.8754, 0.1234, 0.876, 0.247, 0.4635, 0.465, 0.24, 0.13424, 0.6457, 0.234, 0.8754, 0.1234, 0.876, 0.247, 0.4635, 0.465, 0.24, 0.13424, 0.6457, 0.234, 0.8754, 0.1234, 0.876, 0.247, 0.4635, 0.465, 0.24, 0.13424, 0.6457, 0.234, 0.8754, 0.1234, 0.876, 0.247, 0.4635, 0.465, 0.24, 0.13424, 0.6457, 0.234, 0.8754, 0.1234, 0.876, 0.247, 0.4635, 0.465, 0.24, 0.13424, 0.6457, 0.234, 0.8754, 0.1234, 0.876, 0.247, 0.4635, 0.465, 0.24, 0.13424, 0.6457, 0.234, 0.8754, 0.1234, 0.876, 0.247, 0.4635, 0.465, 0.24, 0.13424, 0.6457, 0.234, 0.8754, 0.1234, 0.876, 0.247, 0.4635, 0.465);
    float influence[200];
    vec2 particles[200];

    fragColor = texture(source, qt_TexCoord0) * ubuf.qt_Opacity;

    float radius[200];

    vec4 colors[3] = vec4[](ubuf.colorA, ubuf.colorB, ubuf.colorC);

    for(int i = 0; i < 200; i++) {
        radius[i] = 5 * random(seeds[i], 0.2);

        float xshift = ubuf.xshift;

        float loopedY = cos(seeds[i]) * (ubuf.gheight) * (1 - t * random(seeds[i], 0.2));

        float loopedX = sin(seeds[i]) * ubuf.gwidth - xshift / (radius[i]);

        particles[i] = vec2(mod(loopedX, gwidth + 10), mod(loopedY, gheight + 50) - 25);

        // radius[i] += 1 * random(seeds[i], t);

        // float D = distance(vec2(x, y), particles[i]);

        // influence[i] = D;

        // totalInfluence += influence[i];

        float d = distance(vec2(x, y), particles[i]);

        vec4 color = colors[int(random(seeds[i], 0.4) * 2)];

        float radius = radius[i];

        radius *= 1 + (ubuf.cava * (int(random(seeds[i], 0.4) + 0.5) - 0.5));

        if(d / 2 < radius) {
            fragColor = mix(fragColor, color, 0 + d / radius / ubuf.strength);
        }
    }

    // for(int i = 0; i < 5; i++) {
    //     float ratio = influence[i] / totalInfluence;
    //     ratio *= radius / strength;
    //     fragColor = mix(fragColor, vec4(0.0, 0.0, 0.0, 1.0), ratio / 1.3);
    // }

    // float x1 = sin(seed * t * t) * ubuf.gwidth + ubuf.xshift;
    // float y1 = cos(seed) * ubuf.gheight * (1 - t);

    // if(distance(vec2(x, y), vec2(x1, y1)) < 5) {
    //     fragColor = vec4(1.0, 0.0, 0.0, 1.0);
    // }

}