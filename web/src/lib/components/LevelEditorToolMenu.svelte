<script lang="ts">
  import { DEFAULT_TOOL, DEFAULT_VIEW_MODE, type LevelEditorTool } from "$lib/game/level-editor";
  import BrushToolOptionMenu from "$lib/components/BrushToolOptionMenu.svelte";
  import PaintBucketToolOptionMenu from "$lib/components/PaintBucketToolOptionMenu.svelte";
  import TextureSelectionMenu from "$lib/components/TextureSelectionMenu.svelte";

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
      tool: { type: "measure", start: null },
    },
  ]);
</script>

<div class="grid grid-cols-2 p-6 w-screen h-full">
  <aside class="z-10 relative justify-self-start pointer-events-none">
    <ul
      class="grid gap-2 text-white w-3xs bg-aurora-gray-1200 rounded px-4 py-3 pointer-events-auto"
    >
      {#each toolButtons as toolButton, i (i)}
        <li class="grid">
          <button
            data-selected={toolButton.selected}
            onclick={() => {
              viewMode = "texture";
              tool = toolButton.tool as LevelEditorTool;
            }}
            class="border-2 border-aurora-gray-1200 px-4 py-3 bg-aurora-gray-1100 cursor-pointer rounded data-[selected=true]:border-aurora-gray-400 data-[selected=true]:bg-aurora-gray-900"
          >
            {toolButton.label}
          </button>
        </li>
      {/each}
    </ul>
  </aside>
  <aside class="z-10 relative justify-self-end pointer-events-none">
    {#if tool.type === "texturebrush" || tool.type === "weightbrush"}
      <BrushToolOptionMenu bind:brush={tool} bind:viewMode />
    {/if}
    {#if tool.type === "texturepaintbucket" || tool.type === "weightpaintbucket"}
      <PaintBucketToolOptionMenu bind:bucket={tool} bind:viewMode />
    {/if}
  </aside>
  <footer class="col-span-2 z-10 content-end pointer-events-none">
    {#if tool.type === "texturebrush" || tool.type === "texturepaintbucket"}
      <TextureSelectionMenu bind:tool />
    {/if}
  </footer>
</div>
