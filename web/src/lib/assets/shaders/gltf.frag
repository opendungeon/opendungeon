precision mediump float;

uniform bool u_has_texture;
uniform sampler2D u_texture;
uniform int u_texture_coord;
uniform vec4 u_base_color;
uniform float u_alpha_cutoff; // <= 0.0 disables cutoff (OPAQUE / BLEND)

varying vec3 v_normal;
varying vec2 v_texture_coord_0;
varying vec2 v_texture_coord_1;

void main() {
  vec2 texture_coord = u_texture_coord == 0 ? v_texture_coord_0 : v_texture_coord_1;
  vec4 linear = u_has_texture ? texture2D(u_texture, texture_coord) * u_base_color : u_base_color;
  if (u_alpha_cutoff > 0.0 && linear.a < u_alpha_cutoff) {
    discard;
  }
  gl_FragColor = vec4(pow(linear.xyz, vec3(1.0 / 2.2)), linear.a);
}
