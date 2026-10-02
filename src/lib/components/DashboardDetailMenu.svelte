<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { getInitials, getSimplifiedTimeSince } from "$lib/utils";
  import Icon from "@iconify/svelte";
  import StyledButton from "./StyledButton.svelte";
  import StyledCard from "./StyledCard.svelte";
  import StyledInput from "./StyledInput.svelte";
  import type { ClassValue } from "svelte/elements";
  import type { Level } from "$lib/server/database/levels";
  import type { Profile } from "$lib/server/database/profiles";
  import type { GameWithPlayerProfiles } from "$lib/server/database/games";

  type Props = {
    profile: Profile;
    creatingGame: boolean;
    activeGame: GameWithPlayerProfiles | null;
    activeLevel: Level | null;
    onClose: () => void;
    class?: ClassValue;
  };

  let {
    profile,
    creatingGame,
    activeGame,
    activeLevel,
    onClose,
    class: customClass,
  }: Props = $props();

  let showInviteBar = $state(false);
  let showConfirmation = $state(false);

  $effect(() => {
    void activeGame;
    void activeLevel;

    showAddBar = false;
    showConfirmation = false;
  });
</script>

<StyledCard
  class={[
    "mx-auto h-fit px-4 pb-6 pt-10 flex flex-col justify-start gap-4 md:gap-8 md:w-70",
    customClass,
  ]}
>
  <button class="absolute top-2 right-2 p-1" onclick={onClose}
    ><Icon icon="bytesize:close" width={18} height={18} /></button
  >
  {#if creatingGame}
    <form method="POST" action="?/creategame" class="flex flex-col gap-8">
      <StyledInput name="name" placeholder="Game name" autocomplete="off" />
      <StyledButton label="Create Game" />
    </form>
  {:else if activeGame}
    <div>
      <h3 class="text-xl wrap-break-word">{activeGame.name}</h3>
      <span class="text-aurora-gray-600">
        Created by {activeGame.players.find(
          (profile) => profile.user_id === activeGame?.game_master_id,
        )?.username}
      </span>
    </div>

    <div class="flex flex-col gap-3">
      <div class="flex justify-between">
        <h4 class="text-lg">Players</h4>
        <button
          onclick={() => {
            showInviteBar = !showInviteBar;
          }}
          class="bg-aurora-gray-1000 hover:bg-aurora-gray-800 rounded px-2"
          >{`${showInviteBar ? "Cancel" : "Invite"}`}</button
        >
      </div>
      {#if showInviteBar}
        <form method="POST" action="?/inviteplayer" class="flex flex-col gap-2 px-2">
          <input name="game-id" type="hidden" value={activeGame.game_id} />
          <StyledInput name="user-id" placeholder="Player Id" autocomplete="off" />
          <StyledButton class="" label="Confirm" />
        </form>
      {/if}
      <div
        class="p-4 flex flex-col gap-4 overflow-y-auto border rounded-sm border-aurora-gray-800 max-h-40"
      >
        <ul class="flex flex-col gap-4">
          {#each activeGame.players as profile, i (i)}
            <li class="text-white flex flex-row items-center bg-aurora-gray-1200 p-2 rounded-md">
              <div class="flex flex-row gap-2 items-center">
                <div
                  class="w-8 h-8 bg-aurora-gray-1400 rounded-full text-center items-center border-2 border-aurora-gray-600"
                >
                  <Avatar src={!profile.avatar_uri ? "" : `/api/media/${profile.avatar_uri}`}>
                    {#snippet children(avatar)}
                      <img {...avatar.image} alt="Avatar" class="w-full-h-full rounded-full" />
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
        onclick={() => goto(resolve(`/games/${activeGame!.game_id}`))}
      />
      {#if profile.user_id === activeGame.game_master_id}
        <div class="flex gap-2">
          {#if showConfirmation}
            <StyledButton
              class={` ${showConfirmation ? "flex-1" : ""}`}
              onclick={() => (showConfirmation = false)}
              label="Cancel"
            />
          {/if}
          <form method="POST" action="?/deletegame">
            <input name="game-id" type="hidden" value={activeGame.game_id} />
            <button
              class={`justify-items-center cursor-pointer rounded-lg py-2 text-center  border border-aurora-gray-800 bg-danger/50 hover:bg-danger ${showConfirmation ? "flex-1" : "flex-2"}`}
            >
              {showConfirmation ? "Confirm" : "Delete Game"}
            </button>
          </form>
        </div>
      {/if}
    </div>
  {:else if activeLevel}
    <div>
      <h3 class="text-xl wrap-break-word">{activeLevel.name}</h3>
      <span class="text-aurora-gray-600"
        >{`${activeLevel.updated_at !== activeLevel.created_at ? "Updated" : "Created"} ${getSimplifiedTimeSince(activeLevel.updated_at, new Date())}`}</span
      >
    </div>
    <div class="flex flex-col gap-2">
      <StyledButton
        label="Edit Level"
        onclick={() => goto(resolve(`/level-editor/${activeLevel!.level_id}`))}
      />
      <div class="flex gap-2">
        {#if showConfirmation}
          <StyledButton
            class={` ${showConfirmation ? "flex-1" : ""}`}
            onclick={() => (showConfirmation = false)}
            label="Cancel"
          />
        {/if}
        <form method="POST" action="?/deletelevel">
          <input name="level-id" type="hidden" value={activeLevel.level_id} />
          <button
            class={`grid justify-items-center cursor-pointer rounded-lg py-2 text-center border border-aurora-gray-800 bg-danger/50 hover:bg-danger ${showConfirmation ? "flex-1" : "flex-2"}`}
          >
            {showConfirmation ? "Confirm" : "Delete Level"}
          </button>
        </form>
      </div>
    </div>
  {/if}
</StyledCard>
