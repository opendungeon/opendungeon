attribute vec3 a_position;
attribute vec3 a_normal;
attribute vec4 a_tangent;

attribute vec4 a_joint_0;
attribute vec4 a_weight_0;

uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;
uniform mat4 u_joint_matrix[222];

varying vec3 v_normal;
varying vec3 v_position;

void main() {
  v_normal = a_normal;

  mat4 skin_matrix = a_weight_0.x * u_joint_matrix[int(a_joint_0.x)]
    + a_weight_0.y * u_joint_matrix[int(a_joint_0.y)]
    + a_weight_0.z * u_joint_matrix[int(a_joint_0.z)]
    + a_weight_0.w * u_joint_matrix[int(a_joint_0.w)];

    vec4 position = u_projection * u_view * u_model * skin_matrix * vec4(a_position.xyz, 1.0);
    v_position = position.xyz;
    gl_Position = position;
}
