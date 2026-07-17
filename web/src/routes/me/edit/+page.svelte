<script lang="ts">
  import { api, callAPI, upsertMyProfile } from "$lib/api.svelte";
  import StyledButton from "$lib/components/StyledButton.svelte";
  import StyledCard from "$lib/components/StyledCard.svelte";
  import StyledInput from "$lib/components/StyledInput.svelte";
  import StyledMain from "$lib/components/StyledMain.svelte";
  import StyledSeparator from "$lib/components/StyledSeparator.svelte";
  import { FileUpload } from "melt/builders";
  import Icon from "@iconify/svelte";
  import { addToast } from "$lib/components/Toaster.svelte";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";

  let username = $state("");
  const fileUpload = new FileUpload();

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();

    const body = new FormData();
    body.append("username", username);

    if (fileUpload.selected) {
      body.append("avatar", fileUpload.selected);
    }

    const res = await callAPI(fetch, "PUT", "/profiles/me", { body });
    if (!res.ok) {
      addToast({ data: { title: "Edit Failed", description: res.error.message, level: "danger" } });
      return;
    }

    if (!api.profile) {
      api.profile = await res.data.json();
      await goto(resolve("/dashboard"));
    }
  }

  const GIGABYTE = 1_000_000_000;
  const MEGABYTE = 1_000_000;
  const KILOBYTE = 1_000;
  function abbreviateBytes(bytes: number): string {
    if (bytes >= 100 * MEGABYTE) {
      return `${(bytes / GIGABYTE).toFixed(1)} GB`;
    }

    if (bytes >= 100 * KILOBYTE) {
      return `${(bytes / MEGABYTE).toFixed(1)} MB`;
    }

    if (bytes >= 100) {
      return `${(bytes / KILOBYTE).toFixed(1)} KB`;
    }

    return `${bytes} B`;
  }
</script>

<svelte:head>
  <title>Edit Profile - OpenDungeon</title>
</svelte:head>

<StyledMain>
  <StyledCard class="max-w-96 w-full px-4 py-6 grid gap-6 md:px-8">
    {#if api.profile}
      <a
        href={resolve("/dashboard")}
        class="text-aurora-gray-700 underline duration-300 hover:text-aurora-gray-500">Exit</a
      >
      <StyledSeparator />
    {/if}
    <h1 class="text-2xl text-center font-semibold text-aurora-gray-600">
      {api.profile ? "Edit" : "Create"} Profile
    </h1>
    <StyledSeparator />
    <form onsubmit={handleSubmit} class="grid gap-6">
      <div class="grid gap-1">
        <label for="avatar" class="text-lg text-aurora-gray-700">Avatar</label>
        <input name="avatar" {...fileUpload.input} />
        {#if !fileUpload.selected}
          <div
            {...fileUpload.dropzone}
            class="group grid gap-2 justify-items-center bg-aurora-gray-1300/75 py-8 px-4 rounded border border-aurora-gray-1200 backdrop-blur-xs text-center text-aurora-gray-700 cursor-pointer duration-300 hover:text-aurora-gray-600 hover:border-aurora-gray-1100 hover:bg-aurora-gray-1200/75"
          >
            <Icon icon="material-symbols:person-rounded" class="text-6xl" />
            {#if fileUpload.isDragging}
              Drop files here
            {:else}
              <p><span class="text-aurora-gray-200">Click to upload</span> or drag and drop</p>
            {/if}
          </div>
        {:else}
          <div
            class="flex justify-between bg-aurora-gray-1300/75 p-4 rounded border border-aurora-gray-1200 text-aurora-gray-700 backdrop-blur-xs"
          >
            <div>
              <p class="text-aurora-gray-200">{fileUpload.selected.name}</p>
              <p class="text-sm">{abbreviateBytes(fileUpload.selected.size)}</p>
            </div>
            <button
              onclick={() => fileUpload.remove(fileUpload.selected!)}
              class="cursor-pointer duration-300 hover:text-danger"
            >
              <Icon icon="material-symbols:close-rounded" aria-hidden="true" class="text-4xl" />
              <span class="sr-only">remove</span>
            </button>
          </div>
        {/if}
      </div>
      <StyledSeparator />
      <StyledInput bind:value={username} type="text" placeholder="Username" />
      <StyledButton label="Save" />
    </form>
  </StyledCard>
</StyledMain>
