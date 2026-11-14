<script lang="ts">
  import ProfileList from "#lib/components/ProfileList.svelte";
  import type { FriendProfile } from "#lib/server/database/friends.ts";
  import type { GameMaster, GamePlayer } from "#lib/server/games/index.ts";
  import { getInitials } from "#lib/utils.ts";
  import { Avatar } from "melt/components";

  type Props = {
    active: boolean;
    friends: FriendProfile[];
    gameId: string;
    isGameMaster: boolean;
    players: Record<string, GameMaster | GamePlayer>;
  };

  let { active, friends, gameId, isGameMaster, players }: Props = $props();
</script>

<div data-active={active} class="hidden flex-col gap-4 py-4 data-[active=true]:flex">
  <h3 class="self-center text-2xl">Players</h3>
  <div class="flex max-h-64 flex-col gap-4 overflow-y-auto border-b border-aurora-gray-1000 p-4">
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
