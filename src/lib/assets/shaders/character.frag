precision mediump float;

const vec3 light = vec3(-1.0, -1.0, -1.0);

uniform vec4 u_base_color;
uniform float u_alpha_cutoff; // <= 0.0 disables cutoff (OPAQUE / BLEND)

varying vec3 v_normal;
varying vec3 v_position;

void main() {
  vec4 linear = u_base_color;
  if (u_alpha_cutoff > 0.0 && linear.a < u_alpha_cutoff) {
    discard;
  }

  vec3 l = normalize(light - v_position);
  float diff = max(0.4, dot(v_normal, l));
  vec3 diffuse = diff * linear.xyz;

  gl_FragColor = vec4(diffuse, linear.a);
}
