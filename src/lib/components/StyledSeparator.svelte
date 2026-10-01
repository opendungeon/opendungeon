<script lang="ts">
  import type { HTMLAttributes } from "svelte/elements";

  let { class: customClass, ...props }: HTMLAttributes<HTMLHRElement> = $props();
</script>

<hr {...props} class={["text-aurora-gray-1200", customClass]} />
