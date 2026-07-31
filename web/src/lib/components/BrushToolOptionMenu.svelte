<script lang="ts">
  import { DEFAULT_VIEW_MODE, type BrushTool } from "$lib/game/level-editor";
  import StyledCard from "$lib/components/StyledCard.svelte";
  import StyledButton from "./StyledButton.svelte";

  let {
    brush = $bindable({ type: "texturebrush", texture: null } as BrushTool),
    viewMode = $bindable(DEFAULT_VIEW_MODE),
  } = $props();

  const brushModes = $derived([
    {
      label: "Texture",
      selected: brush.type === "texturebrush",
      tool: { type: "texturebrush", texture: null, width: 0 },
      viewMode: "texture",
    },
    {
      label: "Terrain",
      selected: brush.type === "weightbrush",
      tool: { type: "weightbrush", weight: 0, width: 0 },
      viewMode: "weight",
    },
  ] as const);

  const brushWeights = [
    { weight: 0, label: "None" },
    { weight: 1, label: "Normal" },
    { weight: 2, label: "Difficult" },
  ];
</script>

<StyledCard class="grid gap-3 px-4 py-3 pointer-events-auto">
  <div class="flex gap-2">
    {#each brushModes as brushMode, i (i)}
      <StyledButton
        mode={brushMode.selected ? "primary" : "outline"}
        onclick={() => {
          brush = brushMode.tool;
          viewMode = brushMode.viewMode;
        }}
        label={brushMode.label}
        class="px-4 py-3"
      />
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
              onchange={() => (brush = { type: "weightbrush", width: 0, weight })}
            />
            <label for={`${weight}-weight-select`}>{label}</label>
          </div>
        {/each}
      </fieldset>
    </div>
  {/if}
  <div>
    <label>
      Brush Width
      <input
        type="range"
        min={0}
        max={20}
        defaultValue={0}
        onchange={(event) => {
          if (!event.target) {
            return;
          }

          const target = event.target as HTMLInputElement;
          const width = Number(target.value);
          brush = { ...brush, width };
        }}
      />
    </label>
  </div>
</StyledCard>
