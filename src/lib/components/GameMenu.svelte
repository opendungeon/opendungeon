<script lang="ts" module>
  export type Message =
    | { isSystemMessage: false; userId: string; message: string }
    | { isSystemMessage: true; heading: string; subheading?: string };
</script>

<script lang="ts">
  import { PLAYER_COLOR_LINEAR, type PlayerColor } from "#lib/colors.ts";
  import ProfileList from "#lib/components/ProfileList.svelte";
  import { GameMenuTab } from "#lib/game/index.ts";
  import type { Character } from "#lib/server/database/characters.ts";
  import type { FriendProfile } from "#lib/server/database/friends.ts";
  import type { Level } from "#lib/server/database/levels.ts";
  import type { GameMaster, GamePlayer } from "#lib/server/games/index.ts";
  import { getInitials } from "#lib/utils.ts";
  import { enhance } from "$app/forms";
  import DynamicModelViewer from "./DynamicModelViewer.svelte";
  import StyledButton from "./StyledButton.svelte";
  import Icon from "@iconify/svelte";
  import { Avatar } from "melt/components";

  const menuTabs = [
    { title: "Chat", tab: GameMenuTab.Chat },
    { title: "Players", tab: GameMenuTab.Players },
    { title: "Levels", tab: GameMenuTab.Levels },
    { title: "Characters", tab: GameMenuTab.Characters },
    { title: "Settings", tab: GameMenuTab.Settings },
  ];

  type Props = {
    active: boolean;
    gameId: string;
    isGameMaster: boolean;
    messages: Message[];
    levels: Level[];
    players: Record<string, GameMaster | GamePlayer>;
    characters: Character[];
    friends: FriendProfile[];
    selectedCharacterId: string | null;
    onChat: (message: string) => void;
    onCommand: (command: string, args: string[]) => void;
    onLoadLevel: (levelId: string) => void;
    onLeaveGame: () => void;
    onDeleteCharacter: (characterId: string) => void;
    onSelectCharacter: (characterId: string | null) => void;
    onToggleDraggingCharacter: (characterId: string) => void;
  };

  let {
    active,
    gameId,
    isGameMaster,
    messages,
    levels,
    characters,
    players,
    friends,
    selectedCharacterId,
    onChat,
    onCommand,
    onLoadLevel,
    onLeaveGame,
    onDeleteCharacter,
    onSelectCharacter,
    onToggleDraggingCharacter,
  }: Props = $props();

  let selectedTab = $state(GameMenuTab.Chat);
  let chatContainer = $state<HTMLUListElement>();
  let chatInput = $state<HTMLInputElement>();
  let characterInput = $state<HTMLInputElement>();

  $effect(() => {
    void messages.length;
    chatContainer?.scrollTo({ top: chatContainer.scrollHeight });
  });

  function getPlayerColor(userId: string): PlayerColor | "red" {
    const player = players[userId];
    const color = player.isGameMaster ? "red" : (player as unknown as { color: PlayerColor }).color;
    return color;
  }
</script>

<div
  data-active={active}
  class="absolute top-32 right-6 bottom-32 z-20 hidden data-[active=true]:flex w-xs flex-col rounded-sm border-2 border-aurora-gray-400 bg-black"
