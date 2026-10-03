<script lang="ts">
  import { resolve } from "$app/paths";
  import { goto } from "$app/navigation";
  import StyledCard from "#lib/components/StyledCard.svelte";
  import StyledMain from "#lib/components/StyledMain.svelte";
  import StyledButton from "#lib/components/StyledButton.svelte";
  import type { PageProps } from "./$types";
  import StyledInput from "#lib/components/StyledInput.svelte";
  import logo from "#lib/assets/open-dungeon-logo.png";
  import Icon, { loadIcons } from "@iconify/svelte";
  import assert from "#lib/assert.js";
  import DashboardDetailMenu from "#lib/components/DashboardDetailMenu.svelte";
  import { randomUUIDv7 } from "#lib/utils.js";
  import type { Level } from "#lib/server/database/levels.js";
  import type { GameWithPlayerProfiles } from "#lib/server/database/games.js";

  let { data }: PageProps = $props();
  let filteredGames: GameWithPlayerProfiles[] = $derived(
    data.games
      .filter((game) => game.name.toLowerCase().includes(searchText.trim().toLowerCase()))
      .sort((a, b) => Number(b.updated_at) - Number(a.updated_at)),
  );
  let filteredLevels: Level[] = $derived(
    data.levels
      .filter((level) => level.name.toLowerCase().includes(searchText.trim().toLowerCase()))
      .sort((a, b) => Number(b.updated_at) - Number(a.updated_at)), // TODO: this is awful, we should never sort in code
  );
  let pressedPlay = $state(false);
  let activeGame: GameWithPlayerProfiles | null = $state(null);
  let activeLevel: Level | null = $state(null);
  let showGames = $state(true);
  let creatingGame = $state(false);
  let showSidePanel = $derived(creatingGame || !!activeGame || !!activeLevel);
  let listView = $state(false);
  let page = $state(1);
  let pageSize = $derived(listView ? 8 : 4);
  let maxPage = $derived(
    showGames ? Math.ceil(data.games.length / pageSize) : Math.ceil(data.levels.length / pageSize),
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
</script>

<svelte:head>
  <title>Dashboard - OpenDungeon</title>
</svelte:head>

<StyledMain>
  <div
    class={`flex h-full w-full flex-col items-center px-4 md:px-0 ${pressedPlay ? "gap-6 md:gap-12 md:pt-18" : "gap-36 pt-24"}`}
  >
    <img src={logo} alt="open dungeon logo" class="w-28 md:w-32" />
    {#if pressedPlay}
      <div class={`relative flex flex-row gap-4 ${showSidePanel ? "lg:ml-74" : ""}`}>
        <StyledCard class="min-h-100 md:min-h-150 md:w-lg xl:w-xl">
          <div class="flex flex-col gap-6 py-6">
            <div class="flex flex-row justify-between gap-8 px-4 md:px-8">
              <button onclick={() => (pressedPlay = false)} class="px-4 py-2 text-white"
                ><Icon icon="bytesize:close" width={18} height={18} /></button
              >

              <div class="hidden flex-row gap-4 md:flex">
                <button
                  onpointerdown={() => {
                    creatingGame = false;
                    activeLevel = null;
                    showGames = true;
                    page = 1;
                    searchText = "";
                  }}
                  data-active={showGames}
                  class="rounded-md bg-aurora-gray-1100 px-8 py-2 text-white hover:bg-aurora-gray-1000 data-[active=true]:bg-aurora-gray-800"
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
                  class="rounded-md bg-aurora-gray-1100 px-8 py-2 text-white hover:bg-aurora-gray-1000 data-[active=true]:bg-aurora-gray-800"
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
                class="block rounded-md bg-aurora-gray-1100 px-8 py-2 text-white hover:bg-aurora-gray-1000 active:bg-aurora-gray-800 md:hidden"
                >{showGames ? "Games" : "Levels"}</button
              >
              <button
                onclick={() => {
                  if (showGames) {
                    creatingGame = true;
                    activeGame = null;
                    activeLevel = null;
                  } else {
                    goto(resolve(`level-editor/${randomUUIDv7()}`));
                  }
                }}
                class="rounded-md bg-aurora-gray-1100 px-4 py-2 text-white hover:bg-aurora-gray-1000 active:bg-aurora-gray-800"
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
              />
            {/if}
            <div class="flex justify-between gap-4 px-8">
              <StyledInput
                bind:value={searchText}
                placeholder="Search"
                class="w-full"
                icon="bytesize:close"
                iconColor="#777777"
              />
              <button onpointerdown={() => (listView = !listView)}>
                <Icon
                  icon={listView ? "ant-design:bars-outlined" : "akar-icons:grid"}
                  width={36}
                  height={36}
                /></button
              >
            </div>
            <div
              bind:this={creationsContainer}
              class={`flex max-h-[50vh] flex-col items-center overflow-y-auto md:grid ${listView ? "px-8" : "px-16 md:grid md:grid-cols-2 md:grid-rows-2"} w-full justify-items-center gap-4 md:px-12`}
            >
              {#if showGames}
                {#if filteredGames.length === 0}
                  <span class="col-span-2 row-span-2 text-center text-aurora-gray-600"
                    >No games</span
                  >
                {/if}
                {#each listView ? filteredGames : filteredGames.slice((page - 1) * pageSize, page * pageSize) as game, i (i)}
                  <div class="w-full md:hidden">
                    {#if game.game_id === activeGame?.game_id}
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
                      />
                    {:else}
                      <button
                        data-active={activeGame?.game_id === game.game_id}
                        onpointerdown={() => {
                          activeGame = game;
                          creatingGame = false;
                        }}
                        class={`${listView ? "flex w-full items-center justify-between gap-1 px-4 py-4" : "aspect-square w-full p-2 md:w-42 xl:w-50"} rounded-sm border-2 border-aurora-gray-1100 bg-aurora-gray-1400 hover:border-aurora-gray-900 data-[active=true]:border-aurora-gray-600 `}
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
                    data-active={activeGame?.game_id === game.game_id}
                    onpointerdown={() => {
                      activeGame = game;
                      creatingGame = false;
                    }}
                    class={`${listView ? "w-full items-center justify-between gap-1 px-4 py-4 md:flex" : "aspect-square w-full p-2 md:block md:w-42 xl:w-50"} hidden rounded-sm border-2 border-aurora-gray-1100 bg-aurora-gray-1400 hover:border-aurora-gray-900 data-[active=true]:border-aurora-gray-600`}
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
                  <div class="w-full max-w-70 md:hidden">
                    {#if level.level_id === activeLevel?.level_id}
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
                      />
                    {:else}
                      <button
                        data-active={activeLevel?.level_id === level.level_id}
                        onpointerdown={() => {
                          activeLevel = level;
                          creatingGame = false;
                        }}
                        class={`${listView ? "flex w-full items-center justify-between gap-1 px-4 py-4" : "aspect-square w-full p-2 md:w-42 xl:w-50"} rounded-sm border-2 border-aurora-gray-1100 bg-aurora-gray-1400 hover:border-aurora-gray-900 data-[active=true]:border-aurora-gray-600 `}
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
                    data-active={activeLevel?.level_id === level.level_id}
                    onpointerdown={() => {
                      activeLevel = level;
                      creatingGame = false;
                    }}
                    class={`${listView ? "w-full items-center justify-between gap-1 px-4 py-4 md:flex" : "aspect-square w-full p-2 md:block md:w-42 xl:w-50"} hidden rounded-sm border-2 border-aurora-gray-1100 bg-aurora-gray-1400 hover:border-aurora-gray-900 data-[active=true]:border-aurora-gray-600`}
                  >
                    <h3 class={`${listView ? "text-left" : "mx-auto text-center"} wrap-break-word`}>
                      {level.name}
                    </h3>
                  </button>
                {/each}
              {/if}
            </div>
            {#if !listView && ((showGames && filteredGames.length > pageSize) || (!showGames && filteredLevels.length > pageSize))}
              <div class="flex items-center gap-8 self-center">
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
          />
        {/if}
      </div>
    {:else}
      <StyledButton
        class="absolute top-0 bottom-36 m-auto h-min w-40 border-2"
        label="Play"
        onclick={() => (pressedPlay = true)}
      />
    {/if}
  </div>
</StyledMain>
