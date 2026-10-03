<script lang="ts">
  import Icon from "@iconify/svelte";
  import type { GameMessage } from "#lib/game/index.js";
  import { Avatar } from "melt/components";
  import { getInitials } from "#lib/utils.js";
  import { GameMenuTab } from "#lib/game/index.js";
  import type { Level } from "#lib/server/database/levels.js";
  import type { Character } from "#lib/server/database/characters.js";
  import type { GamePlayer } from "#lib/server/live/state.js";

  const menuTabs = [
    { title: "Chat", tab: GameMenuTab.Chat },
    { title: "Players", tab: GameMenuTab.Players },
    { title: "Levels", tab: GameMenuTab.Levels },
    { title: "Characters", tab: GameMenuTab.Characters },
    { title: "Settings", tab: GameMenuTab.Settings },
  ];

  type Props = {
    gameName: string;
    isGameMaster: boolean;
    messages: (GameMessage | string)[];
    levels: Level[];
    players: Record<string, Omit<GamePlayer, "userId">>;
    characters: Character[];
    handleSendChatMessage: (event: SubmitEvent) => void;
    handleLoadLevel: (levelId: string) => void;
    handleLeaveGame: () => void;
    handleSendLoadCharacter: (characterId: string) => void;
  };

  let {
    gameName,
    isGameMaster,
    messages,
    levels,
    players,
    characters,
    handleSendChatMessage,
    handleLoadLevel,
    handleLeaveGame,
    handleSendLoadCharacter,
  }: Props = $props();

  let selectedTab = $state(GameMenuTab.Chat);
  let message = $state<string>("");
  let chatContainer = $state<HTMLUListElement>();
  let messageInput = $state<HTMLInputElement>();

  $effect(() => {
    void messages.length;
    chatContainer?.scrollTo({ top: chatContainer.scrollHeight });
  });
</script>

<div
  class="absolute top-32 right-6 bottom-32 z-10 flex w-xs flex-col rounded-sm border-2 border-aurora-gray-400 bg-black"
