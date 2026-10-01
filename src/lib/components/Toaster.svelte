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
  class="grid gap-2 fixed top-auto! left-auto! bottom-4! right-4! bg-transparent w-[300px]"
>
  {#each toaster.toasts as toast (toast.id)}
    <StyledCard {...toast.content} data-level={toast.data.level} class="grid group p-4">
      <h3
        {...toast.title}
        class="text-white font-semibold group-data-[level=warn]:text-warn group-data-[level=danger]:text-danger group-data-[level=success]:text-success"
      >
        {toast.data.title}
      </h3>
      <div {...toast.description} class="text-aurora-gray-800 text-sm">
        {toast.data.description}
      </div>
      <div aria-hidden="true" class="h-1 w-full bg-aurora-gray-1100 rounded-lg mt-2">
        <div
          class="h-full rounded-lg bg-white group-data-[level=warn]:bg-warn group-data-[level=danger]:bg-danger group-data-[level=success]:bg-success"
          style="width: {toast.percentage}%;"
        ></div>
      </div>
    </StyledCard>
  {/each}
</div>
