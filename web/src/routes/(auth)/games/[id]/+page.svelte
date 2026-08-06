<script lang="ts">
  import ReconnectingWebSocket from "$lib/websocket";
  import { onMount } from "svelte";
  import { type PageData } from "./$types";

  let { data }: PageData = $props();

  type GameChatMessage = {
    type: "chat";
    content: string;
    senderId: string;
    sentAt: number;
  };

  type GameJoinMessage = {
    type: "join";
    playerId: string;
    playerName: string;
    joinedAt: number;
  }

  type GameDisconnectMessage = {
    type: "disconnect";
    playerId: string;
    disconnectedAt: number;
  };

  type GameMessage = GameChatMessage | GameJoinMessage | GameDisconnectMessage;

  let socket = new ReconnectingWebSocket("ws://localhost:8000/api/ws/games/" + data.game.id);

  onMount(() => {
    socket.onmessage = async (event) => {
      const message: GameMessage = JSON.parse(event.data);

      if (message.type === "join") {
        console.log(`Player ${message.playerName} joined the game.`);
      } else if (message.type === "disconnect") {
        console.log(`Player ${message.playerId} disconnected from the game.`);
      } else if (message.type === "chat") {
        console.log(`Chat message from ${message.senderId}: ${message.content}`);
      }
    };

    socket.connect();

    return () => {
      socket.close();
    };
  });
</script>
