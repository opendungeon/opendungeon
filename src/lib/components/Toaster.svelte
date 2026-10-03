<script lang="ts" module>
  type ToastData = {
    title: string;
    description: string;
    level: "info" | "success" | "warn" | "danger";
  };

  const toaster = new Toaster<ToastData>();
  export const addToast = toaster.addToast;
</script>

<script lang="ts">
  import { Toaster } from "melt/builders";
  import StyledCard from "./StyledCard.svelte";
</script>

<div
  {...toaster.root}
  class="fixed top-auto! right-4! bottom-4! left-auto! grid w-[300px] gap-2 bg-transparent"
>
  {#each toaster.toasts as toast (toast.id)}
    <StyledCard {...toast.content} data-level={toast.data.level} class="group grid p-4">
      <h3
        {...toast.title}
        class="font-semibold text-white group-data-[level=danger]:text-danger group-data-[level=success]:text-success group-data-[level=warn]:text-warn"
      >
        {toast.data.title}
      </h3>
      <div {...toast.description} class="text-sm text-aurora-gray-800">
        {toast.data.description}
      </div>
      <div aria-hidden="true" class="mt-2 h-1 w-full rounded-lg bg-aurora-gray-1100">
        <div
          class="h-full rounded-lg bg-white group-data-[level=danger]:bg-danger group-data-[level=success]:bg-success group-data-[level=warn]:bg-warn"
          style="width: {toast.percentage}%;"
        ></div>
      </div>
    </StyledCard>
  {/each}
</div>
