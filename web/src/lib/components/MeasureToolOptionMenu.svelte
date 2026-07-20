<script lang="ts">
  import { DEFAULT_VIEW_MODE, type MeasureTool } from "$lib/game/level-editor";
  import StyledCard from "$lib/components/StyledCard.svelte";
  import StyledButton from "./StyledButton.svelte";

  let {
    measure = $bindable({ type: "measure", start: null, shape: "line" } as MeasureTool),
    viewMode = $bindable(DEFAULT_VIEW_MODE),
  } = $props();

  const measureShapes = $derived([
    {
      label: "Line",
      selected: measure.shape === "line",
      tool: { type: "measure", start: null, shape: "line" },
    },
    {
      label: "Cone",
      selected: measure.shape === "cone",
      tool: { type: "measure", start: null, shape: "cone" },
    },
    {
      label: "Area",
      selected: measure.shape === "area",
      tool: { type: "measure", start: null, shape: "area" },
    },
  ] as const);
</script>

<StyledCard class="grid gap-3 px-4 py-3 pointer-events-auto">
  <div class="flex gap-2">
    {#each measureShapes as measureShape, i (i)}
      <StyledButton
        mode={measureShape.selected ? "primary" : "outline"}
        onclick={() => {
          measure = measureShape.tool;
        }}
        label={measureShape.label}
        class="px-4 py-3"
      />
    {/each}
  </div>
</StyledCard>
