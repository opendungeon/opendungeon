<script lang="ts">
  import { resolve } from "$app/paths";
  import { callAPI, getMediaUrl, type APIGame, type APILevelMetaData } from "$lib/api";
  import { goto } from "$app/navigation";
  import StyledCard from "$lib/components/StyledCard.svelte";
  import StyledMain from "$lib/components/StyledMain.svelte";
  import StyledButton from "$lib/components/StyledButton.svelte";
  import { addToast } from "$lib/components/Toaster.svelte";
  import type { PageProps } from "./$types";
  import { Dialog } from "melt/builders";
  import StyledInput from "$lib/components/StyledInput.svelte";
  import logo from "$lib/assets/open-dungeon-logo.png";
  import Icon from "@iconify/svelte";
  import { Avatar } from "melt/components";
  import { getInitials, getSimplifiedTimeSince } from "$lib/utils";

  const PAGE_SIZE = 4;

  let { data }: PageProps = $props();

  let gameName = $state("");
  let pressedPlay = $state(true);
  let activeGame: APIGame | null = $state(null);
  let activeLevel: APILevelMetaData | null = $state(null);
  let showGames = $state(true);
  let showGameCreationMenu = $state(false);
  let showSidePanel = $derived(showGameCreationMenu || !!activeGame || !!activeLevel);
  let page = $state(1);
  let maxPage = $derived(
    showGames
      ? Math.ceil(data.games.length / PAGE_SIZE)
      : Math.ceil(data.levels.length / PAGE_SIZE),
  );
  let searchText = $state("")
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

    //await goto(resolve(`/games/${game.id}`));
  }

  function handleDeleteGame() {
    // TODO: Show confirmation dialog
    console.log("delete active game");
  }

  function handleDeleteLevel() {
    // TODO: Show confirmation dialog
    console.log("delete active level");
  }
</script>

<svelte:head>
  <title>Dashboard - OpenDungeon</title>
</svelte:head>

