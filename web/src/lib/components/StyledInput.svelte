<script lang="ts">
  import type { HTMLInputAttributes } from "svelte/elements";

  type Props = HTMLInputAttributes;

  let { value = $bindable(""), class: customClass, ...props }: Props = $props();
</script>

<input
  {...props}
  bind:value
  class={[
    "bg-aurora-gray-1300/75 py-2 px-4 rounded border border-aurora-gray-1200 backdrop-blur-xs focus:outline-hidden",
    customClass,
  ]}
/>
