<script lang="ts">
  import { addToast } from "$lib/components/Toaster.svelte";
  import { Avatar, Popover } from "melt/components";
  import { callAPI, getMediaUrl } from "$lib/api";
  import StyledSeparator from "$lib/components/StyledSeparator.svelte";
  import { invalidateAll } from "$app/navigation";
  import { resolve } from "$app/paths";
  import StyledCard from "$lib/components/StyledCard.svelte";
  import type { LayoutProps } from "./$types";
  import { getInitials } from "$lib/utils";

  let { data, children }: LayoutProps = $props();
  let isProfileMenuOpen = $state(false);

  async function handleSignOut() {
    const res = await callAPI(fetch, "POST", "/auth/sign-out");
    if (!res.ok) {
      addToast({
        data: { title: "Sign Out Failed", description: res.error.message, level: "danger" },
      });
      return;
    }

    await invalidateAll();
  }
</script>

{#if data.isSignedIn && !!data.profile}
  <div class="fixed top-2 right-2 z-20 lg:right-6">
    <Popover open={isProfileMenuOpen}>
      {#snippet children(popover)}
        <button
          {...popover.trigger}
          class="grid bg-aurora-gray-1400/75 rounded-full w-12 h-12 text-center items-center cursor-pointer border-2 border-aurora-gray-1000 duration-300 hover:border-aurora-gray-600"
        >
          <Avatar src={!data.profile.avatarId ? "" : getMediaUrl(data.profile.avatarId)}>
            {#snippet children(avatar)}
              <img {...avatar.image} alt="Avatar" class="w-full-h-full rounded-full" />
              <span {...avatar.fallback} class="text-2xl -mt-1">
                {getInitials(data.profile.username)}
              </span>
            {/snippet}
          </Avatar>
        </button>
        <StyledCard {...popover.content} class="text-white p-4 min-w-[200px]">
          <div class="grid gap-2">
            <p>{data.profile.username}</p>
            <StyledSeparator />
            <a
              href={resolve("/me/edit")}
              class="text-aurora-gray-700 duration-300 hover:text-aurora-gray-500">Edit Profile</a
            >
            <StyledSeparator />
            <button onclick={handleSignOut} class="text-danger cursor-pointer"> Sign Out </button>
          </div>
        </StyledCard>
      {/snippet}
    </Popover>
  </div>
{/if}
{@render children()}
