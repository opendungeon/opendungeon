<script lang="ts">
  import type { HTMLInputAttributes } from "svelte/elements";

  type Props = HTMLInputAttributes;

  let { value = $bindable(""), class: customClass, ...props }: Props = $props();
</script>

<input
  {...props}
  bind:value
  class={[
    "bg-aurora-gray-1300 py-2 px-4 rounded border border-aurora-gray-1100 backdrop-blur-xs focus:outline-hidden focus:border-aurora-gray-600",
    customClass,
  ]}
/>