<StyledMain>
  <div
    class={`flex flex-col items-center w-full h-full pt-18 ${pressedPlay ? "gap-18" : "gap-48"}`}
  >
    <img src={logo} alt="open dungeon logo" width={128} height={128} />
    {#if pressedPlay}
      <StyledCard class={`flex flex-row ${showSidePanel ? "ml-70" : ""}`}>
        <div class="flex flex-col gap-6 py-6">
          <div class="flex flex-row justify-between gap-4 px-8">
            <div class="flex flex-1 flex-row justify-between">
              <button
                onclick={() => (pressedPlay = false)}
                class="text-white bg-aurora-gray-1100 hover:bg-aurora-gray-1000 active:bg-aurora-gray-600 rounded-md duration-100 px-4 py-2"
              >
                Back
              </button>
              <button
                onmousedown={() => {
                  showGameCreationMenu = false;
                  activeLevel = null;
                  showGames = true;
                  page = 1;
                }}
                data-active={showGames}
                class="text-white bg-aurora-gray-1100 hover:bg-aurora-gray-1000 data-[active=true]:bg-aurora-gray-800 rounded-md duration-100 px-8 py-2"
                >Games</button
              >
            </div>
            <div class="flex flex-1 flex-row justify-between">
              <button
                onmousedown={() => {
                  showGameCreationMenu = false;
                  activeGame = null;
                  showGames = false;
                  page = 1;
                }}
                data-active={!showGames}
                class="text-white bg-aurora-gray-1100 hover:bg-aurora-gray-1000 data-[active=true]:bg-aurora-gray-800 rounded-md duration-100 px-8 py-2"
                >Levels</button
              >
              <button
                onclick={() => {
                  if (showGames) {
                    showGameCreationMenu = true;
                    activeGame = null;
                    activeLevel = null;
                    gameName = "";
                  } else {
                    goto(resolve(`/level-editor/${crypto.randomUUID()}`));
                  }
                }}
                class="text-white bg-aurora-gray-1100 hover:bg-aurora-gray-1000 active:bg-aurora-gray-800 rounded-md duration-100 px-4 py-2"
                >New</button
              >
            </div>
          </div>
          <div class="grid grid-cols-2 grid-rows-2 gap-4 w-full px-12">
            {#if showGames}
              {#each data.games.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) as game, i (i)}
                <button
                  data-active={activeGame?.id === game.id}
                  onmousedown={() => {
                    activeGame = game;
                    showGameCreationMenu = false;
                  }}
                  class="aspect-square w-50 rounded-sm bg-aurora-gray-1400 border-2 border-aurora-gray-1200 hover:border-aurora-gray-1000 data-[active=true]:border-aurora-gray-800 duration-100"
                >
                  <h3>{game.name}</h3>
                </button>
              {/each}
            {:else}
              {#each data.levels.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) as level, i (i)}
                <button
                  data-active={activeLevel?.id === level.id}
                  onmousedown={() => {
                    activeLevel = level;
                    showGameCreationMenu = false;
                  }}
                  class="aspect-square rounded-sm w-50 bg-aurora-gray-1400 border-2 border-aurora-gray-1200 hover:border-aurora-gray-1000 data-[active=true]:border-aurora-gray-800 duration-100"
                >
                  <h3>{level.name}</h3>
                </button>
              {/each}
            {/if}
          </div>
          <div class="self-center flex gap-8 items-center">
            <button
              data-inactive={page === 1}
              onclick={() => (page = Math.max(page - 1, 1))}
              class="data-[inactive=true]:opacity-50"
            >
              <Icon icon="el:arrow-left" width={36} height={36} />
            </button>
            <h3>{page}</h3>
            <button
              data-inactive={page === maxPage}
              onmousedown={() => (page = Math.min(page + 1, maxPage))}
              class="data-[inactive=true]:opacity-50"
            >
              <Icon icon="el:arrow-right" width={36} height={36} />
            </button>
          </div>
        </div>
        {#if showGameCreationMenu}
          <form
            onsubmit={handleCreateGame}
            class="border-l border-aurora-gray-1000 h-full px-4 py-6 flex flex-col justify-between w-70"
          >
            <StyledInput bind:value={gameName} placeholder="Game name" />
            <StyledButton label="Create Game" />
          </form>
        {:else if activeGame}
          <div
            class="border-l border-aurora-gray-1000 h-full px-4 py-6 flex flex-col justify-between w-70"
          >
            <div>
              <h3 class="text-xl">{activeGame.name}</h3>
              <span class="text-aurora-gray-600">
                Created by {activeGame.profiles.find(
                  (profile) => profile.id === activeGame?.gameMasterId,
                )?.username}
              </span>
            </div>

            <div class="flex flex-col gap-2">
              <div class="flex justify-between">
                <h4 class="text-lg">Players</h4>
                <button
                  class="bg-aurora-gray-1000 hover:bg-aurora-gray-800 rounded px-2 duration-100"
                  >Invite</button
                >
              </div>
              <div
                class="p-4 flex flex-col gap-4 overflow-y-auto border rounded-sm border-aurora-gray-800"
              >
                <ul class="flex flex-col gap-4 overflow-y-auto">
                  {#each activeGame.profiles as profile, i (i)}
                    <li
                      class="text-white flex flex-row items-center bg-aurora-gray-1200 p-2 rounded-md"
                    >
                      <div class="flex flex-row gap-2 items-center">
                        <div
                          class="w-8 h-8 bg-aurora-gray-1400 rounded-full text-center items-center border-2 border-aurora-gray-600"
                        >
                          <Avatar src={!profile.avatarId ? "" : getMediaUrl(profile.avatarId)}>
                            {#snippet children(avatar)}
                              <img
                                {...avatar.image}
                                alt="Avatar"
                                class="w-full-h-full rounded-full"
                              />
                              <span {...avatar.fallback} class="text-lg -mt-1">
                                {getInitials(profile.username)}
                              </span>
                            {/snippet}
                          </Avatar>
                        </div>
                        <h3 class="text-lg">{profile.username}</h3>
                      </div>
                    </li>
                  {/each}
                </ul>
              </div>
            </div>
            <div class="flex flex-col gap-2">
              <StyledButton
                label="Join Game"
                onclick={() => goto(resolve(`/games/${activeGame!.id}`))}
              />
              {#if data.profile?.id === activeGame.gameMasterId}
                <button
                  class="grid justify-items-center cursor-pointer rounded-lg py-2 text-center duration-100 border border-aurora-gray-800 bg-danger/50 hover:bg-danger"
                  onclick={handleDeleteGame}
                >
                  Delete Game
                </button>
              {/if}
            </div>
          </div>
        {:else if activeLevel}
          <div
            class="border-l border-aurora-gray-1000 h-full px-4 py-6 flex flex-col justify-between w-70"
          >
            <div>
              <h3 class="text-xl">{activeLevel.name}</h3>
              <span class="text-aurora-gray-600"
                >{`${activeLevel.updatedAt !== activeLevel.createdAt ? "Last updated" : "Created"} ${getSimplifiedTimeSince(activeLevel.updatedAt, Date.now() / 1000)}`}</span
              >
            </div>
            <div class="flex flex-col gap-2">
              <StyledButton
                label="Edit Level"
                onclick={() => goto(resolve(`/level-editor/${activeLevel!.id}`))}
              />
              <button
                class="grid justify-items-center cursor-pointer rounded-lg py-2 text-center duration-100 border border-aurora-gray-800 bg-danger/50 hover:bg-danger"
                onclick={handleDeleteLevel}
              >
                Delete Level
              </button>
            </div>
          </div>
        {/if}
      </StyledCard>
    {:else}
      <StyledButton class="w-40 border-2" label="Play" onclick={() => (pressedPlay = true)} />
    {/if}
  </div>
</StyledMain>
