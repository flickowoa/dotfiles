#version 440

layout(location = 0) in vec2 qt_TexCoord0;

layout(location = 0) out vec4 fragColor;

layout(binding = 1) uniform sampler2D source;
layout(binding = 2) uniform sampler2D drawon;

layout(std140, binding = 0) uniform buf {
    mat4 qt_Matrix;
    float qt_Opacity;

} ubuf;

// layout(binding=1) uniform sampler2D source;

void main() {
    // glow
    float x = qt_TexCoord0.x;
    float y = qt_TexCoord0.y;

    vec4 color = texture(drawon, qt_TexCoord0);

    // vec4 sum = vec4(0.0);
    // sum += texture(source, vec2(x - 0.01, y - 0.01));
    // sum += texture(source, vec2(x, y - 0.01));
    // sum += texture(source, vec2(x + 0.01, y - 0.01));
    // sum += texture(source, vec2(x - 0.01, y));
    // sum += texture(source, vec2(x, y));
    // sum += texture(source, vec2(x + 0.01, y));
    // sum += texture(source, vec2(x - 0.01, y + 0.01));
    // sum += texture(source, vec2(x, y + 0.01));
    // sum += texture(source, vec2(x + 0.01, y + 0.01));

    // sum /= 9.0;

    // fragColor = color * 0.5 + sum * 0.5;
    // fragColor = vec4(0, 0, 0, 1);
    fragColor = color;
}