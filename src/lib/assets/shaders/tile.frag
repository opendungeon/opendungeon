precision mediump float;

uniform sampler2D u_texture;

varying vec4 v_color;
varying vec2 v_world_position;

void main() {
  vec2 uv = fract(v_world_position * 0.5) + 0.25;
  gl_FragColor = texture2D(u_texture, uv) * v_color;
}
