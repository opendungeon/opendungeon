attribute vec3 a_vertex_position;
attribute mat4 a_model;
attribute vec4 a_color;

uniform mat4 u_view;
uniform mat4 u_projection;

varying vec4 v_color;
varying vec2 v_world_position;

void main() {
  vec4 world_position = a_model * vec4(a_vertex_position.xyz, 1.0);
  gl_Position = u_projection * u_view * world_position;
  v_world_position = world_position.xy;
  v_color = a_color;
}
