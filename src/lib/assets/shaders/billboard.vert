attribute vec3 a_vertex_position;
attribute vec2 a_texture_coordinate;
attribute mat4 a_model;
attribute vec4 a_color;

uniform mat4 u_view;
uniform mat4 u_projection;
uniform vec3 u_camera_right;
uniform vec3 u_camera_up;

varying vec4 v_color;
varying vec2 v_tex_coord;

void main() {
  vec3 center = vec3(a_model[3]);
  vec2 scale = vec2(length(a_model[0].xyz), length(a_model[1].xyz));
  vec3 world_position = center
    + u_camera_right * a_vertex_position.x * scale.x
    + u_camera_up * a_vertex_position.y * scale.y;

  gl_Position = u_projection * u_view * vec4(world_position, 1.0);
  v_color = a_color;
  v_tex_coord = a_texture_coordinate;
}
