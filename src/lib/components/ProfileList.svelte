<script lang="ts">
  import type { Profile } from "#lib/server/database/profiles.js";
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
    profiles: Omit<Profile, "profile_id">[];
    label?: string;
    emptyText?: string;
    actions?: ActionButton[];
    activeGameId?: string;
    class?: ClassValue;
  };

  let { label, profiles, actions, emptyText, activeGameId, class: customClass }: Props = $props();
</script>

<div class={["relative flex max-h-48 min-h-24 flex-col overflow-y-auto", customClass]}>
  {#if label}<span>{label}</span>{/if}
  {#if profiles.length > 0}
    <div class="flex flex-col gap-4 rounded-sm p-4">
      <ul class="flex flex-col items-start gap-4">
        {#each profiles as profile, i (i)}
          <li
            class="flex w-full flex-row items-center justify-between gap-2 text-white md:gap-4 md:pr-4 lg:justify-center"
          >
            <div class="flex w-48 flex-row items-center gap-2 rounded-md bg-aurora-gray-1200 p-2">
              <div
                class="flex h-10 w-10 items-center justify-center rounded-full bg-aurora-gray-1400 text-center"
              >
                <Avatar src={!profile.avatar_uri ? "" : `/api/media/${profile.avatar_uri}`}>
                  {#snippet children(avatar)}
                    <img {...avatar.image} alt="Avatar" class="w-full-h-full rounded-full" />
                    <span {...avatar.fallback} class="text-lg">
                      {getInitials(profile.username)}
                    </span>
                  {/snippet}
                </Avatar>
              </div>
              <h3 class="text-md">{profile.username}</h3>
            </div>
            {#each actions as action, j (j)}
              <form method="POST" action={`?/${action.formAction}`}>
                <input name="game-id" type="hidden" value={activeGameId} />
                <input name="user-id" type="hidden" value={profile.user_id} />
                <button class="size-8 duration-150">
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
