<script lang="ts">
  import { onMount } from "svelte";
  import type { HTMLCanvasAttributes } from "svelte/elements";

  type Props = {
    draw: () => void;
    tick?: (time: number) => void;
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
    frameHandle = window.requestAnimationFrame((ms) => {
      const time = ms / 1000;
      tick?.(time);
      draw();
      loop();
    });
  }
</script>

<canvas bind:this={canvas} {...props}></canvas>
