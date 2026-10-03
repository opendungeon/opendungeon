<script lang="ts">
  import { getInitials } from "#lib/utils.js";
  import Icon from "@iconify/svelte";
  import { Avatar } from "melt/components";
  import type { ClassValue } from "svelte/elements";

  type ActionButton = {
    icon: string;
    /** Tailwind text color class, e.g. "text-danger" */
    color: string;
    formAction: string;
  };

  type Props = {
    friends: { friend_id: string; user_id: string; username: string; avatar_uri: string | null }[];
    label?: string;
    emptyText?: string;
    actions?: ActionButton[];
    class?: ClassValue;
  };

  let { label, friends, actions, emptyText, class: customClass }: Props = $props();
</script>

<div class={["relative flex max-h-48 min-h-24 flex-col overflow-y-auto", customClass]}>
  {#if label}<span>{label}</span>{/if}
  {#if friends.length > 0}
    <div class="flex flex-col gap-4 rounded-sm p-4">
      <ul class="flex flex-col items-start gap-4">
        {#each friends as friend, i (i)}
          <li
            class="flex w-full flex-row items-center justify-between gap-2 text-white md:gap-4 md:pr-4 lg:justify-center"
          >
            <div class="flex w-48 flex-row items-center gap-2 rounded-md bg-aurora-gray-1200 p-2">
              <div
                class="flex h-10 w-10 items-center justify-center rounded-full bg-aurora-gray-1400 text-center"
              >
                <Avatar src={!friend.avatar_uri ? "" : `/api/media/${friend.avatar_uri}`}>
                  {#snippet children(avatar)}
                    <img {...avatar.image} alt="Avatar" class="w-full-h-full rounded-full" />
                    <span {...avatar.fallback} class="text-lg">
                      {getInitials(friend.username)}
                    </span>
                  {/snippet}
                </Avatar>
              </div>
              <h3 class="text-md">{friend.username}</h3>
            </div>
            {#each actions as action, j (j)}
              <form method="POST" action="?/{action.formAction}">
                <input name="friend-id" type="hidden" value={friend.friend_id} />
                <button>
                  <Icon
                    icon={action.icon}
                    width={28}
                    height={28}
                    class="{action.color} size-full p-1 duration-150 hover:p-0"
                  />
                </button>
              </form>
            {/each}
          </li>
        {/each}
      </ul>
    </div>
  {:else if emptyText}
    <span
      class="absolute top-0 right-0 bottom-0 left-0 self-center text-center text-aurora-gray-800"
      >{emptyText}</span
    >
  {/if}
</div>
