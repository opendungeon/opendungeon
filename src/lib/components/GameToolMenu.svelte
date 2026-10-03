<script lang="ts">
  import { GameMenuTool } from "#lib/game/index.js";
  import Icon from "@iconify/svelte";

  type Props = {
    handleChangeTool: (tool: GameMenuTool | null) => void;
    selectedTool: GameMenuTool | null;
  };

  let { handleChangeTool, selectedTool }: Props = $props();
</script>

<div class="absolute top-32 left-6 z-10 flex flex-row gap-4">
  <ul class="flex flex-col gap-4">
    {#each Object.values(GameMenuTool) as tool, i (i)}
      <li>
        <button
          data-active={selectedTool === tool}
          onpointerdown={() => {
            if (selectedTool === tool) {
              handleChangeTool(null);
            } else {
              handleChangeTool(tool);
            }
          }}
          class="rounded-md border-2 border-aurora-gray-400 bg-aurora-gray-1200 p-2 duration-150 hover:bg-aurora-gray-1000 active:bg-aurora-gray-800 data-[active=true]:bg-aurora-gray-800"
        >
          <span class="sr-only">{tool}</span>
          <Icon icon={tool} width={24} height={24} />
        </button>
      </li>
    {/each}
  </ul>
  {#if selectedTool !== GameMenuTool.Select}
    <!-- TODO: implement tool options -->
    <div class="w-2xs rounded-sm border-2 border-aurora-gray-400 bg-aurora-gray-1400 p-2"></div>
  {/if}
</div>
