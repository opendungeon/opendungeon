<script lang="ts">
  import { resolve } from "$app/paths";
  import StyledButton from "$lib/components/StyledButton.svelte";
  import StyledCard from "$lib/components/StyledCard.svelte";
  import StyledInput from "$lib/components/StyledInput.svelte";
  import StyledMain from "$lib/components/StyledMain.svelte";
  import StyledSeparator from "$lib/components/StyledSeparator.svelte";
</script>

<svelte:head>
  <title>Sign In - OpenDungeon</title>
</svelte:head>

<StyledMain>
  <StyledCard class="px-4 py-6 max-w-96 w-full">
    <StyledSeparator class="my-6" />
    <form method="POST" action="?/signin" class="grid gap-4 mb-2">
      <div class="grid gap-2">
        <StyledInput name="email" type="email" placeholder="Email" />
        <StyledInput name="password" type="password" placeholder="Password" />
      </div>
      <StyledButton label="Sign In" />
    </form>
    <p class="text-aurora-gray-700 text-center">
      Don't have an account?
      <a href={resolve("/register")} class="text-aurora-gray-300 underline"> Register here. </a>
    </p>
  </StyledCard>
</StyledMain>
