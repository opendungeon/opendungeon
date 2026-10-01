<script lang="ts">
  import StyledButton from "$lib/components/StyledButton.svelte";
  import StyledCard from "$lib/components/StyledCard.svelte";
  import StyledInput from "$lib/components/StyledInput.svelte";
  import StyledMain from "$lib/components/StyledMain.svelte";
  import StyledSeparator from "$lib/components/StyledSeparator.svelte";
  import StyledFileUpload from "$lib/components/StyledFileUpload.svelte";
</script>

<svelte:head>
  <title>Create Profile - OpenDungeon</title>
</svelte:head>

<StyledMain>
  <StyledCard class="max-w-96 w-full px-4 py-6 grid gap-6 md:px-8">
    <h1 class="text-2xl text-center font-semibold text-aurora-gray-600">Create Profile</h1>
    <StyledSeparator />
    <form method="POST" action="?/createprofile" enctype="multipart/form-data" class="grid gap-6">
      <StyledFileUpload label="Avatar" icon="material-symbols:person-rounded" />
      <StyledSeparator />
      <StyledInput name="username" type="text" placeholder="Username" />
      <StyledButton label="Save" />
    </form>
  </StyledCard>
</StyledMain>
