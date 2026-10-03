<script lang="ts">
  import { resolve } from "$app/paths";
  import StyledButton from "#lib/components/StyledButton.svelte";
  import StyledCard from "#lib/components/StyledCard.svelte";
  import StyledInput from "#lib/components/StyledInput.svelte";
  import StyledMain from "#lib/components/StyledMain.svelte";
  import StyledSeparator from "#lib/components/StyledSeparator.svelte";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
</script>

<svelte:head>
  <title>Sign In - OpenDungeon</title>
</svelte:head>

<StyledMain>
  <StyledCard class="w-full max-w-96 px-4 py-6">
    {#if data.discordAuthUrl}
      <a rel="external" href={data.discordAuthUrl.toString()}>Sign In With Discord</a>
    {/if}
    <StyledSeparator class="my-6" />
    <form method="POST" action="?/signin" class="mb-2 grid gap-4">
      <div class="grid gap-2">
        <StyledInput name="email" type="email" placeholder="Email" />
        <StyledInput name="password" type="password" placeholder="Password" />
      </div>
      <StyledButton label="Sign In" />
    </form>
    <p class="text-center text-aurora-gray-700">
      Don't have an account?

      <a href={resolve("register")} class="text-aurora-gray-300 underline">Register here.</a>
    </p>
  </StyledCard>
</StyledMain>
