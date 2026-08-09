<script lang="ts">
  import ReconnectingWebSocket from "$lib/websocket";
  import { onMount } from "svelte";
  import { type PageData } from "./$types";
  import StyledInput from "$lib/components/StyledInput.svelte";
  import StyledButton from "$lib/components/StyledButton.svelte";
  import ChatMessage from "$lib/messages/chat";
  import { MessageType, type Message } from "$lib/messages";
  import AckMessage from "$lib/messages/ack";
  import { callAPI } from "$lib/api";
  import { addToast } from "$lib/components/Toaster.svelte";
  import JoinMessage from "$lib/messages/join";

  let { data }: PageData = $props();

  let socket = new ReconnectingWebSocket("ws://localhost:8000/api/rooms/" + data.game.id);

  let messageIDHandle = 0;
  let pendingMessages: Message[] = [];

  let messages: string[] = $state([]);
  let messageInput: string = $state("");

  let invitee: string = $state("");

  let players: Record<string, string> = $state({});

  function incrementMessageIDHandle() {
    if (messageIDHandle >= 255) {
      messageIDHandle = 0;
    } else {
      messageIDHandle++;
    }
  }

  function handleSend(event: SubmitEvent) {
    event.preventDefault();

    const chatMessage = new ChatMessage(
      messageIDHandle,
      BigInt(Math.floor(new Date().getTime() / 1000)),
      "random",
      messageInput,
    );
    incrementMessageIDHandle();
    pendingMessages.push(chatMessage);
    socket.send(chatMessage.toBuffer());
    messages.push(chatMessage.content);
  }

  async function handleInvite(event: SubmitEvent) {
    event.preventDefault();
    const formData = new FormData();
    formData.append("userId", invitee);
    formData.append("permissionLevel", "player");
    const res = await callAPI(fetch, "POST", "/games/" + data.game.id + "/players", {
      body: formData,
    });
    if (!res.ok) {
      addToast({
        data: {
          title: "Failed to Invite Player",
          description: res.error.message,
          level: "danger",
        },
      });
      return;
    }
  }

  onMount(() => {
    socket.onmessage = async (event) => {
      const buffer = await event.data.bytes();
      const messageType = buffer[0] as MessageType;
      console.log("received message with type: ", messageType);

      switch (messageType) {
        case MessageType.Ack: {
          const ackMessage = AckMessage.fromBuffer(buffer);
          const index = pendingMessages.findIndex((msg) => msg.id === ackMessage.promptId);
          if (index === -1) {
            alert("Received an ACK for a message that was not sent.");
            return;
          }
          if (ackMessage.accepted) {
            pendingMessages.splice(index, 1);
          } else {
            console.error("Message was rejected by the server.");
            return;
          }
          break;
        }
        case MessageType.Join: {
          const joinMessage = JoinMessage.fromBuffer(buffer);
          players[joinMessage.playerId] = joinMessage.playerName;
          messages.push(`${joinMessage.playerName} has joined the game.`);
          break;
        }
        case MessageType.Chat: {
          const chatMessage = ChatMessage.fromBuffer(buffer);
          messages.push(chatMessage.content);
          break;
        }
      }
    };

    socket.connect();

    return () => {
      socket.close();
    };
  });
</script>

<ul>
  {#each messages as message, i (i)}
    <li>{message}</li>
  {/each}
</ul>
<form onsubmit={handleSend}>
  <StyledInput type="text" bind:value={messageInput} />
  <StyledButton label="Send" />
</form>
<form onsubmit={handleInvite}>
  <StyledInput type="text" placeholder="Invite Player" bind:value={invitee} />
  <StyledButton label="Invite" />
</form>
