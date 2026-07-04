precision mediump float;

const float SQRT_3_OVER_2 = 0.86602540378; // cos(30deg)
const float SQRT_3_OVER_4 = 0.43301270189; // cos(30deg)
const float SIN_30 = 0.5;

uniform sampler2D u_texture;
uniform bool u_enable_border;
uniform float u_border_thickness;

varying vec4 v_color;
varying vec4 v_border_color;
varying vec2 v_local_coord;
varying vec2 v_tex_coord;

void main() {
  vec2 p = abs(v_local_coord);

  float distance_to_slanted_edge = (p.y * SQRT_3_OVER_2) + (p.x * SIN_30);
  float distance_to_flat_edge = p.x;
  float distance = max(distance_to_slanted_edge, distance_to_flat_edge);

  float inner_edge = SQRT_3_OVER_4 - u_border_thickness;

  if (!u_enable_border || distance < inner_edge) {
    gl_FragColor = texture2D(u_texture, v_tex_coord) * v_color;
  } else {
    gl_FragColor = v_border_color;
  }
}