>
  <div class="flex w-full flex-row justify-evenly border-b-2 border-aurora-gray-400">
    {#each menuTabs as { tab, title }, i (i)}
      {#if tab === GameMenuTab.Levels && !isGameMaster}
        {null}
      {:else}
        <button
          {title}
          data-active={selectedTab === tab}
          data-borderActive={i !== Object.values(GameMenuTab).length - 1}
          class="flex w-full items-center justify-center border-aurora-gray-400 bg-aurora-gray-1100 py-1 duration-100 hover:bg-aurora-gray-700 data-[active=true]:bg-aurora-gray-600 data-[borderActive=true]:border-r-2"
          onpointerdown={() => (selectedTab = tab)}
        >
          <span class="sr-only">{tab}</span>
          <Icon icon={tab} width={36} height={36} />
        </button>
      {/if}
    {/each}
  </div>
  <div class="relative flex min-h-0 flex-1 flex-col bg-aurora-gray-1400">
    {#if selectedTab == GameMenuTab.Chat}
      <ul
        bind:this={chatContainer}
        class="z-10 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 py-2"
      >
        {#each messages as message, i (i)}
          {#if typeof message === "string"}
            <li class="min-w-0 wrap-break-word text-white">{message}</li>
          {:else}
            <li
              class="flex min-w-0 flex-col gap-2 rounded-sm bg-aurora-gray-1200 p-2 wrap-break-word text-white"
            >
              <div class="flex flex-row items-center gap-2">
                <div
                  class="h-8 w-8 items-center rounded-full border-2 border-aurora-gray-600 bg-aurora-gray-1400 text-center"
                >
                  <Avatar src={!message.avatarUri ? "" : `/api/media/${message.avatarUri}`}>
                    {#snippet children(avatar)}
                      <img {...avatar.image} alt="Avatar" class="w-full-h-full rounded-full" />
                      <span {...avatar.fallback} class="-mt-1 text-lg">
                        {getInitials(message.username)}
                      </span>
                    {/snippet}
                  </Avatar>
                </div>
                <h3 class="text-lg">{message.username}</h3>
              </div>
              <p class="">{message.content}</p>
            </li>
          {/if}
        {/each}
      </ul>
      <form
        onsubmit={(event) => {
          event.preventDefault();
          handleSendChatMessage(event);
          messageInput!.value = "";
          message = "";
          messageInput?.focus();
        }}
        class="flex shrink-0 flex-col gap-3 border-t-2 border-aurora-gray-400 bg-aurora-gray-1200 px-4 py-6"
      >
        <input
          bind:this={messageInput}
          type="text"
          name="message"
          placeholder="Type something..."
          bind:value={message}
          maxlength={256}
          autocomplete="off"
          class="w-full self-center rounded-sm border-2 border-aurora-gray-600 bg-aurora-gray-1300 px-1.5 py-2 backdrop-blur-xs duration-100 focus:border-aurora-gray-200 focus:outline-hidden"
        />
        <button
          class="relative grid w-min cursor-pointer justify-items-center self-end rounded-xl border-2 border-aurora-gray-600 bg-aurora-gray-1300 px-4 py-1.5 text-center duration-100 hover:bg-aurora-gray-1200 active:bg-aurora-gray-1100"
        >
          Send
        </button>
      </form>
    {/if}
    {#if selectedTab === GameMenuTab.Players}
      {#if isGameMaster}
        <form
          method="POST"
          action="?/inviteplayer"
          class="flex shrink-0 flex-col gap-4 border-b-2 border-aurora-gray-400 bg-aurora-gray-1200 px-2 py-3"
        >
          <input
            type="text"
            placeholder="Player ID"
            name="invitee"
            autocomplete="off"
            maxlength={36}
            class="rounded border border-aurora-gray-600 bg-aurora-gray-1300 px-4 py-2 backdrop-blur-xs duration-100 focus:border-aurora-gray-400 focus:outline-hidden"
          />
          <button
            class="relative grid w-min cursor-pointer justify-items-center self-start rounded-xl border-2 border-aurora-gray-600 bg-aurora-gray-1300 px-4 py-1.5 text-center duration-100 hover:bg-aurora-gray-1200 active:bg-aurora-gray-1100"
            >Invite</button
          >
        </form>
      {/if}

      <div class="flex flex-col gap-4 overflow-y-auto p-4">
        <ul class="flex flex-col gap-4 overflow-y-auto">
          {#each Object.values(players) as player, i (i)}
            <li class="flex flex-row items-center rounded-md bg-aurora-gray-1200 p-2 text-white">
              <div class="flex flex-row items-center gap-2">
                <div
                  class="h-8 w-8 items-center rounded-full border-2 border-aurora-gray-600 bg-aurora-gray-1400 text-center"
                >
                  <Avatar src={!player.avatarUri ? "" : `/api/media/${player.avatarUri}`}>
                    {#snippet children(avatar)}
                      <img {...avatar.image} alt="Avatar" class="w-full-h-full rounded-full" />
                      <span {...avatar.fallback} class="-mt-1 text-lg">
                        {getInitials(player.username)}
                      </span>
                    {/snippet}
                  </Avatar>
                </div>
                <h3 class="text-lg">{player.username}</h3>
                <span class="text-sm text-green-500">online</span>
              </div>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
    {#if isGameMaster && selectedTab === GameMenuTab.Levels}
      <div class="flex flex-col gap-4 p-4">
        <h3 class="self-center text-2xl">Levels</h3>
        <ul class="flex flex-col gap-4">
          {#each levels as level, i (i)}
            <li
              class="rounded-md bg-aurora-gray-1100 text-white duration-100 hover:bg-aurora-gray-1000 active:bg-aurora-gray-900"
            >
              <button
                class="size-full w-full cursor-pointer py-3 wrap-break-word"
                onclick={() => handleLoadLevel(level.level_id)}
              >
                {level.name}
              </button>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
    {#if selectedTab === GameMenuTab.Characters}
      <div class="flex flex-col gap-4 p-4">
        <h3 class="self-center text-2xl">Characters</h3>
        <ul class="flex flex-col gap-4">
          {#each characters as character, i (i)}
            <li
              class="rounded-md bg-aurora-gray-1100 text-white duration-100 hover:bg-aurora-gray-1000 active:bg-aurora-gray-900"
            >
              <button
                class="size-full w-full cursor-pointer py-3 wrap-break-word"
                onclick={() => handleSendLoadCharacter(character.character_id)}
              >
                {character.name}
              </button>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
    {#if selectedTab === GameMenuTab.Settings}
      <div class="flex flex-col gap-4 p-4">
        <h3 class="w-full self-center text-2xl wrap-break-word">{gameName}</h3>
        <button
          class="size-full cursor-pointer rounded-md bg-aurora-gray-1100 py-3 text-white duration-100 hover:bg-aurora-gray-1000 active:bg-aurora-gray-900"
          onclick={handleLeaveGame}>Leave Game</button
        >
      </div>
    {/if}
  </div>
</div>
