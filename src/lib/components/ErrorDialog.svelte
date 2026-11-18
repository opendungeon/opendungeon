<script lang="ts">
  import StyledButton from "./StyledButton.svelte";

  type Props = {
    isActive: boolean;
    message?: string;
    cause?: string;
  };

  let { isActive, message, cause }: Props = $props();

  let showDialog = $derived(isActive);
</script>

<svelte:window
  onkeydown={(event) => {
    if (event.key === "Escape") {
      showDialog = false;
    }
  }}
/>

<div
  data-active={showDialog}
  class="invisible absolute top-0 right-0 bottom-0 left-0 z-20 size-full bg-aurora-gray-1200/80 duration-0 data-[active=true]:visible data-[active=true]:bg-aurora-gray-1400/80 data-[active=true]:duration-250"
></div>
<div
  data-active={showDialog}
  class="absolute top-0 right-0 bottom-0 left-0 z-21 m-auto hidden w-72 flex-col gap-4 self-center rounded-sm border-2 border-aurora-gray-800 bg-aurora-gray-1400 p-4 text-center data-[active=true]:flex"
>
  <div class="grid gap-3">
    <h2 class="text-xl">{message ?? "An error occured."}</h2>
    <p class="text-aurora-gray-400">{cause}</p>
  </div>

  <StyledButton onclick={() => (showDialog = false)} label="OK" />
</div>
