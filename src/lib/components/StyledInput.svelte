<script lang="ts">
  import Icon from "@iconify/svelte";
  import type { HTMLInputAttributes } from "svelte/elements";

  type Props = HTMLInputAttributes & {
    icon?: string;
    iconColor?: string;
  };

  let { icon, iconColor, value = $bindable(""), class: customClass, ...props }: Props = $props();
</script>

{#if icon}
  <div
    class={[
      "bg-aurora-gray-1300 py-2 pl-4 pr-2 rounded border border-aurora-gray-1100 backdrop-blur-xs focus:outline-hidden focus:border-aurora-gray-600 flex justify-between gap-2",
      customClass,
    ]}
  >
    <input {...props} bind:value class="w-full focus:outline-hidden" />
    <button onclick={() => (value = "")}>
      <Icon {icon} width={16} height={16} color={iconColor} class="self-center" />
    </button>
  </div>
{:else}
  <input
    {...props}
    bind:value
    class={[
      "w-full min-w-0 bg-aurora-gray-1300 py-2 px-4 rounded border border-aurora-gray-1100 backdrop-blur-xs focus:outline-hidden focus:border-aurora-gray-600",
      customClass,
    ]}
  />
{/if}
