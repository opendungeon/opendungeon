<script lang="ts">
  import { resolve } from "$app/paths";
  import {
    callAPI,
    getMediaUrl,
    type APIGame,
    type APILevelMetaData,
    type APIProfile,
  } from "$lib/api";
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
  import assert from "$lib/assert";

  const PAGE_SIZE = 4;

  let { data }: PageProps = $props();

  // svelte-ignore state_referenced_locally
  let games: APIGame[] = $state([...data.games]);
  let filteredGames: APIGame[] = $derived(
    games.filter((game) => game.name.toLowerCase().includes(searchText.trim().toLowerCase())),
  );
  // svelte-ignore state_referenced_locally
  let levels = $state([...data.levels]);
  let filteredLevels: APILevelMetaData[] = $derived(
    levels.filter((level) => level.name.toLowerCase().includes(searchText.trim().toLowerCase())),
  );
  let gameName = $state("");
  let pressedPlay = $state(true);
  let activeGame: APIGame | null = $state(null);
  let activeLevel: APILevelMetaData | null = $state(null);
  let showGames = $state(true);
  let showGameCreationMenu = $state(false);
  let showSidePanel = $derived(showGameCreationMenu || !!activeGame || !!activeLevel);
  let page = $state(1);
  let maxPage = $derived(
    showGames ? Math.ceil(games.length / PAGE_SIZE) : Math.ceil(levels.length / PAGE_SIZE),
  );
  let showInviteBar = $state(false);
  let invitee = $state("");
  let searchText = $state("");
  let listView = $state(false);
  let showConfirmation = $state(false);
  const dialog = new Dialog();

  $effect.pre(() => {
    games = [...data.games];
    levels = [...data.levels];
  });

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

    games.push(game);
    page = maxPage;
    showGameCreationMenu = false;
    activeGame = game;
  }

  async function handleDeleteGame() {
    assert(activeGame !== null, "Tried to delete a game with none selected.");
    const gameIndex = games.findIndex((game) => game.id === activeGame!.id);
    assert(gameIndex !== -1, "Tried to delete a game that didn't exist.");

    const res = await callAPI(fetch, "DELETE", "/games/" + activeGame!.id);
    if (!res.ok) {
      addToast({
        data: {
          title: "Error Deleting Game",
          description: res.error.message,
          level: "danger",
        },
      });

      return;
    }

    games.splice(gameIndex, 1);
    activeGame = null;
    showConfirmation = false;
  }

  async function handleDeleteLevel() {
    assert(activeLevel !== null, "Tried to delete a level with none selected.");
    const levelIndex = levels.findIndex((level) => level.id === activeLevel!.id);
    assert(levelIndex !== -1, "Tried to delete a level that didn't exist.");

    const res = await callAPI(fetch, "DELETE", "/levels/" + activeLevel!.id);
    if (!res.ok) {
      addToast({
        data: {
          title: "Error Deleting Game",
          description: res.error.message,
          level: "danger",
        },
      });

      return;
    }

    levels.splice(levelIndex, 1);
    activeLevel = null;
  }

  async function handleInvitePlayer(event: SubmitEvent) {
    event.preventDefault();

    assert(activeGame !== null, "Tried to invite a player with no game selected.");

    const formData = new FormData();
    formData.append("userId", invitee);
    formData.append("permissionLevel", "player");
    const inviteRes = await callAPI(fetch, "POST", "/games/" + activeGame!.id + "/players", {
      body: formData,
    });
    if (!inviteRes.ok) {
      addToast({
        data: {
          title: "Failed to Invite Player",
          description: inviteRes.error.message,
          level: "danger",
        },
      });
      return;
    }

    const profileRes = await callAPI(fetch, "GET", "/profiles/" + invitee);
    if (!profileRes.ok) {
      addToast({
        data: {
          title: "Failed to Load Invitee's Profile",
          description: profileRes.error.message,
          level: "danger",
        },
      });
      return;
    }

    const newPlayerProfile: APIProfile = await profileRes.data.json();
    activeGame!.profiles.push(newPlayerProfile);

    showInviteBar = false;
    invitee = "";
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
      <div class={`flex flex-row gap-4 ${showSidePanel ? "ml-74" : ""}`}>
        <StyledCard>
          <div class="flex flex-col gap-6 py-6">
            <div class="flex flex-row justify-between gap-8 px-8">
              <div class="flex flex-row gap-8 flex-1 justify-between">
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
              <div class="flex flex-row gap-8 flex-1 justify-between">
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
            <div class="flex justify-between px-8 gap-4">
              <StyledInput bind:value={searchText} placeholder="Search" class="w-full" />
              <button onmousedown={() => (listView = !listView)}
                ><Icon
                  icon={listView ? "ant-design:bars-outlined" : "akar-icons:grid"}
                  width={36}
                  height={36}
                /></button
              >
            </div>
            <div class="grid grid-cols-2 grid-rows-2 gap-4 w-full px-12">
              {#if showGames}
                {#if filteredGames.length === 0}
                  <span class="col-span-2 row-span-2 text-center text-aurora-gray-600"
                    >No games</span
                  >
                {/if}
                {#each filteredGames.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) as game, i (i)}
                  <button
                    data-active={activeGame?.id === game.id}
                    onmousedown={() => {
                      activeGame = game;
                      showGameCreationMenu = false;
                      showConfirmation = false;
                    }}
                    class="aspect-square w-50 rounded-sm bg-aurora-gray-1400 border-2 border-aurora-gray-1200 hover:border-aurora-gray-1000 data-[active=true]:border-aurora-gray-800 duration-100"
                  >
                    <h3>{game.name}</h3>
                  </button>
                {/each}
              {:else}
                {#if filteredLevels.length === 0}
                  <span class="col-span-2 row-span-2 text-center text-aurora-gray-600"
                    >No levels</span
                  >
                {/if}
                {#each filteredLevels.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) as level, i (i)}
                  <button
                    data-active={activeLevel?.id === level.id}
                    onmousedown={() => {
                      activeLevel = level;
                      showGameCreationMenu = false;
                      showConfirmation = false;
                    }}
                    class="aspect-square rounded-sm w-50 bg-aurora-gray-1400 border-2 border-aurora-gray-1200 hover:border-aurora-gray-1000 data-[active=true]:border-aurora-gray-800 duration-100"
                  >
                    <h3>{level.name}</h3>
                  </button>
                {/each}
              {/if}
            </div>
            {#if (showGames && games.length > 0) || (!showGames && levels.length > 0)}
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
                  data-inactive={page === Math.max(maxPage, page)}
                  onmousedown={() => (page = Math.min(page + 1, maxPage))}
                  class="data-[inactive=true]:opacity-50"
                >
                  <Icon icon="el:arrow-right" width={36} height={36} />
                </button>
              </div>
            {/if}
          </div>
        </StyledCard>
        {#if showGameCreationMenu || activeGame || activeLevel}
          <StyledCard class="h-fit px-4 py-8 flex flex-col justify-start gap-8 w-70">
            <button
              class="absolute top-2 right-2"
              onclick={() => {
                showGameCreationMenu = false;
                activeGame = null;
                activeLevel = null;
                invitee = "";
                showInviteBar = false;
                showConfirmation = false;
              }}><Icon icon="bytesize:close" width={18} height={18} /></button
            >
            {#if showGameCreationMenu}
              <form class="flex flex-col gap-8" onsubmit={handleCreateGame}>
                <StyledInput bind:value={gameName} placeholder="Game name" />
                <StyledButton label="Create Game" />
              </form>
            {:else if activeGame}
              <div>
                <h3 class="text-xl">{activeGame.name}</h3>
                <span class="text-aurora-gray-600">
                  Created by {activeGame.profiles.find(
                    (profile) => profile.id === activeGame?.gameMasterId,
                  )?.username}
                </span>
              </div>

              <div class="flex flex-col gap-3">
                <div class="flex justify-between">
                  <h4 class="text-lg">Players</h4>
                  <button
                    onclick={() => (showInviteBar = !showInviteBar)}
                    class="bg-aurora-gray-1000 hover:bg-aurora-gray-800 rounded px-2 duration-100"
                    >{`${showInviteBar ? "Cancel" : "Invite"}`}</button
                  >
                </div>
                {#if showInviteBar}
                  <form onsubmit={handleInvitePlayer} class="flex flex-col gap-2 px-2">
                    <StyledInput bind:value={invitee} placeholder="Player Id" />
                    <StyledButton class="" label="Confirm" />
                  </form>
                {/if}
                <div
                  class="p-4 flex flex-col gap-4 overflow-y-auto border rounded-sm border-aurora-gray-800 max-h-40"
                >
                  <ul class="flex flex-col gap-4">
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
                    onclick={() => {
                      if (showConfirmation) {
                        handleDeleteGame();
                      } else {
                        showConfirmation = true;
                      }
                    }}
                  >
                    {showConfirmation ? "Confirm" : "Delete Game"}
                  </button>
                {/if}
              </div>
            {:else if activeLevel}
              <div>
                <h3 class="text-xl">{activeLevel.name}</h3>
                <span class="text-aurora-gray-600"
                  >{`${activeLevel.updatedAt !== activeLevel.createdAt ? "Updated" : "Created"} ${getSimplifiedTimeSince(activeLevel.updatedAt, Date.now() / 1000)}`}</span
                >
              </div>
              <div class="flex flex-col gap-2">
                <StyledButton
                  label="Edit Level"
                  onclick={() => goto(resolve(`/level-editor/${activeLevel!.id}`))}
                />
                <button
                  class="grid justify-items-center cursor-pointer rounded-lg py-2 text-center duration-100 border border-aurora-gray-800 bg-danger/50 hover:bg-danger"
                  onclick={() => {
                    if (showConfirmation) {
                      handleDeleteLevel();
                    } else {
                      showConfirmation = true;
                    }
                  }}
                >
                  {showConfirmation ? "Confirm" : "Delete Game"}
                </button>
              </div>
            {/if}
          </StyledCard>
        {/if}
      </div>
    {:else}
      <StyledButton class="w-40 border-2" label="Play" onclick={() => (pressedPlay = true)} />
    {/if}
  </div>
</StyledMain>
