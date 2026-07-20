<script lang="ts">
  import { DEFAULT_TOOL, DEFAULT_VIEW_MODE } from "$lib/game/level-editor";
  import BrushToolOptionMenu from "$lib/components/BrushToolOptionMenu.svelte";
  import PaintBucketToolOptionMenu from "$lib/components/PaintBucketToolOptionMenu.svelte";
  import TextureSelectionMenu from "$lib/components/TextureSelectionMenu.svelte";
  import MeasureToolOptionMenu from "$lib/components/MeasureToolOptionMenu.svelte";
  import StyledCard from "./StyledCard.svelte";
  import StyledButton from "./StyledButton.svelte";

  let { tool = $bindable(DEFAULT_TOOL), viewMode = $bindable(DEFAULT_VIEW_MODE) } = $props();

  const toolButtons = $derived([
    {
      label: "Brush",
      selected: tool.type === "weightbrush" || tool.type === "texturebrush",
      tool: { type: "texturebrush", texture: null },
    },
    {
      label: "Paint Bucket",
      selected: tool.type === "weightpaintbucket" || tool.type === "texturepaintbucket",
      tool: { type: "texturepaintbucket", texture: null },
    },
    {
      label: "Measure",
      selected: tool.type === "measure",
      tool: { type: "measure", start: null, shape: "line" },
    },
  ] as const);
</script>

<div class="grid grid-cols-2 px-6 pt-2 pb-4 w-screen h-full">
  <aside class="z-10 relative justify-self-start pointer-events-none">
    <StyledCard class="w-3xs px-4 py-3 pointer-events-auto grid gap-2">
      {#each toolButtons as toolButton, i (i)}
        <StyledButton
          mode={toolButton.selected ? "primary" : "secondary"}
          label={toolButton.label}
          onclick={() => {
            viewMode = "texture";
            tool = toolButton.tool;
          }}
        />
      {/each}
    </StyledCard>
  </aside>
  <aside class="z-10 relative justify-self-end pointer-events-none">
    {#if tool.type === "texturebrush" || tool.type === "weightbrush"}
      <BrushToolOptionMenu bind:brush={tool} bind:viewMode />
    {/if}
    {#if tool.type === "texturepaintbucket" || tool.type === "weightpaintbucket"}
      <PaintBucketToolOptionMenu bind:bucket={tool} bind:viewMode />
    {/if}
    {#if tool.type === "measure"}
      <MeasureToolOptionMenu bind:measure={tool} bind:viewMode />
    {/if}
  </aside>
  <footer class="col-span-2 z-10 content-end pointer-events-none">
    {#if tool.type === "texturebrush" || tool.type === "texturepaintbucket"}
      <TextureSelectionMenu bind:tool />
    {/if}
  </footer>
</div>
