<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { getInitials, getSimplifiedTimeSince } from "#lib/utils.js";
  import Icon from "@iconify/svelte";
  import { Avatar } from "melt/components";
  import StyledButton from "./StyledButton.svelte";
  import StyledCard from "./StyledCard.svelte";
  import StyledInput from "./StyledInput.svelte";
  import type { ClassValue } from "svelte/elements";
  import type { Level } from "#lib/server/database/levels.js";
  import type { Profile } from "#lib/server/database/profiles.js";
  import type { GameWithPlayerProfiles } from "#lib/server/database/games.js";

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

    showInviteBar = false;
    showConfirmation = false;
  });
</script>

<StyledCard
  class={[
    "mx-auto flex h-fit flex-col justify-start gap-4 px-4 pt-10 pb-6 md:w-70 md:gap-8",
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
          class="rounded bg-aurora-gray-1000 px-2 hover:bg-aurora-gray-800"
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
        class="flex max-h-40 flex-col gap-4 overflow-y-auto rounded-sm border border-aurora-gray-800 p-4"
      >
        <ul class="flex flex-col gap-4">
          {#each activeGame.players as profile, i (i)}
            <li class="flex flex-row items-center rounded-md bg-aurora-gray-1200 p-2 text-white">
              <div class="flex flex-row items-center gap-2">
                <div
                  class="h-8 w-8 items-center rounded-full border-2 border-aurora-gray-600 bg-aurora-gray-1400 text-center"
                >
                  <Avatar src={!profile.avatar_uri ? "" : `/api/media/${profile.avatar_uri}`}>
                    {#snippet children(avatar)}
                      <img {...avatar.image} alt="Avatar" class="w-full-h-full rounded-full" />
                      <span {...avatar.fallback} class="-mt-1 text-lg">
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
        onclick={() => goto(resolve(`games/${activeGame!.game_id}`))}
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
              class={`cursor-pointer justify-items-center rounded-lg border border-aurora-gray-800  bg-danger/50 py-2 text-center hover:bg-danger ${showConfirmation ? "flex-1" : "flex-2"}`}
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
        onclick={() => goto(resolve(`level-editor/${activeLevel!.level_id}`))}
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
            class={`grid cursor-pointer justify-items-center rounded-lg border border-aurora-gray-800 bg-danger/50 py-2 text-center hover:bg-danger ${showConfirmation ? "flex-1" : "flex-2"}`}
          >
            {showConfirmation ? "Confirm" : "Delete Level"}
          </button>
        </form>
      </div>
    </div>
  {/if}
</StyledCard>
