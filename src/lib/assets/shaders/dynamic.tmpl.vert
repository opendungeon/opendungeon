attribute vec3 a_position;
attribute vec3 a_normal;
attribute vec4 a_tangent;

{% for range texCoordCount %}
  attribute vec2 a_texture_coord_{{ index }};
{% endfor %}

{% for range jointCount %}
  attribute vec4 a_joint_{{ index }};
{% endfor %}

{% for range weightCount %}
  attribute vec4 a_weight_{{ index }};
{% endfor %}

uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;

{% if jointCount %}
  uniform mat4 u_joint_matrix[{{ jointMatrixSize }}];
{% endif %}

varying vec3 v_normal;

{% for range texCoordCount %}
  varying vec2 v_texture_coord_{{ index }};
{% endfor %}

void main() {
  v_normal = a_normal;

  {% for range texCoordCount %}
    v_texture_coord_{{ index }} = a_texture_coord_{{ index }};
  {% endfor %}

  {% if jointed %}
    mat4 skin_matrix = a_weight_0.x * u_joint_matrix[int(a_joint_0.x)]
      + a_weight_0.y * u_joint_matrix[int(a_joint_0.y)]
      + a_weight_0.z * u_joint_matrix[int(a_joint_0.z)]
      + a_weight_0.w * u_joint_matrix[int(a_joint_0.w)];
  {% endif %}

  {% if jointed %}
    gl_Position = u_projection * u_view * u_model * skin_matrix * vec4(a_position.xyz, 1.0);
  {% else %}
    gl_Position = u_projection * u_view * u_model * vec4(a_position.xyz, 1.0);
  {% endif %}
}
