<script lang="ts">
  import Icon from "@iconify/svelte";
  import { FileUpload } from "melt/builders";

  type Props = {
    fileUpload: FileUpload;
    label: string;
    icon: string;
    value?: File | null;
  };

  // eslint-disable-next-line no-useless-assignment
  let { fileUpload, label, icon, value = $bindable() }: Props = $props();

  $effect(() => {
    value = fileUpload.selected ?? null;
  });

  const GIGABYTE = 1_000_000_000;
  const MEGABYTE = 1_000_000;
  const KILOBYTE = 1_000;
  function abbreviateBytes(bytes: number): string {
    if (bytes >= 100 * MEGABYTE) {
      return `${(bytes / GIGABYTE).toFixed(1)} GB`;
    }

    if (bytes >= 100 * KILOBYTE) {
      return `${(bytes / MEGABYTE).toFixed(1)} MB`;
    }

    if (bytes >= 100) {
      return `${(bytes / KILOBYTE).toFixed(1)} KB`;
    }

    return `${bytes} B`;
  }
</script>

<div class="grid gap-1">
  <label for="file" class="text-lg text-aurora-gray-700">{label}</label>
  <input name="file" {...fileUpload.input} />
  {#if !fileUpload.selected}
    <div
      {...fileUpload.dropzone}
      class="group grid gap-2 justify-items-center bg-aurora-gray-1300/75 py-8 px-4 rounded border border-aurora-gray-1200 backdrop-blur-xs text-center text-aurora-gray-700 cursor-pointer duration-300 hover:text-aurora-gray-600 hover:border-aurora-gray-1100 hover:bg-aurora-gray-1200/75"
    >
      <Icon {icon} class="text-6xl" />
      {#if fileUpload.isDragging}
        Drop files here
      {:else}
        <p><span class="text-aurora-gray-200">Click to upload</span> or drag and drop</p>
      {/if}
    </div>
  {:else}
    <div
      class="flex justify-between bg-aurora-gray-1300/75 p-4 rounded border border-aurora-gray-1200 text-aurora-gray-700 backdrop-blur-xs"
    >
      <div>
        <p class="text-aurora-gray-200">{fileUpload.selected.name}</p>
        <p class="text-sm">{abbreviateBytes(fileUpload.selected.size)}</p>
      </div>
      <button
        onclick={() => fileUpload.remove(fileUpload.selected!)}
        class="cursor-pointer duration-300 hover:text-danger"
      >
        <Icon icon="material-symbols:close-rounded" aria-hidden="true" class="text-4xl" />
        <span class="sr-only">remove</span>
      </button>
    </div>
  {/if}
</div>
