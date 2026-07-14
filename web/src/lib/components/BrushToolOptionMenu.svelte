<script lang="ts">
  import { DEFAULT_VIEW_MODE, type BrushTool } from "$lib/game/level-editor";

  let {
    brush = $bindable({ type: "texturebrush", texture: null } as BrushTool),
    viewMode = $bindable(DEFAULT_VIEW_MODE),
  } = $props();

  const brushModes = $derived([
    {
      label: "Texture",
      selected: brush.type === "texturebrush",
      tool: { type: "texturebrush", texture: null },
      viewMode: "texture",
    },
    {
      label: "Terrain",
      selected: brush.type === "weightbrush",
      tool: { type: "weightbrush", weight: 0 },
      viewMode: "weight",
    },
  ] as const);

  const brushWeights = [
    { weight: 0, label: "None" },
    { weight: 1, label: "Normal" },
    { weight: 2, label: "Difficult" },
  ];
</script>

<div class="text-white grid bg-aurora-gray-1200 rounded px-4 py-3 grid gap-3 pointer-events-auto">
  <div>
    {#each brushModes as brushMode, i (i)}
      <button
        data-selected={brushMode.selected}
        onclick={() => {
          brush = brushMode.tool;
          viewMode = brushMode.viewMode;
        }}
        class="bg-aurora-gray-1100 data-[selected=true]:bg-aurora-gray-900 px-4 py-3 first:rounded-l last:rounded-r"
      >
        {brushMode.label}
      </button>
    {/each}
  </div>
  {#if brush.type == "weightbrush" && viewMode === "weight"}
    <div>
      <fieldset>
        {#each brushWeights as { weight, label }, i (i)}
          <div>
            <input
              id={`${weight}-weight-select`}
              type="radio"
              checked={brush.weight === weight}
              onchange={() => (brush = { type: "weightbrush", weight })}
            />
            <label for={`${weight}-weight-select`}>{label}</label>
          </div>
        {/each}
      </fieldset>
    </div>
  {/if}
</div>
