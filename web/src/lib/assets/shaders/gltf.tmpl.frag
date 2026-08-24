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
