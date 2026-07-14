<script lang="ts">
  import { DEFAULT_VIEW_MODE, type PaintBucketTool } from "$lib/game/level-editor";

  let {
    bucket = $bindable({ type: "texturepaintbucket", texture: null } as PaintBucketTool),
    viewMode = $bindable(DEFAULT_VIEW_MODE),
  } = $props();

  const bucketModes = $derived([
    {
      label: "Texture",
      selected: bucket.type === "texturepaintbucket",
      tool: { type: "texturepaintbucket", texture: null },
      viewMode: "texture",
    },
    {
      label: "Terrain",
      selected: bucket.type === "weightpaintbucket",
      tool: { type: "weightpaintbucket", weight: 0 },
      viewMode: "weight",
    },
  ] as const);

  const bucketWeights = [
    { weight: 0, label: "None" },
    { weight: 1, label: "Normal" },
    { weight: 2, label: "Difficult" },
  ] as const;
</script>

<div class="text-white grid bg-aurora-gray-1200 rounded px-4 py-3 grid gap-3 pointer-events-auto">
  <div>
    {#each bucketModes as bucketMode, i (i)}
      <button
        data-selected={bucketMode.selected}
        onclick={() => {
          bucket = bucketMode.tool;
          viewMode = bucketMode.viewMode;
        }}
        class="bg-aurora-gray-1100 data-[selected=true]:bg-aurora-gray-900 px-4 py-3 first:rounded-l last:rounded-r"
      >
        {bucketMode.label}
      </button>
    {/each}
  </div>
  {#if bucket.type === "weightpaintbucket" && viewMode === "weight"}
    <div>
      <fieldset>
        {#each bucketWeights as { weight, label }, i (i)}
          <div>
            <input
              id={`${weight}-weight-select`}
              type="radio"
              checked={bucket.weight === weight}
              onchange={() => (bucket = { type: "weightpaintbucket", weight })}
            />
            <label for={`${weight}-weight-select`}>{label}</label>
          </div>
        {/each}
      </fieldset>
    </div>
  {/if}
</div>
