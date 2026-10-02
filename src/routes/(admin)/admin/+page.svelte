<script lang="ts">
  import StyledButton from "$lib/components/StyledButton.svelte";
  import StyledCard from "$lib/components/StyledCard.svelte";
  import StyledFileUpload from "$lib/components/StyledFileUpload.svelte";
  import StyledInput from "$lib/components/StyledInput.svelte";
  import StyledMain from "$lib/components/StyledMain.svelte";
  import { FileUpload } from "melt/builders";

  const fileUpload = new FileUpload();
</script>

<StyledMain>
  <StyledCard class="w-full h-full max-w-[800px] px-4 py-6 grid content-start gap-4 md:px-8">
    <h2>Create Cell Texture</h2>
    <form method="POST" action="?/createcelltexture" enctype="multipart/form-data" class="grid">
      <StyledInput name="key" type="text" placeholder="Key (e.g. 'castle.rug.edge')" />
      <StyledInput name="display-name" type="text" placeholder="Display Name" />
      <StyledFileUpload
        {fileUpload}
        label="Texture"
        icon="material-symbols:image-outline-rounded"
      />
      <StyledButton label="Submit" />
    </form>
  </StyledCard>
</StyledMain>
