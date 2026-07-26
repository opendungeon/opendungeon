<script lang="ts">
  import { callAPI } from "$lib/api";
  import StyledButton from "$lib/components/StyledButton.svelte";
  import StyledCard from "$lib/components/StyledCard.svelte";
  import StyledFileUpload from "$lib/components/StyledFileUpload.svelte";
  import StyledInput from "$lib/components/StyledInput.svelte";
  import StyledMain from "$lib/components/StyledMain.svelte";
  import { addToast } from "$lib/components/Toaster.svelte";

  let key = $state("");
  let displayName = $state("");
  let file = $state(null);

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();

    if (!file) {
      addToast({
        data: {
          title: "Texture Required",
          description: "You must select a texture image.",
          level: "danger",
        },
      });
      return;
    }

    const body = new FormData();
    body.append("key", key);
    body.append("displayName", displayName);
    body.append("file", file);

    const res = await callAPI(fetch, "POST", "/admin/cell-textures", { body });
    if (!res.ok) {
      addToast({
        data: { title: "Upload Failed", description: res.error.message, level: "danger" },
      });
      return;
    }

    addToast({
      data: {
        title: "Success",
        description: "Successfully created cell texture.",
        level: "success",
      },
    });
  }
</script>

<StyledMain>
  <StyledCard class="w-full h-full max-w-[800px] px-4 py-6 grid content-start gap-4 md:px-8">
    <h2>Create Cell Texture</h2>
    <form class="grid" onsubmit={handleSubmit}>
      <StyledInput bind:value={key} placeholder="Key (e.g. 'castle.rug.edge')" />
      <StyledInput bind:value={displayName} placeholder="Display Name" />
      <StyledFileUpload
        bind:value={file}
        label="Texture"
        icon="material-symbols:image-outline-rounded"
      />
      <StyledButton label="Submit" />
    </form>
  </StyledCard>
</StyledMain>
