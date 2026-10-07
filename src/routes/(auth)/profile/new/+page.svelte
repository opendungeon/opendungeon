<script lang="ts">
  import StyledButton from "#lib/components/StyledButton.svelte";
  import StyledCard from "#lib/components/StyledCard.svelte";
  import StyledInput from "#lib/components/StyledInput.svelte";
  import StyledMain from "#lib/components/StyledMain.svelte";
  import StyledSeparator from "#lib/components/StyledSeparator.svelte";
  import StyledFileUpload from "#lib/components/StyledFileUpload.svelte";
  import { FileUpload } from "melt/builders";
  import type { PageProps } from "./$types";

  let { form }: PageProps = $props();

  const fileUpload = new FileUpload({
    accept: ".jpg, .jpeg, .png, .webp, .heic",
    maxSize: 10 * 1024 * 1024, // 10 MB, it will get crunched down to 128x128
  });
</script>

<svelte:head>
  <title>Create Profile - OpenDungeon</title>
</svelte:head>

<StyledMain>
  <StyledCard class="grid w-full max-w-96 gap-6 px-4 py-6 md:px-8">
    <h1 class="text-center text-2xl font-semibold text-aurora-gray-600">Create Profile</h1>
    <StyledSeparator />
    {#if form?.success === false}
      <div>{form.message ?? "An unknown error occurred."}</div>
    {/if}
    <form method="POST" action="?/createprofile" enctype="multipart/form-data" class="grid gap-6">
      <StyledFileUpload {fileUpload} label="Avatar" icon="material-symbols:person-rounded" />
      <StyledSeparator />
      <StyledInput required name="username" type="text" placeholder="Username" />
      <StyledButton label="Save" />
    </form>
  </StyledCard>
</StyledMain>
