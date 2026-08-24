attribute vec3 a_position;
attribute vec3 a_normal;
attribute vec4 a_tangent;
attribute vec2 a_texture_coord_0;
attribute vec2 a_texture_coord_1;
attribute vec4 a_joint_0;
attribute vec4 a_weight_0;
attribute mat4 a_root_transform;

uniform mat4 u_node_transform;
uniform mat4 u_view;
uniform mat4 u_projection;
uniform mat4 u_joint_matrix[12];

varying vec3 v_normal;
varying vec2 v_texture_coord_0;
varying vec2 v_texture_coord_1;

void main() {
  v_normal = a_normal;
  v_texture_coord_0 = a_texture_coord_0;
  v_texture_coord_1 = a_texture_coord_1;

  mat4 skin_matrix = a_weight_0.x * u_joint_matrix[int(a_joint_0.x)]
    + a_weight_0.y * u_joint_matrix[int(a_joint_0.y)]
    + a_weight_0.z * u_joint_matrix[int(a_joint_0.z)]
    + a_weight_0.w * u_joint_matrix[int(a_joint_0.w)];

  gl_Position = u_projection * u_view * a_root_transform * u_node_transform * skin_matrix * vec4(a_position.xyz, 1.0);
}
