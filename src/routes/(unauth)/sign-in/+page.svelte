<script lang="ts">
  import discordLogo from "#lib/assets/discord-logo.svg";
  import ErrorDialog from "#lib/components/ErrorDialog.svelte";
  import StyledButton from "#lib/components/StyledButton.svelte";
  import StyledCard from "#lib/components/StyledCard.svelte";
  import StyledInput from "#lib/components/StyledInput.svelte";
  import StyledMain from "#lib/components/StyledMain.svelte";
  import StyledSeparator from "#lib/components/StyledSeparator.svelte";
  import { enhance } from "$app/forms";
  import { resolve } from "$app/paths";
  import type { PageProps } from "./$types";

  let { data, form }: PageProps = $props();
</script>

<svelte:head>
  <title>Sign In - OpenDungeon</title>
</svelte:head>

<StyledMain>
  <StyledCard class="flex w-full max-w-96 flex-col items-center gap-6 p-6">
    {#if data.discordAuthUrl}
      <a
        tabindex={0}
        rel="external"
        href={data.discordAuthUrl.toString()}
        class="flex w-full cursor-pointer justify-center gap-4 rounded-xl bg-discord-blurple py-4 select-none hover:bg-discord-blurple/80"
      >
        <img alt="discord" src={discordLogo} width={32} height={32} />
        Sign In With Discord
      </a>
      <div class="grid w-full justify-items-center gap-2">
        <StyledSeparator class="w-full" />
        <span class="text-sm text-aurora-gray-200">Or</span>
        <StyledSeparator class="w-full" />
      </div>
    {/if}
    <form method="POST" action="?/signin" class="mb-2 grid w-full gap-4 px-4" use:enhance>
      <div class="grid gap-2">
        <StyledInput name="email" type="email" placeholder="Email" />
        <StyledInput name="password" type="password" placeholder="Password" />
      </div>
      <StyledButton label="Sign In" />
    </form>
    {#if data.registrationAllowed}
      <p class="text-center text-aurora-gray-700">
        Don't have an account?

        <a href={resolve("register")} class="text-aurora-gray-300 underline">Register here.</a>
      </p>
    {/if}
  </StyledCard>
  <ErrorDialog isActive={form?.success === false} message={form?.message} cause={form?.cause} />
</StyledMain>
