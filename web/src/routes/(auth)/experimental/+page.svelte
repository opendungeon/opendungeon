<script lang="ts">
  import Renderer from "$lib/renderer";
  import Texture from "$lib/renderer/texture";
  import { onMount } from "svelte";
  import CesiumMan from "$lib/assets/CesiumMan.gltf?raw";
  import { OrthographicCamera, type Camera } from "$lib/renderer/camera";
  import * as GLM from "gl-matrix";
  import type InstanceGLTF from "$lib/renderer/gltf/instance";
  import GLTFAnimator from "$lib/renderer/gltf/animator";
  import type DynamicGLTF from "$lib/renderer/gltf/dynamic";

  let canvas = $state<HTMLCanvasElement>()!;
  let loading = $state(true);
  let playingInstance1Animation = $state(false);
  let playingInstance2Animation = $state(false);
  let frameHandle = -1;
  let simpleSkinId = -1;
  let renderer: Renderer;
  let camera: Camera;
  let animator: GLTFAnimator;
  let instance1: InstanceGLTF;
  let instance2: InstanceGLTF;

  onMount(() => {
    renderer = new Renderer(canvas, {
      resizeToWindow: true,
      backgroundColor: new Float32Array([0, 0, 0, 1]),
    });

    camera = new OrthographicCamera(canvas.width / canvas.height);
    camera.zoom = 5;

    animator = new GLTFAnimator();

    Promise.all([
      renderer.loadTexture("system.plain", new Texture(1, 1)),
      renderer.createDynamicGLTFElement(JSON.parse(CesiumMan)),
    ]).then(([, gltfId]) => {
      simpleSkinId = gltfId;
      loading = false;
      const gltf = renderer.getAndUseElement<DynamicGLTF>(gltfId);
      instance1 = gltf.createInstance();
      GLM.mat4.translate(
        instance1.transform,
        instance1.transform,
        GLM.vec3.fromValues(-1.0, 0.0, 0.0),
      );
      instance1.updateTransforms();
      instance1.computeSkinningMatrix();

      instance2 = gltf.createInstance();
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

    const simpleSkin = renderer.getAndUseElement<DynamicGLTF>(simpleSkinId);
    simpleSkin.setCamera(camera);
    simpleSkin.draw();
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
