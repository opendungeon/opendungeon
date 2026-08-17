<script lang="ts">
  import ReconnectingWebSocket from "$lib/websocket";
  import { onMount } from "svelte";
  import { type PageData } from "./$types";
  import ChatMessage from "$lib/messages/chat";
  import { MessageType, type Message } from "$lib/messages";
  import AckMessage from "$lib/messages/ack";
  import { callAPI, getMediaUrl, type APICellTexture, type APILevelData } from "$lib/api";
  import { addToast } from "$lib/components/Toaster.svelte";
  import JoinMessage from "$lib/messages/join";
  import SyncMessage from "$lib/messages/sync";
  import LeaveMessage from "$lib/messages/leave";
  import Controller, {
    type GameMouseMoveEvent,
    type GameMousePressEvent,
    type GameMouseReleaseEvent,
    type GameMouseScrollEvent,
    MouseButton,
  } from "$lib/controller";
  import Renderer from "$lib/renderer";
  import Camera from "$lib/renderer/camera";
  import Texture from "$lib/renderer/texture";
  import Rectangle from "$lib/rectangle";
  import { Cartesian } from "$lib/point";
  import * as GLM from "gl-matrix";
  import LoadLevelMessage from "$lib/messages/loadlevel";

  const GRID_WIDTH = 256;
  const GRID_HEIGHT = 256;

  let { data }: PageData = $props();

  let socket = new ReconnectingWebSocket("ws://localhost:8000/api/rooms/" + data.game.id);

  let messageIDHandle = 0;
  let pendingMessages: Message[] = [];

  let canvas = $state<HTMLCanvasElement>();
  let controller: Controller;
  let renderer: Renderer;
  let camera: Camera;
  let levelData: APILevelData | undefined;
  let frameHandle = -1;
  let input: { type: "none" } | { type: "dragging"; button: number } = { type: "none" };
  let messages: string[] = $state([]);
  let messageInput: string = $state("");
  let loading = $state(true);
  let rectId: number;

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

  async function handleLoadLevel(levelId: string) {
    const loadLevelMessage = new LoadLevelMessage(
      messageIDHandle,
      BigInt(Math.floor(new Date().getTime() / 1000)),
      levelId,
    );
    incrementMessageIDHandle();
    pendingMessages.push(loadLevelMessage);
    socket.send(loadLevelMessage.toBuffer());
  }

  onMount(() => {
    controller = new Controller(canvas!);
    renderer = new Renderer(canvas!, {
      resizeToWindow: true,
      backgroundColor: new Float32Array([0, 0, 0, 1]),
    });
    camera = new Camera(canvas!.width / canvas!.height); // TODO: handle resizing window
    camera.zoom = 100;

    rectId = renderer.createElement(Rectangle);
    renderer.loadTexture("system.plain", new Texture(1, 1)).then(() => (loading = false));

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
        case MessageType.Leave: {
          const leaveMessage = LeaveMessage.fromBuffer(buffer);
          messages.push(`${players[leaveMessage.playerId]} has left the game.`);
          delete players[leaveMessage.playerId];
          break;
        }
        case MessageType.Chat: {
          const chatMessage = ChatMessage.fromBuffer(buffer);
          messages.push(chatMessage.content);
          break;
        }
        case MessageType.Sync: {
          loading = true;
          const syncMessage = SyncMessage.fromBuffer(buffer);
          players = syncMessage.data.players;
          levelData = syncMessage.data.level;

          if (!levelData) {
            return;
          }

          const textureMediaLookup = data.cellTextures.reduce<Record<string, string>>(
            (prev, curr) => {
              return { ...prev, [curr.key]: curr.mediaId };
            },
            {},
          );

          Promise.all(
            levelData.textures.map((texture) => {
              const uri = getMediaUrl(textureMediaLookup[texture]);
              return renderer
                .loadTexture(texture, uri, {
                  mode: "nearest",
                })
                .catch((e) => {
                  if (e instanceof Error && e.message.includes("already in use")) {
                    return;
                  }
                  throw e
                });
            }),
          ).then(() => (loading = false));
          break;
        }
      }
    };

    socket.connect();

    loop();

    return () => {
      window.cancelAnimationFrame(frameHandle);
      socket.close();
    };
  });

  function tick() {
    if (!controller) {
      return;
    }
    for (const event of controller.getMouseEvents()) {
      switch (event.type) {
        case "clear": {
          handleClear();
          break;
        }
        case "press": {
          handlePress(event);
          break;
        }
        case "release": {
          handleRelease(event);
          break;
        }
        case "move": {
          handleMove(event);
          break;
        }
        case "scroll": {
          handleScroll(event);
          break;
        }
      }
    }
  }

  function draw() {
    if (!renderer || !levelData || loading) {
      return;
    }

    renderer.clear();

    const cellsByTexture: Record<number, Cartesian[]> = {};
    for (let row = 0; row < levelData.grid.length; row++) {
      for (let col = 0; col < levelData.grid[row].length; col++) {
        const cell = levelData.grid[row][col];
        if (!cell) {
          continue;
        }

        const texture = cell.texture;
        if (texture === undefined || texture === null) {
          continue;
        }

        const point = new Cartesian(col, row);
        if (cellsByTexture[texture] === undefined) {
          cellsByTexture[texture] = [point];
          continue;
        }

        cellsByTexture[texture].push(point);
      }
    }

    const rect = renderer.getAndUseElement<Rectangle>(rectId);
    rect.setCamera(camera);
    for (const [textureIndex, coords] of Object.entries(cellsByTexture)) {
      renderer.useTexture(levelData.textures[Number(textureIndex)]);
      const buffer = rect.allocate(coords.length);
      for (let i = 0; i < coords.length; i++) {
        const offset = i * rect.instanceSize;
        const model = GLM.mat4.create();
        const coord = coords[i];
        GLM.mat4.translate(model, model, GLM.vec3.fromValues(coord.x, coord.y, 0));
        buffer.set(model, offset);
        buffer.set(new Float32Array([1, 1, 1, 1]), offset + model.length);
      }
      rect.draw();
    }
  }

  function handleClear() {
    input = { type: "none" };
  }

  function handlePress(event: GameMousePressEvent) {
    input = { type: "dragging", button: event.button };
  }

  function handleRelease(event: GameMouseReleaseEvent) {
    if (input.type === "dragging") {
      input = { type: "none" };
    }
  }

  function handleMove(event: GameMouseMoveEvent) {
    if (input.type === "dragging") {
      if (input.button === MouseButton.Middle) {
        const end = renderer.canvasCoordToWorldCoord(camera, event.x, event.y);
        const start = renderer.canvasCoordToWorldCoord(
          camera,
          event.x - event.deltaX,
          event.y - event.deltaY,
        );
        const delta = start.subtract(end);

        camera?.translate(GLM.vec3.fromValues(-delta.x, delta.y, 0));
      }
    }
  }

  function handleScroll(event: GameMouseScrollEvent) {
    camera!.zoom = Math.max(1, camera!.zoom + event.delta / 25);
  }

  function loop() {
    frameHandle = window.requestAnimationFrame(() => {
      tick();
      draw();
      loop();
    });
  }
</script>

<main class="relative grid justify-start">
  <canvas class="absolute inset-0 bg-white" bind:this={canvas}></canvas>
  <ul class="relative z-10 bg-black">
    {#each data.levels as level, i (i)}
      <li class="text-white">
        <button onclick={() => handleLoadLevel(level.id)}>
          {level.name}
        </button>
      </li>
    {/each}
  </ul>
</main>
