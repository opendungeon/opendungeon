<script lang="ts">
  import "./layout.css";
  import Toaster from "#lib/components/Toaster.svelte";
  import type { LayoutProps } from "./$types";

  let { children }: LayoutProps = $props();
</script>

<svelte:head>
  <link rel="icon" href="/favicon.svg" />
  <title>OpenDungeon</title>
</svelte:head>

<div class="h-full bg-aurora-gray-1400">
  {@render children()}
</div>

<Toaster />
