<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { callAPI } from "$lib/api.svelte";
  import StyledButton from "$lib/components/StyledButton.svelte";
  import StyledCard from "$lib/components/StyledCard.svelte";
  import StyledInput from "$lib/components/StyledInput.svelte";
  import StyledMain from "$lib/components/StyledMain.svelte";
  import StyledSeparator from "$lib/components/StyledSeparator.svelte";
  import { addToast } from "$lib/components/Toaster.svelte";

  let email = $state("");
  let password = $state("");
  let confirmPassword = $state("");

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();

    const body = new FormData();
    body.append("email", email);
    body.append("password", password);
    body.append("confirmPassword", confirmPassword);

    const res = await callAPI(fetch, "POST", "/admin/register", { body });
    if (!res.ok) {
      addToast({
        data: { title: "Registration Failed", description: res.error.message, level: "danger" },
      });
      return;
    }

    await goto(resolve("/dashboard"));
  }
</script>

<svelte:head>
  <title>Setup - OpenDungeon</title>
</svelte:head>

<StyledMain>
  <StyledCard class="grid px-4 py-6 max-w-96 w-full gap-6">
    <h1 class="text-2xl text-center font-semibold text-aurora-gray-600">Create Admin Account</h1>
    <StyledSeparator />
    <form onsubmit={handleSubmit} class="grid gap-4">
      <div class="grid gap-2">
        <StyledInput bind:value={email} type="email" placeholder="Email" />
        <StyledInput bind:value={password} type="password" placeholder="Password" />
        <StyledInput bind:value={confirmPassword} type="password" placeholder="Confirm Password" />
      </div>
      <StyledButton label="Create" />
    </form>
    <p class="text-sm text-aurora-gray-800 text-center">
      Admin accounts are required to use email and password. If you'd like to sign in with Discord
      later, use the same email as your Discord account.
    </p>
  </StyledCard>
</StyledMain>
