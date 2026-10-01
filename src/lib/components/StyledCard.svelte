<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLAttributes } from "svelte/elements";

  type Props = HTMLAttributes<HTMLDivElement> & { children: Snippet };

  let { children, class: customClass, ...props }: Props = $props();
</script>

<div
  {...props}
  class={[
    "bg-aurora-gray-1400 rounded-lg border-2 border-aurora-gray-1100 backdrop-blur-xs",
    customClass,
  ]}
>
  {@render children()}
</div>
