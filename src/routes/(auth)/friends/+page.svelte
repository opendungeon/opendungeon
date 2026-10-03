<script lang="ts">
  import { resolve } from "$app/paths";
  import ProfileList from "#lib/components/ProfileList.svelte";
  import StyledButton from "#lib/components/StyledButton.svelte";
  import StyledCard from "#lib/components/StyledCard.svelte";
  import StyledInput from "#lib/components/StyledInput.svelte";
  import StyledMain from "#lib/components/StyledMain.svelte";
  import StyledSeparator from "#lib/components/StyledSeparator.svelte";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();

  let friends = $derived(data.friends?.filter((f) => f.accepted) ?? []);
  let pendingInvites = $derived(
    data.friends?.filter((f) => !f.accepted && f.sender_id === data.profile?.user_id) ?? [],
  );
  let incomingRequests = $derived(
    data.friends?.filter((f) => !f.accepted && f.sender_id !== data.profile?.user_id) ?? [],
  );
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

    <form method="POST" action="?/addfriend" autocomplete="off" class="flex flex-col gap-2">
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
        {friends}
      />
      <ProfileList
        label="Pending"
        friends={pendingInvites}
        emptyText="You have not invited anyone..."
        actions={[
          { icon: "clarity:remove-solid", color: "text-danger", formAction: "removefriend" },
        ]}
      />
      <ProfileList
        label="Incoming"
        friends={incomingRequests}
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
