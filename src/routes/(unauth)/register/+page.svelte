<script lang="ts">
  import { resolve } from "$app/paths";
  import StyledButton from "$lib/components/StyledButton.svelte";
  import StyledCard from "$lib/components/StyledCard.svelte";
  import StyledInput from "$lib/components/StyledInput.svelte";
  import StyledMain from "$lib/components/StyledMain.svelte";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
</script>

<svelte:head>
  <title>Register - OpenDungeon</title>
</svelte:head>

<StyledMain>
  <StyledCard class="px-4 py-6 max-w-96 w-full">
    {#if data.discordAuthUrl}
      <a rel="external" href={data.discordAuthUrl.toString()}>Sign In With Discord</a>
    {/if}
    <form method="POST" action="?/register" class="grid gap-4 mb-2">
      <div class="grid gap-2">
        <StyledInput name="email" autocomplete="off" type="email" placeholder="Email" />
        <StyledInput
          name="password"
          autocomplete="new-password"
          type="password"
          placeholder="Password"
        />
        <StyledInput
          name="confirmPassword"
          autocomplete="new-password"
          type="password"
          placeholder="Confirm Password"
        />
      </div>
      <StyledButton label="Register" />
    </form>
    <p class="text-aurora-gray-700 text-center">
      Already have an account?
      <a href={resolve("/sign-in")} class="text-aurora-gray-300 underline">Sign in here.</a>
    </p>
  </StyledCard>
</StyledMain>
