attribute vec3 a_position;
attribute vec3 a_normal;
attribute vec4 a_tangent;

{% for range texCoordCount %}
  attribute vec2 a_texture_coord_{{ index }};
{% endfor %}

uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;

varying vec3 v_normal;

{% for range texCoordCount %}
  varying vec2 v_texture_coord_{{ index }};
{% endfor %}

void main() {
  v_normal = a_normal;

  {% for range texCoordCount %}
    v_texture_coord_{{ index }} = a_texture_coord_{{ index }};
  {% endfor %}

  gl_Position = u_projection * u_view * u_model * vec4(a_position.xyz, 1.0);
}
