<script lang="ts">
  import { onMount } from "svelte";
  import type Game from "$lib/game";

  let { game } = $props<{ game: Game }>();
  let canvas = $state();
  let isDebugging = $state(import.meta.env.DEV);
  let frameHandle = -1;
  let frameNumber = $state(0);
  let frameTime = $state(1);
  let framesPerSecond = $derived(1000 / frameTime);
  let lastTime = 0;

  const runGameLoop = () => {
    frameHandle = window.requestAnimationFrame((t) => {
      const dt = t - lastTime;
      game.update(dt);
      game.draw();

      frameNumber += 1;
      frameTime = t - lastTime;
      lastTime = t;

      runGameLoop();
    });
  };

  onMount(() => {
    game.start(canvas).then(runGameLoop);

    window.onbeforeunload = () => {
      window.cancelAnimationFrame(frameHandle);
    };
  });
</script>

<div id="game-window" class="absolute inset-0 overflow-hidden">
  <canvas bind:this={canvas} class="h-full w-full"></canvas>
  {#if isDebugging}
    <code class="font-mono z-50 absolute bottom-0 right-0 pointer-events-none text-[#ff0000]">
      frame: {frameNumber}, frame time: {frameTime.toFixed()}ms, frames per second: {framesPerSecond.toFixed()}
    </code>
  {/if}
</div>
