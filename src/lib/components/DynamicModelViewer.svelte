<script lang="ts">
  import { degToRad } from "#lib/point.ts";
  import Page from "../../routes/(admin)/admin/+page.svelte";
  import {
    type Camera,
    DynamicModel,
    ModelInstance,
    OrthographicCamera,
    Renderer,
    StaticModel,
  } from "@opendungeon/renderer";
  import type { Material } from "@opendungeon/renderer/src/model/types";
  import { unwrap } from "@opendungeon/result";
  import * as GLM from "gl-matrix";
  import { onMount } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";

  type Props = HTMLAttributes<HTMLCanvasElement> & {
    modelUri: string;
    width?: number;
    height: number;
    autoRotate?: boolean;
    defaultMaterial?: Material;
  };

  let {
    modelUri,
    width = 300,
    height = 150,
    autoRotate = false,
    defaultMaterial,
    ...props
  }: Props = $props();
  let renderer: Renderer;
  let camera: Camera;
  let instance: ModelInstance;
  let modelId: number;
  let canvas = $state<HTMLCanvasElement>();
  let isLoading = $state(true);

  onMount(async () => {
    renderer = new Renderer(canvas!, {
      resizeToWindow: false,
      backgroundColor: new Float32Array([0, 0, 0, 0]),
    });
    camera = new OrthographicCamera(canvas!.width / canvas!.height);
    camera.rotateX(degToRad(15));
    camera.zoom = 1;
    GLM.mat4.translate(camera.projection, camera.projection, GLM.vec3.fromValues(0, -1, 0));

    await renderer.createDynamicGLBElement("/human.male.glb").then((res) => {
      modelId = unwrap(res);
      const model = renderer.getElement<DynamicModel>(modelId);
      instance = model.createInstance().instance;
      instance.defaultMaterial = defaultMaterial;
      instance.applyAnimation("Idle", 0);
      instance.updateTransforms();
      instance.computeSkinningMatrix();
    });

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
      GLM.mat4.rotateY(instance.transform, instance.transform, degToRad(-0.5));
    }

    const model = renderer.getAndUseElement<DynamicModel>(modelId);
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
