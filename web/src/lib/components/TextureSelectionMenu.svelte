<script lang="ts">
  import { getMediaUrl, type APICellTexture } from "$lib/api";
  import { type BrushTextureTool, type PaintBucketTextureTool } from "$lib/game/level-editor";
  import StyledCard from "./StyledCard.svelte";
  import Icon from "@iconify/svelte";

  type Props = {
    tool: BrushTextureTool | PaintBucketTextureTool;
    cellTextures: APICellTexture[];
  };

  let {
    cellTextures,
    tool = $bindable({ type: "texturebrush", texture: null, radius: 1 }),
  }: Props = $props();
</script>

<StyledCard class="p-4 grid gap-3 pointer-events-auto max-h-[33vh]">
  <ul class="flex flex-wrap gap-4">
    <li class="h-full">
      <button
        data-selected={!tool.texture}
        onclick={() => {
          tool = { ...tool, texture: null };
        }}
        class="grid grid-rows-[1fr_auto] bg-aurora-gray-1300 h-full py-2 px-4 rounded grid gap-1 border-2 border-aurora-gray-1300 data-[selected=true]:bg-aurora-gray-1100 data-[selected=true]:border-white"
      >
        <Icon
          icon="material-symbols:ink-eraser-outline-rounded"
          font-size={64}
          class="w-32 self-center"
        />
        <span class="">Eraser</span>
      </button>
    </li>
    {#each cellTextures as { displayName, key, mediaId }, i (i)}
      <li>
        <button
          data-selected={key === tool.texture}
          onclick={() => {
            tool = { ...tool, texture: key };
          }}
          class="bg-aurora-gray-1300 py-2 px-4 rounded grid gap-1 border-2 border-aurora-gray-1300 data-[selected=true]:bg-aurora-gray-1100 data-[selected=true]:border-white"
        >
          <img
            alt={`${displayName} cell texture`}
            src={getMediaUrl(mediaId).toString()}
            width={128}
            height={64}
            aria-hidden="true"
            class="texture pointer-events-none"
          />
          <span>{displayName}</span>
        </button>
      </li>
    {/each}
  </ul>
</StyledCard>

<style>
  .texture {
    image-rendering: pixelated;
  }
</style>
