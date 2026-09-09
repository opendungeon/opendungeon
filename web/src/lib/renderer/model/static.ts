import type { RenderElement } from "$lib/renderer/element";
import type Shader from "$lib/renderer/shader";

export default class StaticModel implements RenderElement {
  private shader: Shader;

  draw() {
    const gl = this.shader.gl;

    // loop over primitives
    //
    //
  }
}
