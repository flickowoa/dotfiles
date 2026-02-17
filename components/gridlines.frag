#version 300 es
#define M_PI (3.14159265358979323846264338327950288)

precision mediump float;
in vec2 v_texcoord;
uniform sampler2D tex;
out vec4 fragColor;
float width;
float limbShading = 0.45;
float gridSpacing = 10.0;
float gridShading = 0.97;

void main() {
	vec4 pixColor = texture2D(tex, v_texcoord);
	vec2 size = vec2(textureSize(tex, 0));
	width = size[0];

	pixColor[0] *= limbShading*sin(M_PI*gl_FragCoord.x / width) + (1.0 - limbShading);
	pixColor[1] *= limbShading*sin(M_PI*gl_FragCoord.x / width) + (1.0 - limbShading);
	pixColor[2] *= limbShading*sin(M_PI*gl_FragCoord.x / width) + (1.0 - limbShading);

	if (int(mod(gl_FragCoord.x, gridSpacing)) == 0 ||
        int(mod(gl_FragCoord.y, gridSpacing)) == 0) {
			pixColor[0] *= gridShading;
			pixColor[1] *= gridShading;
			pixColor[2] *= gridShading;
    }
	
	fragColor = pixColor;
}