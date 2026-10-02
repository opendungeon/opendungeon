<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { callAPI, CONFLICT, NOT_FOUND, type APIFriend } from "$lib/api";
  import ProfileList from "$lib/components/ProfileList.svelte";
  import StyledButton from "$lib/components/StyledButton.svelte";
  import StyledCard from "$lib/components/StyledCard.svelte";
  import StyledInput from "$lib/components/StyledInput.svelte";
  import StyledMain from "$lib/components/StyledMain.svelte";
  import StyledSeparator from "$lib/components/StyledSeparator.svelte";
  import { addToast } from "$lib/components/Toaster.svelte";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();

  let friends = $derived(data.friends?.filter((f) => f.accepted) ?? []);
  let pendingInvites = $derived(
    data.friends?.filter((f) => !f.accepted && f.initiatorID === data.profile?.id) ?? [],
  );
  let incomingRequests = $derived(
    data.friends?.filter((f) => !f.accepted && f.initiatorID !== data.profile?.id) ?? [],
  );
  let username = $state("");

  async function handleInviteFriend(event: SubmitEvent) {
    event.preventDefault();

    const body = new FormData();
    body.append("username", username);

    const res = await callAPI(fetch, "POST", "/friends", { body });
    if (!res.ok) {
      if (res.error.cause === CONFLICT) {
        const existingIncomingRequestIndex = incomingRequests.findIndex(
          (invite) => invite.profile.username === username,
        );
        if (existingIncomingRequestIndex !== -1) {
          handleAcceptIncoming(existingIncomingRequestIndex);

          username = "";
          return;
        } else {
          invalidateAll();
        }
      }
      addToast({
        data: { title: "Invite Failed", description: res.error.message, level: "danger" },
      });
      return;
    }

    const friendRequest: APIFriend = await res.data.json();

    const existingFriendIndex = friends.findIndex((friend) => friend.profile.username === username);
    if (existingFriendIndex !== -1) {
      const friendsCopy = [...friends];
      friendsCopy.splice(existingFriendIndex, 1);
      friends = friendsCopy;
    }

    const existingPendingIndex = pendingInvites.findIndex(
      (invite) => invite.profile.username === username,
    );
    if (existingPendingIndex !== -1) {
      const pendingCopy = [...pendingInvites];
      pendingCopy.splice(existingPendingIndex, 1);
      pendingInvites = pendingCopy;
    }

    const existingIncomingRequestIndex = incomingRequests.findIndex(
      (request) => request.targetID === data.profile?.id && request.profile.username === username,
    );
    if (existingIncomingRequestIndex !== -1) {
      friends = [...friends, incomingRequests[existingIncomingRequestIndex]];
      const incomingCopy = [...incomingRequests];
      incomingCopy.splice(existingIncomingRequestIndex, 1);
      incomingRequests = incomingCopy;
    } else {
      pendingInvites = [...pendingInvites, friendRequest];
    }

    username = "";
  }

  async function handleDeleteFriend(index: number) {
    const res = await callAPI(fetch, "DELETE", "/friends/" + friends[index].profile.id);
    if (!res.ok) {
      if (res.error.cause === NOT_FOUND) {
        const friendsCopy = [...friends];
        friendsCopy.splice(index, 1);
        friends = friendsCopy;
        return;
      }
      addToast({
        data: {
          title: "Failed to Remove Friend",
          description: res.error.message,
          level: "danger",
        },
      });
      return;
    }

    const friendsCopy = [...friends];
    friendsCopy.splice(index, 1);
    friends = friendsCopy;
  }

  async function handleCancelPending(index: number) {
    const res = await callAPI(fetch, "DELETE", "/friends/" + pendingInvites[index].profile.id);
    if (!res.ok) {
      if (res.error.cause === NOT_FOUND) {
        const incomingCopy = [...incomingRequests];
        incomingCopy.splice(index, 1);
        incomingRequests = incomingCopy;
        return;
      }
      addToast({
        data: { title: "Failed to Cancel Invite", description: res.error.message, level: "danger" },
      });
      return;
    }

    const pendingCopy = [...pendingInvites];
    pendingCopy.splice(index, 1);
    pendingInvites = pendingCopy;
  }

  async function handleRejectIncoming(index: number) {
    const res = await callAPI(fetch, "DELETE", "/friends/" + incomingRequests[index].profile.id);
    if (!res.ok) {
      if (res.error.cause === NOT_FOUND) {
        const incomingCopy = [...incomingRequests];
        incomingCopy.splice(index, 1);
        incomingRequests = incomingCopy;
        return;
      }
      addToast({
        data: {
          title: "Failed to Reject Friend Request",
          description: res.error.message,
          level: "danger",
        },
      });
      return;
    }

    const incomingCopy = [...incomingRequests];
    incomingCopy.splice(index, 1);
    incomingRequests = incomingCopy;
  }

  async function handleAcceptIncoming(index: number) {
    const res = await callAPI(fetch, "PUT", "/friends/" + incomingRequests[index].profile.id);
    if (!res.ok) {
      if (res.error.cause === NOT_FOUND) {
        const incomingCopy = [...incomingRequests];
        incomingCopy.splice(index, 1);
        incomingRequests = incomingCopy;
      }
      addToast({
        data: {
          title: "Failed to Accept Friend Request",
          description: res.error.message,
          level: "danger",
        },
      });
      return;
    }

    const friendsCopy = [...friends];
    friendsCopy.push(incomingRequests[index]);
    friends = friendsCopy;

    const incomingCopy = [...incomingRequests];
    incomingCopy.splice(index, 1);
    incomingRequests = incomingCopy;
  }
</script>

<svelte:head>
  <title>Friends - OpenDungeon</title>
</svelte:head>

<StyledMain>
  <StyledCard class="px-4 py-6 grid gap-6 md:px-8 lg:w-5xl xl:w-6xl">
    <a
      href={resolve("/dashboard")}
      class="text-aurora-gray-700 underline duration-300 hover:text-aurora-gray-500 w-min">Exit</a
    >
    <form onsubmit={handleInviteFriend} autocomplete="off" class="flex flex-col gap-2">
      <h2>Invite Friend</h2>
      <div class="flex flex-row gap-2 max-w-sm">
        <input type="text" name="hidden" class="hidden" />
        <StyledInput bind:value={username} placeholder="Username" type="text" />
        <StyledButton label="Invite" class="px-2" />
      </div>
    </form>
    <StyledSeparator />
    <div class="grid lg:grid-cols-3 text-center gap-4">
      <ProfileList
        label="Friends"
        profiles={friends.map((friend) => friend.profile)}
        emptyText="You have no friends..."
        actions={[
          { icon: "clarity:remove-solid", color: "text-danger", onclick: handleDeleteFriend },
        ]}
      />
      <ProfileList
        label="Pending"
        profiles={pendingInvites.map((invite) => invite.profile)}
        emptyText="You have not invited anyone..."
        actions={[
          { icon: "clarity:remove-solid", color: "text-danger", onclick: handleCancelPending },
        ]}
      />
      <ProfileList
        label="Incoming"
        profiles={incomingRequests.map((request) => request.profile)}
        emptyText="You have no requests..."
        actions={[
          {
            icon: "akar-icons:circle-check-fill",
            color: "text-success",
            onclick: handleAcceptIncoming,
          },
          { icon: "clarity:remove-solid", color: "text-danger", onclick: handleRejectIncoming },
        ]}
      />
    </div>
  </StyledCard>
</StyledMain>
