<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { getMediaUrl, type APIGame, type APILevelMetaData, type APIProfile } from "$lib/api";
  import { getInitials, getSimplifiedTimeSince } from "$lib/utils";
  import Icon from "@iconify/svelte";
  import { Avatar } from "melt/components";
  import StyledButton from "./StyledButton.svelte";
  import StyledCard from "./StyledCard.svelte";
  import StyledInput from "./StyledInput.svelte";
  import type { ClassValue } from "svelte/elements";

  type Props = {
    profile: APIProfile;
    creatingGame: boolean;
    activeGame: APIGame | null;
    activeLevel: APILevelMetaData | null;
    handleCreateGame: (event: SubmitEvent) => void;
    handleDeleteGame: () => void;
    handleDeleteLevel: () => void;
    handleInvitePlayer: (event: SubmitEvent) => Promise<boolean>;
    onClose: () => void;
    class?: ClassValue;
  };

  let {
    profile,
    creatingGame,
    activeGame,
    activeLevel,
    handleCreateGame,
    handleDeleteGame,
    handleDeleteLevel,
    handleInvitePlayer,
    onClose,
    class: customClass,
  }: Props = $props();

  let gameName = $state("");
  let invitee = $state("");
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
    "mx-auto h-fit px-4 pb-6 pt-10 flex flex-col justify-start gap-4 md:gap-8 md:w-70",
    customClass,
  ]}
>
  <button class="absolute top-2 right-2 p-1" onclick={onClose}
    ><Icon icon="bytesize:close" width={18} height={18} /></button
  >
  {#if creatingGame}
    <form
      class="flex flex-col gap-8"
      onsubmit={(event) => {
        gameName = "";
        handleCreateGame(event);
      }}
    >
      <StyledInput bind:value={gameName} name="name" placeholder="Game name" autocomplete="off" />
      <StyledButton label="Create Game" />
    </form>
  {:else if activeGame}
    <div>
      <h3 class="text-xl wrap-break-word">{activeGame.name}</h3>
      <span class="text-aurora-gray-600">
        Created by {activeGame.profiles.find((profile) => profile.id === activeGame?.gameMasterId)
          ?.username}
      </span>
    </div>

    <div class="flex flex-col gap-3">
      <div class="flex justify-between">
        <h4 class="text-lg">Players</h4>
        <button
          onclick={() => {
            showInviteBar = !showInviteBar;
            invitee = "";
          }}
          class="bg-aurora-gray-1000 hover:bg-aurora-gray-800 rounded px-2"
          >{`${showInviteBar ? "Cancel" : "Invite"}`}</button
        >
      </div>
      {#if showInviteBar}
        <form
          onsubmit={(event) => {
            handleInvitePlayer(event).then((success) => {
              if (success) {
                showInviteBar = false;
                invitee = "";
              }
            });
          }}
          class="flex flex-col gap-2 px-2"
        >
          <StyledInput
            bind:value={invitee}
            name="userId"
            placeholder="Player Id"
            autocomplete="off"
          />
          <StyledButton class="" label="Confirm" />
        </form>
      {/if}
      <div
        class="p-4 flex flex-col gap-4 overflow-y-auto border rounded-sm border-aurora-gray-800 max-h-40"
      >
        <ul class="flex flex-col gap-4">
          {#each activeGame.profiles as profile, i (i)}
            <li class="text-white flex flex-row items-center bg-aurora-gray-1200 p-2 rounded-md">
              <div class="flex flex-row gap-2 items-center">
                <div
                  class="w-8 h-8 bg-aurora-gray-1400 rounded-full text-center items-center border-2 border-aurora-gray-600"
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
              </div>
            </li>
          {/each}
        </ul>
      </div>
    </div>
    <div class="flex flex-col gap-2">
      <StyledButton label="Join Game" onclick={() => goto(resolve(`/games/${activeGame!.id}`))} />
      {#if profile.id === activeGame.gameMasterId}
        <div class="flex gap-2">
          {#if showConfirmation}
            <StyledButton
              class={` ${showConfirmation ? "flex-1" : ""}`}
              onclick={() => (showConfirmation = false)}
              label="Cancel"
            />
          {/if}
          <button
            class={`justify-items-center cursor-pointer rounded-lg py-2 text-center  border border-aurora-gray-800 bg-danger/50 hover:bg-danger ${showConfirmation ? "flex-1" : "flex-2"}`}
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
        </div>
      {/if}
    </div>
  {:else if activeLevel}
    <div>
      <h3 class="text-xl wrap-break-word">{activeLevel.name}</h3>
      <span class="text-aurora-gray-600"
        >{`${activeLevel.updatedAt !== activeLevel.createdAt ? "Updated" : "Created"} ${getSimplifiedTimeSince(activeLevel.updatedAt, Date.now() / 1000)}`}</span
      >
    </div>
    <div class="flex flex-col gap-2">
      <StyledButton
        label="Edit Level"
        onclick={() => goto(resolve(`/level-editor/${activeLevel!.id}`))}
      />
      <div class="flex gap-2">
        {#if showConfirmation}
          <StyledButton
            class={` ${showConfirmation ? "flex-1" : ""}`}
            onclick={() => (showConfirmation = false)}
            label="Cancel"
          />
        {/if}
        <button
          class={`grid justify-items-center cursor-pointer rounded-lg py-2 text-center border border-aurora-gray-800 bg-danger/50 hover:bg-danger ${showConfirmation ? "flex-1" : "flex-2"}`}
          onclick={() => {
            if (showConfirmation) {
              handleDeleteLevel();
            } else {
              showConfirmation = true;
            }
          }}
        >
          {showConfirmation ? "Confirm" : "Delete Level"}
        </button>
      </div>
    </div>
  {/if}
</StyledCard>
