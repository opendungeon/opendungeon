<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { register } from "$lib/api.svelte";

  let email = $state("");
  let password = $state("");

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();

    const res = await register(email, password);
    if (res.ok) {
      await goto(resolve("/dashboard"));
      return;
    }

    // TODO: toast or something
    console.error(res.error.message);
  }
</script>

<svelte:head>
  <title>Register - OpenDungeon</title>
</svelte:head>

<h1>Register</h1>
<form onsubmit={handleSubmit} class="grid">
  <label>
    Email
    <input bind:value={email} type="email" />
  </label>
  <label>
    Password
    <input bind:value={password} type="password" />
  </label>
  <!-- TODO: actually do password confirmation -->
  <label>
    Confirm Password
    <input type="password" />
  </label>
  <input type="submit" value="Register" class="cursor-pointer" />
</form>
