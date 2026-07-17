<script lang="ts">
  import "./layout.css";
  import favicon from "$lib/assets/favicon.svg";
  import Toaster, { addToast } from "$lib/components/Toaster.svelte";
  import { Avatar, Popover } from "melt/components";
  import { api, getAvatarUrl, signOut } from "$lib/api.svelte";
  import StyledSeparator from "$lib/components/StyledSeparator.svelte";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import StyledCard from "$lib/components/StyledCard.svelte";

  let { children } = $props();
  let isProfileMenuOpen = $state(false);

  function getInitials(name: string): string {
    return name
      .split(" ")
      .filter((chunk) => chunk.length >= 1)
      .map(([letter]) => letter)
      .join("");
  }

  async function handleSignOut() {
    const res = await signOut();
    if (!res.ok) {
      addToast({
        data: { title: "Sign Out Failed", description: res.error.message, level: "danger" },
      });
      return;
    }

    api.isSignedIn = "no";
    api.profile = null;
    await goto(resolve("/sign-in"));
  }
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <title>OpenDungeon</title>
</svelte:head>

{#if api.isSignedIn === "yes" && !!api.profile}
  <div class="fixed top-2 right-2 z-20 lg:right-6">
    <Popover open={isProfileMenuOpen}>
      {#snippet children(popover)}
        <button
          {...popover.trigger}
          class="grid bg-aurora-gray-1400/75 rounded-full w-12 h-12 text-center items-center cursor-pointer border border-aurora-gray-1200 duration-300 hover:border-aurora-gray-1000"
        >
          <Avatar src={!api.profile?.avatar ? "" : getAvatarUrl(api.profile.avatar)}>
            {#snippet children(avatar)}
              <img {...avatar.image} alt="Avatar" class="w-full-h-full rounded-full" />
              <span {...avatar.fallback} class="text-2xl -mt-1">
                {!api.profile ? "?" : getInitials(api.profile.username)}
              </span>
            {/snippet}
          </Avatar>
        </button>
        <StyledCard {...popover.content} class="text-white p-4 min-w-[200px]">
          <div class="grid gap-2">
            <p>{api.profile?.username ?? "[username]"}</p>
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

<div class="h-full bg-linear-to-br from-aurora-magenta-900 to-aurora-magenta-1000">
  {@render children()}
</div>

<Toaster />
