<script lang="ts">
  import type { Level } from "#lib/server/database/levels.ts";

  type Props = {
    active: boolean;
    levels: Level[];
    onLoadLevel: (levelId: string) => void;
  };

  let { active, levels, onLoadLevel }: Props = $props();
</script>

<div data-active={active} class="hidden flex-col gap-4 p-4 data-[active=true]:flex">
  <h3 class="self-center text-2xl">Levels</h3>
  <ul class="flex flex-col gap-4">
    {#each levels as level, i (i)}
      <li
        class="rounded-md bg-aurora-gray-1100 text-white duration-100 hover:bg-aurora-gray-1000 active:bg-aurora-gray-900"
      >
        <button
          class="size-full w-full cursor-pointer py-3 wrap-break-word"
          onclick={() => onLoadLevel(level.level_id)}
        >
          {level.name}
        </button>
      </li>
    {/each}
  </ul>
</div>
