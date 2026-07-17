<script lang="ts">
  import { resolve } from "$app/paths";
  import { api } from "$lib/api.svelte";
  import StyledCard from "$lib/components/StyledCard.svelte";
  import StyledMain from "$lib/components/StyledMain.svelte";
  import StyledSeparator from "$lib/components/StyledSeparator.svelte";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
</script>

<svelte:head>
  <title>Dashboard - OpenDungeon</title>
</svelte:head>

<StyledMain>
  <StyledCard class="w-full h-full max-w-[800px] px-4 py-6 grid content-start gap-4 md:px-8">
    <div>
      <h1>OpenDungeon</h1>
      <p>Welcome back, {api.profile?.username ?? "[username]"}.</p>
    </div>
    <StyledSeparator />
    <p>Join room stuff will go here</p>
    <StyledSeparator />
    <div>
      <h2>Levels</h2>
      <a href={resolve("/level-editor")} class="text-aurora-magenta-300 underline">Create New</a>
      {#if data.levels.length === 0}
        <p>You don't have any levels.</p>
      {:else}
        <ul></ul>
      {/if}
    </div>
  </StyledCard>
</StyledMain>
