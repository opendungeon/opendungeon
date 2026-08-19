<script lang="ts">
  import Renderer from "$lib/renderer";
  import Texture from "$lib/renderer/texture";
  import { onMount } from "svelte";
  import SimpleSkin from "$lib/assets/SimpleSkin.gltf?raw";
  import type GLTF from "$lib/renderer/gltf";
  import { OrthographicCamera, type Camera } from "$lib/renderer/camera";
  import * as GLM from "gl-matrix";

  let canvas = $state<HTMLCanvasElement>()!;
  let loading = $state(true);
  let frameHandle = -1;
  let simpleSkinId = -1;
  let renderer: Renderer;
  let camera: Camera;

  onMount(() => {
    renderer = new Renderer(canvas, {
      resizeToWindow: true,
      backgroundColor: new Float32Array([0, 0, 0, 1]),
    });

    camera = new OrthographicCamera(canvas.width / canvas.height);
    camera.zoom = 5;

    Promise.all([
      renderer.loadTexture("system.plain", new Texture(1, 1)),
      renderer.createGLTFElement(JSON.parse(SimpleSkin)),
    ]).then(([, gltfId]) => {
      simpleSkinId = gltfId;
      const simpleSkin = renderer.getAndUseElement<GLTF>(simpleSkinId);
      simpleSkin.updateTransforms();
      simpleSkin.computeSkinningMatrix();
      loading = false;
    });

    loop();

    return () => {
      window.cancelAnimationFrame(frameHandle);
    };
  });

  function tick(dt: number) {
    const simpleSkin = renderer.getAndUseElement<GLTF>(simpleSkinId);
    const zAxis = GLM.quat.fromValues(0, 0, 1, 1);
    simpleSkin.nodes[2].rotation = GLM.quat.setAxisAngle(zAxis, zAxis, Math.sin(dt / 1000) * 0.5);
  }

  function draw() {
    if (loading) {
      return;
    }

    renderer.clear();

    const simpleSkin = renderer.getAndUseElement<GLTF>(simpleSkinId);
    simpleSkin.setCamera(camera);
    simpleSkin.updateTransforms();
    simpleSkin.computeSkinningMatrix();

    const buffer = simpleSkin.allocate(1);
    buffer.set(GLM.mat4.create());
    simpleSkin.draw();
  }

  function loop() {
    frameHandle = window.requestAnimationFrame((dt) => {
      tick(dt);
      draw();
      loop();
    });
  }
</script>

<canvas bind:this={canvas} class="bg-white"></canvas>
