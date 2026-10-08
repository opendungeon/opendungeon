<script lang="ts">
  import StyledCard from "#lib/components/StyledCard.svelte";
  import StyledMain from "#lib/components/StyledMain.svelte";
  import type { PageProps } from "./$types";

  const { data, form }: PageProps = $props();
</script>

<StyledMain>
  <StyledCard class="grid h-full w-full max-w-[800px] content-start gap-4 px-4 py-6 md:px-8">
    {#if form?.success}
      <div class="text-green-500">Configuration updated successfully.</div>
    {/if}
    <form method="POST" action="?/toggleusercreation" class="flex justify-between">
      <div>
        <label for="enable-user-creation">Enable User Registration</label>
        <input
          name="enable-user-creation"
          type="checkbox"
          checked={form ? form.isUserCreationEnabled : data.configuration.isUserCreationEnabled}
        />
      </div>
      <button>Submit</button>
    </form>
  </StyledCard>
</StyledMain>
