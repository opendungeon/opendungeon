<script lang="ts">
  import { type Camera, OrthographicCamera, Renderer, StaticModel } from "odr";
  import { onMount } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";
  import * as GLM from "gl-matrix";
  import { degToRad } from "#lib/point.js";
  import { expect } from "result";

  type Props = HTMLAttributes<HTMLCanvasElement> & {
    modelUri: string;
    width?: number;
    height: number;
    autoRotate?: boolean;
  };

  let { modelUri, width = 300, height = 150, autoRotate = false, ...props }: Props = $props();
  let renderer: Renderer;
  let camera: Camera;
  let transform: GLM.mat4 = GLM.mat4.create();
  let canvas = $state<HTMLCanvasElement>();
  let modelId: number | null = $state(null);
  let isLoading = $state(true);

  onMount(async () => {
    renderer = new Renderer(canvas!, {
      resizeToWindow: false,
      backgroundColor: new Float32Array([0, 0, 0, 0]),
    });
    camera = new OrthographicCamera(canvas!.width / canvas!.height);
    camera.rotateX(degToRad(15));
    GLM.mat4.translate(camera.projection, camera.projection, GLM.vec3.fromValues(0, -0.5, 0));
    modelId = expect(
      await renderer.createStaticGLBElement(modelUri),
      "Failed to load model element ID.",
    );
    GLM.mat4.translate(transform, transform, GLM.vec3.fromValues(0, 0, 0));
    isLoading = false;

    loop();
  });

  function tick() {
    if (!autoRotate || isLoading) {
      return;
    }
  }

  function draw() {
    if (!renderer || isLoading) {
      return;
    }

    renderer.clear();

    if (autoRotate) {
      GLM.mat4.rotateY(transform, transform, degToRad(-0.5));
    }
    const model = renderer.getAndUseElement<StaticModel>(modelId!);
    const buffer = model.allocate(1);
    buffer.set(transform, 0);
    model.setCamera(camera);
    model.draw();
  }

  function loop() {
    window.requestAnimationFrame(() => {
      tick();
      draw();
      loop();
    });
  }
</script>

<canvas {...props} {width} {height} bind:this={canvas}></canvas>
