<script lang="ts">
  import { getMediaUrl, type APILevel, type APIProfile } from "$lib/api";
  import Icon from "@iconify/svelte";
  import type { GameMessage } from "$lib/messages";
  import { Avatar } from "melt/components";
  import { getInitials } from "$lib/utils";

  type Props = {
    isGameMaster: boolean;
    messages: GameMessage[];
    levels: APILevel[];
    players: Record<string, string>;
    profiles: APIProfile[];
    handleSendChatMessage: (event: SubmitEvent) => void;
    handleInvitePlayer: (event: SubmitEvent) => void;
    handleLoadLevel: (levelId: string) => void;
    handleLeaveGame: () => void;
  };

  const tabs = {
    chat: "material-symbols:chat",
    players: "material-symbols:person",
    levels: "material-symbols:map-outline",
    settings: "material-symbols:settings",
  };

  let {
    isGameMaster,
    messages,
    levels,
    players,
    profiles,
    handleSendChatMessage,
    handleInvitePlayer,
    handleLoadLevel,
    handleLeaveGame,
  }: Props = $props();

  let selectedTab = $state(tabs.chat);
  let invitee = $state<string>("");
  let message = $state<string>("");
  let chatContainer = $state<HTMLUListElement>();
  let messageInput = $state<HTMLInputElement>();

  $effect(() => {
    void messages.length;
    chatContainer?.scrollTo({ top: chatContainer.scrollHeight });
  });
</script>

<div
  class="absolute top-32 right-6 bottom-32 z-10 bg-black border-2 border-white rounded-sm w-xs flex flex-col"
