<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { getSimplifiedTimeSince } from "#lib/utils.js";
  import Icon from "@iconify/svelte";
  import StyledButton from "./StyledButton.svelte";
  import StyledCard from "./StyledCard.svelte";
  import StyledInput from "./StyledInput.svelte";
  import type { ClassValue } from "svelte/elements";
  import type { Level } from "#lib/server/database/levels.js";
  import type { Profile } from "#lib/server/database/profiles.js";
  import type { GameWithPlayerProfiles } from "#lib/server/database/games.js";
  import ProfileList from "./ProfileList.svelte";
  import type { FriendProfile } from "#lib/server/database/friends.js";

  type Props = {
    profile: Profile;
    friends: FriendProfile[];
    creatingGame: boolean;
    activeGame: GameWithPlayerProfiles | null;
    activeLevel: Level | null;
    onClose: () => void;
    class?: ClassValue;
  };

  let {
    profile,
    friends,
    creatingGame,
    activeGame,
    activeLevel,
    onClose,
    class: customClass,
  }: Props = $props();

  let showAddBar = $state(false);
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
            showAddBar = !showAddBar;
          }}
          class="rounded bg-aurora-gray-1000 px-2 hover:bg-aurora-gray-800"
          >{`${showAddBar ? "Cancel" : "Add"}`}</button
        >
      </div>
      {#if showAddBar}
        <ProfileList
          profiles={friends.filter(
            (friend) => !activeGame.players.find((p) => p.user_id === friend.user_id),
          )}
          activeGameId={activeGame.game_id}
          emptyText="You have no friends..."
          actions={[
            {
              icon: "akar-icons:circle-check-fill",
              color: "text-success",
              formAction: "addplayer",
            },
          ]}
          class="rounded border border-aurora-gray-1000"
        />
      {/if}
      <ProfileList profiles={activeGame.players} class="rounded border border-aurora-gray-1000" />
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
          <form
            method="POST"
            action="?/deletegame"
            class={`cursor-pointer justify-items-center rounded-lg border border-aurora-gray-800  bg-danger/50 text-center hover:bg-danger ${showConfirmation ? "flex-1" : "flex-2"}`}
          >
            <input name="game-id" type="hidden" value={activeGame.game_id} />
            {#if showConfirmation}
              <button class="size-full py-2">Confirm</button>
            {:else}
              <button class="size-full py-2" onclick={() => (showConfirmation = true)}
                >Delete Game</button
              >
            {/if}
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
        <form
          method="POST"
          action="?/deletelevel"
          class={`grid cursor-pointer justify-items-center rounded-lg border border-aurora-gray-800 bg-danger/50 text-center hover:bg-danger ${showConfirmation ? "flex-1" : "flex-2"}`}
        >
          <input name="level-id" type="hidden" value={activeLevel.level_id} />
          {#if showConfirmation}
            <button class="size-full py-2">Confirm</button>
          {:else}
            <button
              class="size-full py-2"
              onclick={() => {
                showConfirmation = true;
              }}>Delete Level</button
            >
          {/if}
        </form>
      </div>
    </div>
  {/if}
</StyledCard>
