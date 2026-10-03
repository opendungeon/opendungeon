<script lang="ts">
  import { GameMenuToolIcon, MeasureShape } from "#lib/game/index.js";
  import type { GameTools } from "#lib/game/gametools.svelte.js";
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
          class="rounded-md border-2 border-aurora-gray-400 bg-aurora-gray-1200 p-2 duration-150 hover:bg-aurora-gray-1000 data-[active=true]:bg-aurora-gray-800"
        >
          <span class="sr-only">{tool.type}</span>
          <Icon icon={tool.icon} width={24} height={24} />
        </button>
      </li>
    {/each}
  </ul>
  {#if toolData.activeTool}
    <div
      class="flex w-2xs flex-col gap-4 rounded-sm border-2 border-aurora-gray-400 bg-aurora-gray-1400 px-4 py-2"
    >
      {#if toolData.activeTool.type === "measure"}
        <div class="flex flex-col gap-2">
          <span>Shape</span>
          <ul class="flex flex-row gap-2">
            {#each measureShapes as shape, i (i)}
              <li
                data-active={toolData.measure.shape === shape.shape}
                class="hover:aurora-gray-1000 rounded-md border-2 border-aurora-gray-400 bg-aurora-gray-1400 p-1 duration-150 data-[active=true]:bg-aurora-gray-900"
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
      {/if}
    </div>
  {/if}
</div>
