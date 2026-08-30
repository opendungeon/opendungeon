<script lang="ts">
  import { resolve } from "$app/paths";
  import { callAPI, type APIGame, type APILevelMetaData, type APIProfile } from "$lib/api";
  import { goto } from "$app/navigation";
  import StyledCard from "$lib/components/StyledCard.svelte";
  import StyledMain from "$lib/components/StyledMain.svelte";
  import StyledButton from "$lib/components/StyledButton.svelte";
  import { addToast } from "$lib/components/Toaster.svelte";
  import type { PageProps } from "./$types";
  import StyledInput from "$lib/components/StyledInput.svelte";
  import logo from "$lib/assets/open-dungeon-logo.png";
  import Icon, { loadIcons } from "@iconify/svelte";
  import assert from "$lib/assert";
  import DashboardDetailMenu from "$lib/components/DashboardDetailMenu.svelte";

  let { data }: PageProps = $props();

  // svelte-ignore state_referenced_locally
  let games: APIGame[] = $state([...data.games]);
  let filteredGames: APIGame[] = $derived(
    games
      .filter((game) => game.name.toLowerCase().includes(searchText.trim().toLowerCase()))
      .sort((a, b) => b.updatedAt - a.updatedAt),
  );
  // svelte-ignore state_referenced_locally
  let levels = $state([...data.levels]);
  let filteredLevels: APILevelMetaData[] = $derived(
    levels
      .filter((level) => level.name.toLowerCase().includes(searchText.trim().toLowerCase()))
      .sort((a, b) => b.updatedAt - a.updatedAt),
  );
  let pressedPlay = $state(false);
  let activeGame: APIGame | null = $state(null);
  let activeLevel: APILevelMetaData | null = $state(null);
  let showGames = $state(true);
  let creatingGame = $state(false);
  let showSidePanel = $derived(creatingGame || !!activeGame || !!activeLevel);
  let listView = $state(false);
  let page = $state(1);
  let pageSize = $derived(listView ? 8 : 4);
  let maxPage = $derived(
    showGames ? Math.ceil(games.length / pageSize) : Math.ceil(levels.length / pageSize),
  );
  let searchText = $state("");
  let creationsContainer = $state<HTMLDivElement>();

  $effect(() => {
    void page;
    creationsContainer?.scrollTo({ top: 0 });
  });

  $effect(() => {
    void searchText;
    page = 1;
  });

  $effect.pre(() => {
    games = [...data.games];
    levels = [...data.levels];
  });

  loadIcons(
    [
      "bytesize:close",
      "ant-design:bars-outlined",
      "akar-icons:grid",
      "el:arrow-left",
      "el:arrow-right",
    ],
    (loaded) => {
      assert(loaded.length > 0, "Failed to load icons");
    },
  );

  async function handleCreateGame(event: SubmitEvent) {
    event.preventDefault();

    const body = new FormData(event.currentTarget as HTMLFormElement);
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
    creatingGame = false;
    activeGame = game;
    creationsContainer?.scrollTo({ top: 0 });
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

  async function handleInvitePlayer(event: SubmitEvent): Promise<boolean> {
    event.preventDefault();

    assert(activeGame !== null, "Tried to invite a player with no game selected.");

    const body = new FormData(event.currentTarget as HTMLFormElement);
    const invitee = body.get("userId")!;
    body.append("permissionLevel", "player");
    const inviteRes = await callAPI(fetch, "POST", "/games/" + activeGame!.id + "/players", {
      body,
    });
    if (!inviteRes.ok) {
      addToast({
        data: {
          title: "Failed to Invite Player",
          description: inviteRes.error.message,
          level: "danger",
        },
      });
      return false;
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
      return false;
    }

    const newPlayerProfile: APIProfile = await profileRes.data.json();
    activeGame!.profiles.push(newPlayerProfile);

    return true;
  }
</script>

<svelte:head>
  <title>Dashboard - OpenDungeon</title>
</svelte:head>

<StyledMain>
  <div
    class={`flex flex-col items-center w-full h-full px-4 md:px-0 ${pressedPlay ? "gap-6 md:gap-12 md:pt-18" : "gap-36 pt-24"}`}
  >
    <img src={logo} alt="open dungeon logo" class="w-28 md:w-32" />
    {#if pressedPlay}
      <div class={`relative flex flex-row gap-4 ${showSidePanel ? "lg:ml-74" : ""}`}>
        <StyledCard class="xl:w-xl md:w-lg min-h-100 md:min-h-150">
          <div class="flex flex-col gap-6 py-6">
            <div class="flex flex-row justify-between gap-8 px-4 md:px-8">
              <button onclick={() => (pressedPlay = false)} class="text-white px-4 py-2">
                <Icon icon="bytesize:close" width={18} height={18} />
              </button>
              <div class="flex-row gap-4 hidden md:flex">
                <button
                  onpointerdown={() => {
                    creatingGame = false;
                    activeLevel = null;
                    showGames = true;
                    page = 1;
                    searchText = "";
                  }}
                  data-active={showGames}
                  class="text-white bg-aurora-gray-1100 hover:bg-aurora-gray-1000 data-[active=true]:bg-aurora-gray-800 rounded-md px-8 py-2"
                  >Games</button
                >
                <button
                  onpointerdown={() => {
                    creatingGame = false;
                    activeGame = null;
                    showGames = false;
                    page = 1;
                    searchText = "";
                  }}
                  data-active={!showGames}
                  class="text-white bg-aurora-gray-1100 hover:bg-aurora-gray-1000 data-[active=true]:bg-aurora-gray-800 rounded-md px-8 py-2"
                  >Levels</button
                >
              </div>
              <button
                onpointerdown={() => {
                  creatingGame = false;
                  activeLevel = null;
                  activeGame = null;
                  showGames = !showGames;
                  page = 1;
                }}
                class="block md:hidden text-white bg-aurora-gray-1100 hover:bg-aurora-gray-1000 active:bg-aurora-gray-800 rounded-md px-8 py-2"
                >{showGames ? "Games" : "Levels"}</button
              >
              <button
                onclick={() => {
                  if (showGames) {
                    creatingGame = true;
                    activeGame = null;
                    activeLevel = null;
                  } else {
                    goto(resolve(`/level-editor/${crypto.randomUUID()}`));
                  }
                }}
                class="text-white bg-aurora-gray-1100 hover:bg-aurora-gray-1000 active:bg-aurora-gray-800 rounded-md px-4 py-2"
              >
                <Icon icon="akar-icons:plus" width={24} height={24} />
              </button>
            </div>
            {#if creatingGame || activeGame || activeLevel}
              <DashboardDetailMenu
                class={`${creatingGame ? "max-w-70" : "hidden"} md:flex lg:hidden`}
                onClose={() => {
                  creatingGame = false;
                  activeGame = null;
                  activeLevel = null;
                }}
                profile={data.profile!}
                {activeGame}
                {activeLevel}
                {creatingGame}
                {handleCreateGame}
                {handleDeleteGame}
                {handleDeleteLevel}
                {handleInvitePlayer}
              />
            {/if}
            <div class="flex justify-between px-8 gap-4">
              <StyledInput
                bind:value={searchText}
                placeholder="Search"
                class="w-full"
                icon="bytesize:close"
                iconColor="#777777"
              />
              <button onpointerdown={() => (listView = !listView)}
                ><Icon
                  icon={listView ? "ant-design:bars-outlined" : "akar-icons:grid"}
                  width={36}
                  height={36}
                /></button
              >
            </div>
            <div
              bind:this={creationsContainer}
              class={`flex flex-col items-center md:grid max-h-[50vh] overflow-y-auto ${listView ? "px-8" : "px-16 md:grid md:grid-cols-2 md:grid-rows-2"} gap-4 w-full md:px-12 justify-items-center`}
            >
              {#if showGames}
                {#if filteredGames.length === 0}
                  <span class="col-span-2 row-span-2 text-center text-aurora-gray-600"
                    >No games</span
                  >
                {/if}
                {#each listView ? filteredGames : filteredGames.slice((page - 1) * pageSize, page * pageSize) as game, i (i)}
                  <div class="md:hidden w-full">
                    {#if game.id === activeGame?.id}
                      <DashboardDetailMenu
                        class="w-full"
                        onClose={() => {
                          creatingGame = false;
                          activeGame = null;
                          activeLevel = null;
                        }}
                        profile={data.profile!}
                        {activeGame}
                        {activeLevel}
                        {creatingGame}
                        {handleCreateGame}
                        {handleDeleteGame}
                        {handleDeleteLevel}
                        {handleInvitePlayer}
                      />
                    {:else}
                      <button
                        data-active={activeGame?.id === game.id}
                        onpointerdown={() => {
                          activeGame = game;
                          creatingGame = false;
                        }}
                        class={`${listView ? "px-4 py-4 flex justify-between gap-1 w-full items-center" : "aspect-square w-full md:w-42 xl:w-50 p-2"} rounded-sm bg-aurora-gray-1400 border-2 border-aurora-gray-1100 hover:border-aurora-gray-900 data-[active=true]:border-aurora-gray-600 `}
                      >
                        <h3
                          class={`${listView ? "text-left" : "mx-auto text-center"} wrap-break-word`}
                        >
                          {game.name}
                        </h3>
                      </button>
                    {/if}
                  </div>
                  <button
                    data-active={activeGame?.id === game.id}
                    onpointerdown={() => {
                      activeGame = game;
                      creatingGame = false;
                    }}
                    class={`${listView ? "px-4 py-4 md:flex justify-between gap-1 w-full items-center" : "md:block aspect-square w-full md:w-42 xl:w-50 p-2"} rounded-sm bg-aurora-gray-1400 border-2 border-aurora-gray-1100 hover:border-aurora-gray-900 data-[active=true]:border-aurora-gray-600 hidden`}
                  >
                    <h3 class={`${listView ? "text-left" : "mx-auto text-center"} wrap-break-word`}>
                      {game.name}
                    </h3>
                  </button>
                {/each}
              {:else}
                {#if filteredLevels.length === 0}
                  <span class="col-span-2 row-span-2 text-center text-aurora-gray-600"
                    >No levels</span
                  >
                {/if}
                {#each listView ? filteredLevels : filteredLevels.slice((page - 1) * pageSize, page * pageSize) as level, i (i)}
                  <div class="md:hidden w-full max-w-70">
                    {#if level.id === activeLevel?.id}
                      <DashboardDetailMenu
                        class="w-full"
                        onClose={() => {
                          creatingGame = false;
                          activeGame = null;
                          activeLevel = null;
                        }}
                        profile={data.profile!}
                        {activeGame}
                        {activeLevel}
                        {creatingGame}
                        {handleCreateGame}
                        {handleDeleteGame}
                        {handleDeleteLevel}
                        {handleInvitePlayer}
                      />
                    {:else}
                      <button
                        data-active={activeLevel?.id === level.id}
                        onpointerdown={() => {
                          activeLevel = level;
                          creatingGame = false;
                        }}
                        class={`${listView ? "px-4 py-4 flex justify-between gap-1 w-full items-center" : "aspect-square w-full md:w-42 xl:w-50 p-2"} rounded-sm bg-aurora-gray-1400 border-2 border-aurora-gray-1100 hover:border-aurora-gray-900 data-[active=true]:border-aurora-gray-600 `}
                      >
                        <h3
                          class={`${listView ? "text-left" : "mx-auto text-center"} wrap-break-word`}
                        >
                          {level.name}
                        </h3>
                      </button>
                    {/if}
                  </div>
                  <button
                    data-active={activeLevel?.id === level.id}
                    onpointerdown={() => {
                      activeLevel = level;
                      creatingGame = false;
                    }}
                    class={`${listView ? "px-4 py-4 md:flex justify-between gap-1 w-full items-center" : "md:block aspect-square w-full md:w-42 xl:w-50 p-2"} rounded-sm bg-aurora-gray-1400 border-2 border-aurora-gray-1100 hover:border-aurora-gray-900 data-[active=true]:border-aurora-gray-600 hidden`}
                  >
                    <h3 class={`${listView ? "text-left" : "mx-auto text-center"} wrap-break-word`}>
                      {level.name}
                    </h3>
                  </button>
                {/each}
              {/if}
            </div>
            {#if !listView && ((showGames && filteredGames.length > pageSize) || (!showGames && filteredLevels.length > pageSize))}
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
                  onpointerdown={() => (page = Math.min(page + 1, maxPage))}
                  class="data-[inactive=true]:opacity-50"
                >
                  <Icon icon="el:arrow-right" width={36} height={36} />
                </button>
              </div>
            {/if}
          </div>
        </StyledCard>
        {#if creatingGame || activeGame || activeLevel}
          <DashboardDetailMenu
            class="hidden lg:flex"
            onClose={() => {
              creatingGame = false;
              activeGame = null;
              activeLevel = null;
            }}
            profile={data.profile!}
            {activeGame}
            {activeLevel}
            {creatingGame}
            {handleCreateGame}
            {handleDeleteGame}
            {handleDeleteLevel}
            {handleInvitePlayer}
          />
        {/if}
      </div>
    {:else}
      <StyledButton
        class="w-40 h-min border-2 absolute m-auto top-0 bottom-36"
        label="Play"
        onclick={() => (pressedPlay = true)}
      />
    {/if}
  </div>
</StyledMain>
