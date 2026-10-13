<script lang="ts">
  import { resolve } from "$app/paths";
  import ProfileList from "#lib/components/ProfileList.svelte";
  import StyledButton from "#lib/components/StyledButton.svelte";
  import StyledCard from "#lib/components/StyledCard.svelte";
  import StyledInput from "#lib/components/StyledInput.svelte";
  import StyledMain from "#lib/components/StyledMain.svelte";
  import StyledSeparator from "#lib/components/StyledSeparator.svelte";
  import type { PageProps } from "./$types";
  import { FileUpload } from "melt/builders";
  import AvatarInput from "#lib/components/AvatarInput.svelte";
  import { getSimplifiedTimeSince } from "#lib/utils.js";
  import { enhance } from "$app/forms";

  let { data }: PageProps = $props();

  let friends = $derived(data.friends?.filter((f) => f.accepted) ?? []);
  let pendingInvites = $derived(
    data.friends?.filter((f) => !f.accepted && f.sender_id === data.profile?.user_id) ?? [],
  );
  let incomingRequests = $derived(
    data.friends?.filter((f) => !f.accepted && f.sender_id !== data.profile?.user_id) ?? [],
  );
  let username = $derived(data.profile.username);
  const fileUpload = new FileUpload({
    accept: ".jpg, .jpeg, .png, .webp, .heic",
    maxSize: 10 * 1024 * 1024, // 10 MB, it will get crunched down to 128x128
  });
  let editedProfile = $derived(username.trim() !== data.profile.username || !!fileUpload.selected);
</script>

<svelte:head>
  <title>Friends - OpenDungeon</title>
</svelte:head>

<StyledMain>
  <StyledCard class="grid gap-6 px-4 py-6 md:px-8 lg:w-5xl xl:w-6xl">
    <a
      href={resolve("dashboard")}
      class="w-min text-aurora-gray-700 underline duration-300 hover:text-aurora-gray-500">Exit</a
    >
    <form
      method="POST"
      action="?/editprofile"
      use:enhance={() => {
        return async ({ update }) => {
          await update();
          username = data.profile.username;
          fileUpload.clear();
          editedProfile = false;
        };
      }}
      enctype="multipart/form-data"
      class="flex flex-row gap-3 lg:gap-6"
    >
      <AvatarInput {fileUpload} profile={data.profile} />
      <div class="flex flex-col justify-between">
        <div class="grid gap-2">
          <StyledInput
            required
            name="username"
            type="text"
            placeholder="Username"
            autocomplete="off"
            bind:value={username}
            class="lg:text-xl"
          />
          <span class="text-sm lg:text-base"
            >Joined {getSimplifiedTimeSince(data.profile.created_at, new Date())}</span
          >
        </div>

        {#if editedProfile}
          <div class="grid w-full grid-cols-2 gap-2">
            <StyledButton
              label="Cancel"
              onclick={() => {
                username = data.profile.username;
                fileUpload.clear();
                editedProfile = false;
              }}
            />
            <StyledButton label="Save" />
          </div>
        {/if}
      </div>
    </form>
    <StyledSeparator />
    <form
      method="POST"
      action="?/addfriend"
      use:enhance
      autocomplete="off"
      class="flex flex-col gap-2"
    >
      <h2>Invite Friend</h2>
      <div class="flex max-w-sm flex-row gap-2">
        <StyledInput name="username" placeholder="Username" type="text" />
        <StyledButton label="Invite" class="px-2" />
      </div>
    </form>
    <StyledSeparator />
    <div class="grid gap-4 text-center lg:grid-cols-3">
      <ProfileList
        label="Friends"
        emptyText="You have no friends..."
        actions={[
          { icon: "clarity:remove-solid", color: "text-danger", formAction: "removefriend" },
        ]}
        profiles={friends}
      />
      <ProfileList
        label="Pending"
        profiles={pendingInvites}
        emptyText="You have not invited anyone..."
        actions={[
          { icon: "clarity:remove-solid", color: "text-danger", formAction: "removefriend" },
        ]}
      />
      <ProfileList
        label="Incoming"
        profiles={incomingRequests}
        emptyText="You have no requests..."
        actions={[
          {
            icon: "akar-icons:circle-check-fill",
            color: "text-success",
            formAction: "acceptfriend",
          },
          { icon: "clarity:remove-solid", color: "text-danger", formAction: "removefriend" },
        ]}
      />
    </div>
  </StyledCard>
</StyledMain>
