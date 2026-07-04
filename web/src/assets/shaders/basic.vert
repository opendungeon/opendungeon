attribute vec3 a_vertex_position;
attribute vec2 a_texture_coordinate;
attribute mat4 a_model;
attribute vec4 a_color;

uniform mat4 u_view;
uniform mat4 u_projection;

varying vec4 v_color
varying vec2 v_tex_coord;

void main() {
  gl_Position = u_projection * u_view * a_model * vec4(a_vertex_position.xyz, 1.0);
  v_color = a_color;
  v_tex_coord = a_texture_coordinate;
}
