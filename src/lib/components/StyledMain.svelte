<script lang="ts">
  import type { Snippet } from "svelte";

  type Props = {
    children: Snippet;
  };

  let { children }: Props = $props();
</script>

<main class="grid h-full items-center justify-items-center p-4 pt-16 md:pt-4">
  {@render children()}
</main>
