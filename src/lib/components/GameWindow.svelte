<script lang="ts">
  import { onMount } from "svelte";
  import type { HTMLCanvasAttributes } from "svelte/elements";

  type Props = {
    draw: () => void;
    tick?: () => void;
    canvas?: HTMLCanvasElement;
  } & HTMLCanvasAttributes;

  let { draw, tick, canvas = $bindable(), ...props }: Props = $props();

  let frameHandle = -1;

  onMount(() => {
    loop();

    return () => {
      window.cancelAnimationFrame(frameHandle);
    };
  });

  function loop() {
    frameHandle = window.requestAnimationFrame(() => {
      tick?.();
      draw();
      loop();
    });
  }
</script>

<canvas bind:this={canvas} {...props}></canvas>
