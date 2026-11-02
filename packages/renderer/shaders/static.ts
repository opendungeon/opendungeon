export const vertex = `
attribute vec3 a_position;
attribute vec3 a_normal;
attribute vec4 a_tangent;
attribute mat4 a_root_transform;

{% for range texCoordCount %}
  attribute vec2 a_texture_coord_{{ index }};
{% endfor %}

uniform mat4 u_node_transform;
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

  gl_Position = u_projection * u_view * a_root_transform * u_node_transform * vec4(a_position.xyz, 1.0);
}
`;

export const fragment = `
precision mediump float;

{% if textured %}
  uniform bool u_has_texture;
  uniform sampler2D u_texture;
{% endif %}

uniform vec4 u_base_color;
uniform float u_alpha_cutoff; // <= 0.0 disables cutoff (OPAQUE / BLEND)

varying vec3 v_normal;

{% for range texCoordCount %}
  varying vec2 v_texture_coord_{{ index }};
{% endfor %}

void main() {
  {% if textured %}
    vec4 linear = u_has_texture ? texture2D(u_texture, v_texture_coord_0) * u_base_color : u_base_color;
  {% else %}
    vec4 linear = u_base_color;
  {% endif %}

  if (u_alpha_cutoff > 0.0 && linear.a < u_alpha_cutoff) {
    discard;
  }
  gl_FragColor = vec4(pow(linear.xyz, vec3(1.0 / 2.2)), linear.a);
}
`;
