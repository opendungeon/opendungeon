<script lang="ts">
  import type { HTMLButtonAttributes } from "svelte/elements";

  type Props = HTMLButtonAttributes & {
    label: string;
    mode?: "primary" | "secondary" | "outline" | "none";
    icon?: string;
  };

  let { label, icon, mode = "primary", class: customClass, ...props }: Props = $props();
</script>

<button
  {...props}
  data-mode={mode}
  class={[
    `grid justify-items-center cursor-pointer rounded-lg py-2 text-center duration-100 border
    data-[mode=primary]:border-aurora-gray-800
    data-[mode=primary]:bg-aurora-gray-1200
    hover:data-[mode=primary]:bg-aurora-gray-1000
    data-[mode=secondary]:border-aurora-gray-1200
    data-[mode=secondary]:bg-aurora-gray-1300/75
    hover:data-[mode=secondary]:bg-aurora-gray-1200
    data-[mode=outline]:text-aurora-gray-400
    data-[mode=outline]:border-aurora-gray-400
    data-[mode=outline]:bg-transparent
    data-[mode=outline]:backdrop-blur-xs
    hover:data-[mode=outline]:text-white
    hover:data-[mode=outline]:bg-aurora-gray-400`,
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
</button>
