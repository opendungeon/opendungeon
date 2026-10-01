<script lang="ts">
  import type { HTMLAnchorAttributes } from "svelte/elements";

  type Props = HTMLAnchorAttributes & {
    label: string;
    mode?: "primary" | "secondary" | "none";
    icon?: string;
  };

  let { label, icon, mode = "primary", class: customClass, ...props }: Props = $props();
</script>

<a
  {...props}
  data-mode={mode}
  class={[
    "grid justify-items-center cursor-pointer rounded-lg py-2 text-center duration-300 data-[mode=primary]:bg-aurora-magenta-400 hover:data-[mode=primary]:bg-aurora-magenta-300",
    customClass,
  ]}
>
  <span class="relative">
    {#if icon}
      <img
        aria-hidden="true"
        alt={label + " icon"}
        src={icon}
        width={32}
        height={32}
        class="absolute -left-10"
      />
    {/if}
    {label}
  </span>
</a>
