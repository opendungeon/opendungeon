<script lang="ts">
  import type { Profile } from "#lib/server/database/profiles.js";
  import { getInitials } from "#lib/utils.js";
  import Icon from "@iconify/svelte";
  import { FileUpload } from "melt/builders";
  import { Avatar } from "melt/components";
  import type { ClassValue } from "svelte/elements";

  type Props = {
    profile: Profile;
    fileUpload: FileUpload;
    value?: File | null;
    class?: ClassValue;
  };

  let { profile, fileUpload, value = $bindable(), class: customClass }: Props = $props();

  let avatarPreviewUri = $state<string | null>(null);

  $effect(() => {
    value = fileUpload.selected ?? null;

    if (!value) {
      avatarPreviewUri = null;
      return;
    }

    const url = URL.createObjectURL(value);
    avatarPreviewUri = url;
    return () => URL.revokeObjectURL(url);
  });
</script>

<div class={["group grid gap-1", customClass]}>
  <input name="file" {...fileUpload.input} />
  {#if !fileUpload.selected}
    <div
      {...fileUpload.dropzone}
      class="relative size-28 rounded-lg border-2 border-aurora-gray-600 lg:size-32"
    >
      <Avatar src={!profile.avatar_uri ? "" : `/api/media/${profile.avatar_uri}`}>
        {#snippet children(avatar)}
          <img {...avatar.image} alt="Avatar" class="w-full-h-full aspect-square rounded-lg" />
          <span
            {...avatar.fallback}
            class="-mt-1 flex size-full items-center justify-center text-6xl"
          >
            {getInitials(profile.username)}
          </span>
        {/snippet}
      </Avatar>
      <div
        class="absolute top-0 right-0 bottom-0 left-0 hidden size-full items-center justify-center rounded-lg bg-transparent group-hover:flex group-hover:bg-aurora-gray-1400/75"
      >
        <Icon icon="material-symbols-light:edit" class="text-5xl" />
      </div>
    </div>
  {:else}
    <div
      {...fileUpload.dropzone}
      class="group relative size-28 rounded-lg border-2 border-aurora-gray-600 lg:size-32"
    >
      <img src={avatarPreviewUri} alt="avatar" class="aspect-square w-full rounded-lg" />
      <div
        class="absolute top-0 right-0 bottom-0 left-0 hidden size-full items-center justify-center rounded-lg bg-transparent group-hover:flex group-hover:bg-aurora-gray-1400/75"
      >
        <Icon icon="material-symbols-light:edit" class="text-6xl" />
      </div>
    </div>
  {/if}
</div>
