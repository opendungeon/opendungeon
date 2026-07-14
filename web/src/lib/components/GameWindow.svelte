<script lang="ts">
  import { onMount } from "svelte";
  import type Game from "$lib/game";

  let { game } = $props<{ game: Game }>();
  let canvas = $state();

  let lastFrame = 0;
  const runGameLoop = () => {
    window.requestAnimationFrame((currentFrame) => {
      const dt = currentFrame - lastFrame;
      game.update(dt);
      game.draw();
      lastFrame = currentFrame;

      runGameLoop();
    });
  };

  onMount(() => {
    game.start(canvas).then(runGameLoop);
  });
</script>

<canvas bind:this={canvas} class="absolute inset-0"></canvas>
