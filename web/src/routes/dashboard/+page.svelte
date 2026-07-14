<script lang="ts">
  import { resolve } from "$app/paths";
  import { auth } from "$lib/api.svelte";
</script>

<h1>Dashboard</h1>
<p>Welcome back, {auth.profile!.username}.</p>
<ul>
  <li>
    <a href={resolve("/level-editor")}>Level Editor</a>
  </li>
</ul>
