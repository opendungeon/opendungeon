precision mediump float;

const float ALPHA_CUTOFF = 0.01;

uniform sampler2D u_texture;

varying vec4 v_color;
varying vec2 v_tex_coord;

void main() {
  vec4 color = texture2D(u_texture, v_tex_coord) * v_color;
  if (color.a < ALPHA_CUTOFF) {
    discard;
  }

  gl_FragColor = color;
}
