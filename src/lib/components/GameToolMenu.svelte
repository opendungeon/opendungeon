<script lang="ts">
  import { GameMenuToolIcon, MeasureShape } from "$lib/game";
  import type { GameTools } from "$lib/game/gametools.svelte";
  import Icon from "@iconify/svelte";

  type Props = {
    toolData: GameTools;
  };

  let { toolData }: Props = $props();
  const gameTools = [
    { type: "select", icon: GameMenuToolIcon.Select },
    { type: "measure", icon: GameMenuToolIcon.Measure },
    { type: "shape", icon: GameMenuToolIcon.Shape },
    { type: "draw", icon: GameMenuToolIcon.Draw },
    { type: "dice", icon: GameMenuToolIcon.Dice },
  ];
  const measureShapes = [
    { shape: MeasureShape.Path, title: "Path" },
    { shape: MeasureShape.Line, title: "Line" },
    { shape: MeasureShape.Square, title: "Square" },
    { shape: MeasureShape.Circle, title: "Circle" },
    { shape: MeasureShape.Cone, title: "Cone" },
  ];
</script>

<div class="absolute top-32 left-6 z-10 flex flex-row gap-4">
  <ul class="flex flex-col gap-4">
    {#each gameTools as tool, i (i)}
      <li>
        <button
          title={tool.type.charAt(0).toUpperCase() + tool.type.slice(1)}
          data-active={toolData.activeTool === tool}
          onpointerdown={() => {
            if (toolData.activeTool?.type === tool.type) {
              toolData.activeTool = null;
            } else {
              toolData.activeTool = tool;
            }
          }}
          class="p-2 bg-aurora-gray-1200 hover:bg-aurora-gray-1000 data-[active=true]:bg-aurora-gray-800 border-2 border-aurora-gray-400 duration-150 rounded-md"
        >
          <span class="sr-only">{tool.type}</span>
          <Icon icon={tool.icon} width={24} height={24} />
        </button>
      </li>
    {/each}
  </ul>
  {#if toolData.activeTool}
    <div
      class="bg-aurora-gray-1400 border-2 border-aurora-gray-400 rounded-sm py-2 px-4 w-2xs flex flex-col gap-4"
    >
      {#if toolData.activeTool.type === "measure"}
        <div class="flex flex-col gap-2">
          <span>Shape</span>
          <ul class="flex flex-row gap-2">
            {#each measureShapes as shape, i (i)}
              <li
                data-active={toolData.measure.shape === shape.shape}
                class="bg-aurora-gray-1400 hover:aurora-gray-1000 data-[active=true]:bg-aurora-gray-900 border-2 border-aurora-gray-400 duration-150 rounded-md p-1"
              >
                <button
                  title={shape.title}
                  onclick={() => {
                    toolData.measure = { ...toolData.measure, shape: shape.shape };
                  }}
                  class="size-full"
                >
                  <Icon icon={shape.shape} width={24} height={24} />
                </button>
              </li>
            {/each}
          </ul>
        </div>
        <div class="flex flex-col gap-2">
          <span>Cell Width</span>
          <div class="flex flex-row gap-2">
            <button
              title="Full"
              data-active={toolData.measure.useFullCells}
              onclick={() => {
                toolData.measure = { ...toolData.measure, useFullCells: true };
              }}
              class="bg-aurora-gray-1400 hover:aurora-gray-1000 data-[active=true]:bg-aurora-gray-900 border-2 border-aurora-gray-400 duration-150 rounded-md p-1"
            >
              <Icon icon="akar-icons:square" width={24} height={24} />
            </button>
            <button
              title="Quarter"
              data-active={!toolData.measure.useFullCells}
              onclick={() => {
                toolData.measure = { ...toolData.measure, useFullCells: false };
              }}
              class="bg-aurora-gray-1400 hover:aurora-gray-1000 data-[active=true]:bg-aurora-gray-900 border-2 border-aurora-gray-400 duration-150 rounded-md p-1"
            >
              <Icon icon="akar-icons:grid" width={24} height={24} />
            </button>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>
