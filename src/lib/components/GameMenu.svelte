<script lang="ts" module>
  export type Message =
    | { isSystemMessage: false; userId: string; message: string }
    | { isSystemMessage: true; heading: string; subheading?: string };
</script>

<script lang="ts">
  import GameCharacterList from "#lib/components/GameCharacterList.svelte";
  import GameChat from "#lib/components/GameChat.svelte";
  import GameLevelList from "#lib/components/GameLevelList.svelte";
  import GamePlayerList from "#lib/components/GamePlayerList.svelte";
  import type { Character } from "#lib/server/database/characters.ts";
  import type { FriendProfile } from "#lib/server/database/friends.ts";
  import type { Level } from "#lib/server/database/levels.ts";
  import type { GameMaster, GamePlayer, Measurement } from "#lib/server/games/index.ts";
  import Icon from "@iconify/svelte";

  const measureTabs: { shape: Measurement["shape"]; icon: string }[] = [
    {
      shape: "path",
      icon: "boxicons:path",
    },
    {
      shape: "line",
      icon: "ant-design:line-outlined",
    },
    {
      shape: "square",
      icon: "akar-icons:square",
    },
    {
      shape: "circle",
      icon: "akar-icons:circle",
    },
    {
      shape: "cone",
      icon: "fluent:cone-16-regular",
    },
  ];

  const menuTabs = [
    { title: "Chat", tab: "game-icons:chat-bubble", gmOnly: false },
    { title: "Players", tab: "game-icons:tabletop-players", gmOnly: false },
    { title: "Levels", tab: "game-icons:treasure-map", gmOnly: true },
    { title: "Characters", tab: "game-icons:character", gmOnly: true },
    { title: "Settings", tab: "game-icons:cog", gmOnly: false },
  ];

  type Props = {
    active: boolean;
    selectedTab: number;
    gameId: string;
    isGameMaster: boolean;
    messages: Message[];
    levels: Level[];
    players: Record<string, GameMaster | GamePlayer>;
    characters: Character[];
    friends: FriendProfile[];
    selectedCharacterId: string | null;
    chatInput: HTMLInputElement;
    measureShape: Measurement["shape"];
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
    selectedTab = $bindable(),
    chatInput = $bindable(),
    measureShape = $bindable(),
    onChat,
    onCommand,
    onLoadLevel,
    onLeaveGame,
    onDeleteCharacter,
    onSelectCharacter,
    onToggleDraggingCharacter,
  }: Props = $props();
</script>

<aside
  data-active={active}
  class="absolute inset-y-32 right-6 z-20 hidden grid-rows-[minmax(0,1fr)_auto] gap-2 data-[active=true]:grid"
>
  <div
    data-active={active}
    class="flex w-xs flex-col rounded-sm border-2 border-aurora-gray-400 bg-black"
  >
    <div class="flex w-full flex-row justify-evenly border-b-2 border-aurora-gray-400">
      {#each menuTabs as { tab, title, gmOnly }, i (i)}
        <button
          {title}
          data-active={selectedTab === i}
          data-visible={!gmOnly || isGameMaster}
          class="hidden w-full items-center justify-center border-r-2 border-aurora-gray-400 bg-aurora-gray-1100 py-1 duration-100 last:border-r-0 hover:bg-aurora-gray-700 data-[active=true]:bg-aurora-gray-600 data-[visible=true]:flex"
          onpointerdown={() => (selectedTab = i)}
        >
          <span class="sr-only">{tab}</span>
          <Icon icon={tab} width={36} height={36} />
        </button>
      {/each}
    </div>
    <div class="relative flex min-h-0 flex-1 flex-col bg-aurora-gray-1400">
      <GameChat
        {messages}
        {players}
        {onChat}
        {onCommand}
        bind:chatInput
        active={selectedTab === 0}
      />
      <GamePlayerList {friends} {gameId} {isGameMaster} {players} active={selectedTab === 1} />
      <GameLevelList {levels} {onLoadLevel} active={isGameMaster && selectedTab === 2} />
      <GameCharacterList
        {characters}
        {selectedCharacterId}
        {onDeleteCharacter}
        {onSelectCharacter}
        {onToggleDraggingCharacter}
        active={isGameMaster && selectedTab === 3}
      />
      <div
        data-active={selectedTab === 4}
        class="hidden flex-col gap-4 p-4 data-[active=true]:flex"
      >
        <button
          class="size-full cursor-pointer rounded-md bg-aurora-gray-1100 py-3 text-white duration-100 hover:bg-aurora-gray-1000 active:bg-aurora-gray-900"
          onclick={onLeaveGame}>Leave Game</button
        >
      </div>
    </div>
  </div>
  <ul class="grid grid-cols-5 gap-1">
    {#each measureTabs as { shape, icon }, i (i)}
      <li class="grid">
        <button
          data-active={shape === measureShape}
          onpointerdown={() => (measureShape = shape)}
          class="grid aspect-square place-items-center rounded-md border-2 border-aurora-gray-400 bg-aurora-gray-1200 p-2 duration-150 hover:bg-aurora-gray-1000 data-[active=true]:bg-aurora-gray-800"
        >
          <span class="sr-only">{shape}</span>
          <Icon {icon} width={24} height={24} />
        </button>
      </li>
    {/each}
  </ul>
</aside>
