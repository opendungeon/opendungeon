<script lang="ts">
  import { upsertMyProfile } from "$lib/api.svelte";

  let username = $state("");

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();

    const res = await upsertMyProfile(username);
    if (!res.ok) {
      console.error(res.error.message);
    }
  }
</script>

<h1>Edit Me</h1>
<form onsubmit={handleSubmit}>
  <label>
    Username
    <input bind:value={username} type="text" />
  </label>
  <input type="submit" value="Save" />
</form>
