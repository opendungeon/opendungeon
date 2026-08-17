<script lang="ts">
  import { resolve } from "$app/paths";
  import { callAPI, type APIGame } from "$lib/api";
  import { goto } from "$app/navigation";
  import StyledCard from "$lib/components/StyledCard.svelte";
  import StyledMain from "$lib/components/StyledMain.svelte";
  import StyledSeparator from "$lib/components/StyledSeparator.svelte";
  import StyledButton from "$lib/components/StyledButton.svelte";
  import { addToast } from "$lib/components/Toaster.svelte";
  import type { PageProps } from "./$types";
  import { Dialog } from "melt/builders";
  import StyledInput from "$lib/components/StyledInput.svelte";

  let { data }: PageProps = $props();

  let gameName = $state("");
  const dialog = new Dialog();

  async function handleCreateGame(event: SubmitEvent) {
    event.preventDefault();

    const body = new FormData();
    body.append("name", gameName);

    const res = await callAPI(fetch, "POST", "/games", {
      body,
    });

    if (!res.ok) {
      addToast({
        data: {
          title: "Error Creating Game",
          description: res.error.message,
          level: "danger",
        },
      });

      return;
    }

    const game = (await res.data.json()) as APIGame;

    await goto(resolve(`/games/${game.id}`));
  }
</script>

<svelte:head>
  <title>Dashboard - OpenDungeon</title>
</svelte:head>

<StyledMain>
  <StyledCard class="w-full h-full max-w-[800px] px-4 py-6 grid content-start gap-4 md:px-8">
    <div>
      <h1>OpenDungeon</h1>
      <p>Welcome back, {data.profile?.username ?? "[username]"}.</p>
    </div>
    <StyledSeparator />
    <div>
      <h2>My Levels</h2>
      <a
        href={resolve(`/level-editor/${crypto.randomUUID()}`)}
        class="text-aurora-magenta-300 underline">Create New</a
      >
      {#if data.levels.length === 0}
        <p>You don't have any levels.</p>
      {:else}
        <ul>
          {#each data.levels as level, i (i)}
            <li>
              <a href={resolve(`/level-editor/${level.id}`)}>
                &dash; {level.name}
              </a>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
    <StyledSeparator />
    <div class="flex flex-col gap-4">
      <h2>My Games</h2>
      <StyledButton label="Create Game" class="px-2" {...dialog.trigger} />
      <dialog {...dialog.content} class="bg-transparent border-0 backdrop:hidden text-white">
        <StyledCard class="p-4">
          <form onsubmit={handleCreateGame}>
            <StyledInput bind:value={gameName} placeholder="Name" />
            <StyledButton label="Create" />
          </form>
        </StyledCard>
      </dialog>
      {#if data.games.length === 0}
        <p>You don't have any games.</p>
      {:else}
        <ul>
          {#each data.games as game, i (i)}
            <li>
              <a href={resolve(`/games/${game.id}`)}>
                &dash; {game.name}
              </a>
            </li>
          {/each}
        </ul>
      {/if}
    </div>
  </StyledCard>
</StyledMain>
