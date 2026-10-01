<script lang="ts">
  import Renderer from "$lib/renderer";
  import Texture from "$lib/renderer/texture";
  import { onMount } from "svelte";
  import CesiumManGLB from "$lib/assets/CesiumMan.glb?url";
  import CrateGLB from "$lib/assets/crate.glb?url";
  import { OrthographicCamera, type Camera } from "$lib/renderer/camera";
  import * as GLM from "gl-matrix";
  import type ModelInstance from "$lib/renderer/model/instance";
  import ModelAnimator from "$lib/renderer/model/animator";
  import type DynamicModel from "$lib/renderer/model/dynamic";
  import type StaticModel from "$lib/renderer/model/static";
  import { MAT4_FLOAT_SIZE } from "$lib/renderer/consts";

  let canvas = $state<HTMLCanvasElement>()!;
  let loading = $state(true);
  let playingInstance1Animation = $state(false);
  let playingInstance2Animation = $state(false);
  let frameHandle = -1;
  let cesiumManId = -1;
  let crateId = -1;
  let renderer: Renderer;
  let camera: Camera;
  let animator: ModelAnimator;
  let instance1: ModelInstance;
  let instance2: ModelInstance;

  onMount(() => {
    renderer = new Renderer(canvas, {
      resizeToWindow: true,
      backgroundColor: new Float32Array([0, 0, 0, 1]),
    });

    camera = new OrthographicCamera(canvas.width / canvas.height);
    camera.zoom = 5;

    animator = new ModelAnimator();

    Promise.all([
      renderer.loadTexture("system.plain", new Texture(1, 1)),
      renderer.createDynamicGLBElement(CesiumManGLB),
      renderer.createStaticGLBElement(CrateGLB),
    ]).then(([, loadedCesiumMan, loadedCrate]) => {
      cesiumManId = loadedCesiumMan;
      crateId = loadedCrate;
      loading = false;
      const dynamic = renderer.getAndUseElement<DynamicModel>(loadedCesiumMan);
      instance1 = dynamic.createInstance();
      GLM.mat4.translate(
        instance1.transform,
        instance1.transform,
        GLM.vec3.fromValues(-1.0, 0.0, 0.0),
      );
      instance1.updateTransforms();
      instance1.computeSkinningMatrix();

      instance2 = dynamic.createInstance();
      GLM.mat4.translate(
        instance2.transform,
        instance2.transform,
        GLM.vec3.fromValues(1.0, 0.0, 0.0),
      );
      instance2.updateTransforms();
      instance2.computeSkinningMatrix();
    });

    loop();

    return () => {
      window.cancelAnimationFrame(frameHandle);
    };
  });

  function tick(time: number) {
    if (!instance1 || !instance2) {
      return;
    }

    animator.tick(time);
  }

  function draw() {
    if (loading) {
      return;
    }

    renderer.clear();

    const simpleSkin = renderer.getAndUseElement<DynamicModel>(cesiumManId);
    simpleSkin.setCamera(camera);
    simpleSkin.draw();

    const crate = renderer.getAndUseElement<StaticModel>(crateId);
    const buffer = crate.allocate(3);
    for (let i = 0; i < 3; i++) {
      const offset = i * MAT4_FLOAT_SIZE;
      const transform = GLM.mat4.create();
      GLM.mat4.translate(transform, transform, GLM.vec3.fromValues(i, i, i));
      buffer.set(transform, offset);
    }
    crate.setCamera(camera);
    crate.draw();
  }

  function loop() {
    frameHandle = window.requestAnimationFrame((ms) => {
      const time = ms / 1000;
      tick(time);
      draw();
      loop();
    });
  }
</script>

<div class="relative">
  <p class="absolute z-10 text-red-500">
    animation1: {playingInstance1Animation ? "playing" : "stopped"}, animation2: {playingInstance2Animation
      ? "playing"
      : "stopped"}
  </p>
  <canvas
    bind:this={canvas}
    class="bg-white"
    onclick={() => {
      if (playingInstance1Animation) {
        return;
      }

      console.log("playing loop animation");
      playingInstance1Animation = true;
      animator.playLoop(instance1.model, instance1, "animation0");
    }}
    oncontextmenu={(event) => {
      event.preventDefault();
      if (playingInstance2Animation) {
        return;
      }

      console.log("playing once animation");
      playingInstance2Animation = true;
      animator.playOnce(instance2.model, instance2, "animation0", () => {
        playingInstance2Animation = false;
      });
    }}
  ></canvas>
</div>
