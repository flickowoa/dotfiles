#version 300 es

precision mediump float;
in vec2 v_texcoord;
uniform sampler2D tex;
out vec4 fragColor;

void main() {
	vec4 pixColor = texture2D(tex, v_texcoord);
	
	if (int(mod(gl_FragCoord.x, 10.0)) == 0 ||
        int(mod(gl_FragCoord.y, 10.0)) == 0) {
			pixColor[0] *= 0.97;
			pixColor[1] *= 0.97;
			pixColor[2] *= 0.97;
    }
	fragColor = pixColor;
}