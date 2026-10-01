<script lang="ts">
  import type { Snippet } from "svelte";

  type Props = {
    children: Snippet;
  };

  let { children }: Props = $props();
</script>

<main class="grid p-4 items-center justify-items-center h-full pt-16 md:pt-4">
  {@render children()}
</main>