>
  <div class="flex flex-row w-full justify-evenly border-b-2 border-white">
    {#each Object.values(tabs) as tab, i (i)}
      {#if tab === tabs.levels && !isGameMaster}
        {null}
      {:else}
        <button
          data-active={selectedTab === tab}
          data-borderActive={i !== Object.entries(tabs).length - 1}
          class="flex items-center justify-center bg-aurora-gray-1100 hover:bg-aurora-gray-700 data-[active=true]:bg-aurora-gray-600 w-full py-1 data-[borderActive=true]:border-r-2 border-white"
          onmousedown={() => (selectedTab = tab)}
          ><Icon icon={tab} width={36} height={36} />
        </button>
      {/if}
    {/each}
  </div>
  <div class="relative flex-1 flex flex-col min-h-0 bg-aurora-gray-1400">
    {#if selectedTab == tabs.chat}
      <ul
        bind:this={chatContainer}
        class="z-10 flex flex-col gap-2 flex-1 min-h-0 overflow-y-auto px-2 py-2"
      >
        {#each messages as message, i (i)}
          {#if message.isSystemMessage}
            <li class="text-white min-w-0 wrap-break-word">{message.content}</li>
          {:else}
            <li
              class="text-white bg-aurora-gray-1200 rounded-sm p-2 min-w-0 wrap-break-word flex flex-col gap-2"
            >
              <div class="flex flex-row gap-2 items-center">
                <div
                  class="w-8 h-8 bg-aurora-gray-1400 rounded-full text-center items-center border-2 border-aurora-gray-800/75"
                >
                  <Avatar
                    src={!message.playerProfile.avatarId
                      ? ""
                      : getMediaUrl(message.playerProfile.avatarId)}
                  >
                    {#snippet children(avatar)}
                      <img {...avatar.image} alt="Avatar" class="w-full-h-full rounded-full" />
                      <span {...avatar.fallback} class="text-lg -mt-1">
                        {getInitials(message.playerProfile.username)}
                      </span>
                    {/snippet}
                  </Avatar>
                </div>
                <h3 class="text-lg">{message.playerProfile.username}</h3>
              </div>
              <p class="">{message.content}</p>
            </li>
          {/if}
        {/each}
      </ul>
      <form
        onsubmit={(event) => {
          handleSendChatMessage(event);
          messageInput!.value = "";
          message = "";
          messageInput?.focus();
        }}
        class="shrink-0 flex flex-row justify-center gap-4 py-8 border-t-2 border-white bg-aurora-gray-1200"
      >
        <input
          bind:this={messageInput}
          type="text"
          name="message"
          placeholder="Type something..."
          bind:value={message}
          maxlength={256}
          autocomplete="off"
          class="bg-aurora-gray-1300 py-2 px-4 w-50 rounded border border-aurora-gray-800 focus:border-aurora-gray-400 backdrop-blur-xs focus:outline-hidden"
        />
        <button
          class="grid justify-items-center cursor-pointer rounded-lg py-2 px-1 text-center border bg-aurora-gray-1300 hover:bg-aurora-gray-1200 active:bg-aurora-gray-1100"
        >
          Send
        </button>
      </form>
    {/if}
    {#if selectedTab === tabs.players}
      {#if isGameMaster}
        <form
          onsubmit={handleInvitePlayer}
          class="shrink-0 flex flex-row justify-evenly py-8 border-b-2 border-white bg-aurora-gray-1200"
        >
          <input
            type="text"
            placeholder="Player ID"
            name="invitee"
            bind:value={invitee}
            autocomplete="off"
            maxlength={36}
            class="bg-aurora-gray-1300 py-2 px-4 rounded border border-aurora-gray-800 focus:border-aurora-gray-400 backdrop-blur-xs focus:outline-hidden"
          />
          <button
            class="grid justify-items-center cursor-pointer rounded-lg py-2 px-1 text-center border bg-aurora-gray-1300 hover:bg-aurora-gray-1200 active:bg-aurora-gray-1100"
            >Invite</button
          >
        </form>
      {/if}

      <div class="p-4 flex flex-col gap-4 overflow-y-auto">
        <h3 class="text-2xl">Players</h3>
        <ul class="flex flex-col gap-4 overflow-y-auto">
          {#each profiles as profile, i (i)}
            <li class="text-white flex flex-row items-center bg-aurora-gray-1200 p-2 rounded-md">
              <div class="flex flex-row gap-2 items-center">
                <div
                  class="w-8 h-8 bg-aurora-gray-1400 rounded-full text-center items-center border-2 border-aurora-gray-800/75"
                >
                  <Avatar src={!profile.avatarId ? "" : getMediaUrl(profile.avatarId)}>
                    {#snippet children(avatar)}
                      <img {...avatar.image} alt="Avatar" class="w-full-h-full rounded-full" />
                      <span {...avatar.fallback} class="text-lg -mt-1">
                        {getInitials(profile.username)}
                      </span>
                    {/snippet}
                  </Avatar>
                </div>
                <h3 class="text-lg">{profile.username}</h3>
                {#if Object.entries(players).find(([, name]) => name === profile.username)?.[0]}
                  <span class="text-sm text-green-500">online</span>
                {:else}
                  <span class="text-sm text-aurora-gray-800">offline</span>
                {/if}
              </div>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
    {#if isGameMaster && selectedTab === tabs.levels}
      <div class="flex flex-col gap-4 p-4">
        <h3 class="text-2xl">Levels</h3>
        <ul class="flex flex-col gap-4">
          {#each levels as level, i (i)}
            <li
              class="text-white bg-aurora-gray-1200 hover:bg-aurora-gray-1100 active:bg-aurora-gray-1000 rounded-md"
            >
              <button
                class="cursor-pointer size-full py-3"
                onclick={() => handleLoadLevel(level.id)}
              >
                {level.name}
              </button>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
    {#if selectedTab === tabs.settings}
      <div class="p-4">
        <button
          class="text-white bg-aurora-gray-1200 hover:bg-aurora-gray-1100 active:bg-aurora-gray-1000 rounded-md size-full py-3 cursor-pointer"
          onclick={handleLeaveGame}>Leave Game</button
        >
      </div>
    {/if}
  </div>
</div>