>
  <div class="flex w-full flex-row justify-evenly border-b-2 border-aurora-gray-400">
    {#each menuTabs as { tab, title }, i (i)}
      {#if (tab === GameMenuTab.Levels || tab === GameMenuTab.Characters) && !isGameMaster}
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
    <div
      data-active={selectedTab == GameMenuTab.Chat}
      class="hidden data-[active=true]:flex flex-col flex-1"
    >
      <ul
        bind:this={chatContainer}
        class="z-10 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 py-2"
      >
        {#each messages as message, i (i)}
          {#if message.isSystemMessage}
            <li
              class="flex min-w-0 flex-col gap-2 rounded-sm bg-aurora-gray-1300 p-2 wrap-break-word text-white"
            >
              <div class="flex flex-col text-sm">
                <p>{message.heading}</p>
                {#if message.subheading}
                  <p class="text-aurora-gray-600">{message.subheading}</p>
                {/if}
              </div>
            </li>
          {:else}
            <li
              class="flex min-w-0 flex-col gap-2 rounded-sm bg-aurora-gray-1200 p-2 wrap-break-word text-white"
            >
              <div class="flex flex-row items-center gap-2">
                <div
                  class="h-8 w-8 items-center rounded-full border-2 border-aurora-gray-600 bg-aurora-gray-1400 text-center"
                >
                  <Avatar
                    src={!players[message.userId].avatarUri
                      ? ""
                      : `/api/media/${players[message.userId].avatarUri}`}
                  >
                    {#snippet children(avatar)}
                      <img {...avatar.image} alt="Avatar" class="w-full-h-full rounded-full" />
                      <span {...avatar.fallback} class="-mt-1 text-lg">
                        {getInitials(players[message.userId].username)}
                      </span>
                    {/snippet}
                  </Avatar>
                </div>
                <h3 class="text-lg">{players[message.userId].username}</h3>
              </div>
              <p>{message.message}</p>
            </li>
          {/if}
        {/each}
      </ul>
      <form
        onsubmit={(event) => {
          event.preventDefault();

          const target = event.target! as HTMLFormElement;
          const data = new FormData(target);
          const message = String(data.get("message")).trim();
          if (!message) {
            return;
          }

          if (message.startsWith("/")) {
            const [command, ...args] = message.replace("/", "").split(/\s+/);
            onCommand(command, args);
          } else {
            onChat(message);
          }

          target.reset();

          chatInput?.blur();
        }}
        class="flex shrink-0 flex-col gap-3 border-t-2 border-aurora-gray-400 bg-aurora-gray-1200 px-4 py-6"
      >
        <input
          bind:this={chatInput}
          type="text"
          name="message"
          placeholder="Type something..."
          maxlength={256}
          autocomplete="off"
          onkeydown={(event) => {
            if (event.key === "Escape") {
              chatInput?.blur();
            }
          }}
          class="w-full self-center rounded-sm border-2 border-aurora-gray-600 bg-aurora-gray-1300 px-1.5 py-2 backdrop-blur-xs duration-100 focus:border-aurora-gray-200 focus:outline-hidden"
        />
        <button
          class="relative grid w-min cursor-pointer justify-items-center self-end rounded-xl border-2 border-aurora-gray-600 bg-aurora-gray-1300 px-4 py-1.5 text-center duration-100 hover:bg-aurora-gray-1200 active:bg-aurora-gray-1100"
        >
          Send
        </button>
      </form>
    </div>

    <div
      data-active={selectedTab === GameMenuTab.Players}
      class="hidden data-[active=true]:flex flex-col gap-4 py-4"
    >
      <h3 class="self-center text-2xl">Players</h3>
      <div
        class="flex max-h-64 flex-col gap-4 overflow-y-auto border-b border-aurora-gray-1000 p-4"
      >
        <ul class="flex flex-col gap-4 overflow-y-auto">
          {#each Object.values(players) as player, i (i)}
            <li
              data-online={player.online}
              class="flex flex-row items-center rounded-md bg-aurora-gray-1200 p-2 text-white data-[online=false]:opacity-50"
            >
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
              </div>
            </li>
          {/each}
        </ul>
      </div>
      {#if isGameMaster}
        <ProfileList
          profiles={friends.filter((friend) => !players[friend.user_id])}
          emptyText="No friends to add..."
          activeGameId={gameId}
          actions={[
            {
              icon: "akar-icons:circle-check-fill",
              color: "text-success",
              formAction: (userId) => {
                fetch(`/api/games/${gameId}/players`, {
                  method: "POST",
                  body: JSON.stringify({ userId }),
                });
              },
            },
          ]}
          label="Add Players"
          class="text-center"
        />
      {/if}
    </div>
    <div
      data-active={isGameMaster && selectedTab === GameMenuTab.Levels}
      class="hidden data-[active=true]:flex flex-col gap-4 p-4"
    >
      <h3 class="self-center text-2xl">Levels</h3>
      <ul class="flex flex-col gap-4">
        {#each levels as level, i (i)}
          <li
            class="rounded-md bg-aurora-gray-1100 text-white duration-100 hover:bg-aurora-gray-1000 active:bg-aurora-gray-900"
          >
            <button
              class="size-full w-full cursor-pointer py-3 wrap-break-word"
              onclick={() => onLoadLevel(level.level_id)}
            >
              {level.name}
            </button>
          </li>
        {/each}
      </ul>
    </div>
    <div
      data-active={isGameMaster && selectedTab === GameMenuTab.Characters}
      class="hidden data-[active=true]:flex flex-col gap-4 p-4 overflow-y-hidden"
    >
      <h3 class="self-center text-2xl">Characters</h3>
      <form
        method="POST"
        action="?/createCharacter"
        enctype="multipart/form-data"
        use:enhance
        class="flex gap-2"
      >
        <input
          bind:this={characterInput}
          type="text"
          placeholder="Character Name"
          name="name"
          autocomplete="off"
          onkeydown={(event) => {
            if (event.key === "Escape") {
              characterInput?.blur();
            }
          }}
          class="w-full self-center rounded-sm border-2 border-aurora-gray-600 bg-aurora-gray-1300 px-1.5 py-2 backdrop-blur-xs duration-100 focus:border-aurora-gray-200 focus:outline-hidden"
        />
        <StyledButton label="Create" class="w.min px-4" />
      </form>
      <ul class="flex flex-col gap-4 overflow-y-auto px-2">
        {#each characters as character, i (i)}
          <li class="flex flex-row gap-4 items-center justify-between">
            <div class="flex flex-row gap-4 items-center">
              <!-- TODO: Use character model uri -->
              <DynamicModelViewer
                modelUri="/human.male.glb"
                width={64}
                height={64}
                defaultMaterial={{
                  name: "color.solid",
                  baseColorFactor: PLAYER_COLOR_LINEAR[getPlayerColor(character.user_id)],
                  alphaMode: "BLEND",
                  alphaCutoff: 0,
                  doubleSided: false,
                }}
                onpointerdown={() => onToggleDraggingCharacter(character.character_id)}
                onpointerup={() => onToggleDraggingCharacter(character.character_id)}
                onclick={() => {
                  if (selectedCharacterId === character.character_id) {
                    onSelectCharacter(null);
                  } else {
                    onSelectCharacter(character.character_id);
                  }
                }}
                autoRotate
                data-selected={selectedCharacterId === character.character_id}
                class="size-16 rounded border-2 border-aurora-gray-800 hover:border-aurora-gray-100 data-[selected=true]:border-aurora-gray-100"
              />
              {character.name}
            </div>
            <div class="flex flex-row gap-4 items-center">
              <StyledButton
                label="Delete"
                onclick={() => onDeleteCharacter(character.character_id)}
                class="px-2"
              />
            </div>
          </li>
        {/each}
      </ul>
    </div>
    <div
      data-active={selectedTab === GameMenuTab.Settings}
      class="hidden data-[active=true]:flex flex-col gap-4 p-4"
    >
      <button
        class="size-full cursor-pointer rounded-md bg-aurora-gray-1100 py-3 text-white duration-100 hover:bg-aurora-gray-1000 active:bg-aurora-gray-900"
        onclick={onLeaveGame}>Leave Game</button
      >
    </div>
  </div>
</div>
