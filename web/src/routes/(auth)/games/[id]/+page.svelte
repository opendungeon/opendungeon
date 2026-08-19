<script lang="ts">
  import ReconnectingWebSocket from "$lib/websocket";
  import { onMount } from "svelte";
  import { type PageProps } from "./$types";
  import ChatMessage from "$lib/messages/chat";
  import { MessageType, type GameMessage, type Message } from "$lib/messages";
  import AckMessage from "$lib/messages/ack";
  import { BASE_URL, callAPI, getMediaUrl, type APILevelData, type APIProfile } from "$lib/api";
  import JoinMessage from "$lib/messages/join";
  import SyncMessage from "$lib/messages/sync";
  import LeaveMessage from "$lib/messages/leave";
  import Controller, {
    type GameMouseMoveEvent,
    type GameMousePressEvent,
    type GameMouseScrollEvent,
    MouseButton,
  } from "$lib/controller";
  import Renderer from "$lib/renderer";
  import { PerspectiveCamera, type Camera } from "$lib/renderer/camera";
  import Texture from "$lib/renderer/texture";
  import Rectangle from "$lib/rectangle";
  import { Cartesian, degToRad } from "$lib/point";
  import * as GLM from "gl-matrix";
  import LoadLevelMessage from "$lib/messages/loadlevel";
  import Icon from "@iconify/svelte";
  import GameMenu from "$lib/components/GameMenu.svelte";
  import { addToast } from "$lib/components/Toaster.svelte";

  let { data }: PageProps = $props();

  let socketUrl = $derived("ws://" + BASE_URL.host + "/api/rooms/" + data.game.id);
  let socket = $derived(new ReconnectingWebSocket(socketUrl));
  let canvas = $state<HTMLCanvasElement>();
  let isGameMaster = $derived(data.profile && data.profile.id === data.game.gameMasterId);
  let profileLookup = $derived(
    data.profiles.reduce<Record<string, APIProfile>>((prev, curr) => {
      return { ...prev, [curr.username]: curr };
    }, {}),
  );
  let messages: GameMessage[] = $state([]);
  let loading = $state(true);
  let playerLookup: Record<string, string> = $state({});
  let showLeftMenu = $state(true);
  let showRightMenu = $state(true);
  let messageIDHandle = 0;
  let pendingMessages: Message[] = [];
  let controller: Controller;
  let renderer: Renderer;
  let camera: Camera;
  let levelData: APILevelData | undefined;
  let frameHandle = -1;
  let input: { type: "none" } | { type: "dragging"; button: number } = { type: "none" };
  let rectId: number;

  function incrementMessageIDHandle() {
    if (messageIDHandle >= 255) {
      messageIDHandle = 0;
    } else {
      messageIDHandle++;
    }
  }

  onMount(() => {
    controller = new Controller(canvas!);
    renderer = new Renderer(canvas!, {
      resizeToWindow: true,
      backgroundColor: new Float32Array([0, 0, 0, 1]),
    });
    camera = new PerspectiveCamera(canvas!.width / canvas!.height); // TODO: handle resizing window
    camera.rotateX(-degToRad(30));
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
          playerLookup[joinMessage.playerId] = joinMessage.playerName;
          messages.push({
            playerProfile: profileLookup[joinMessage.playerName],
            content: `${joinMessage.playerName} has joined the game.`,
            isSystemMessage: true,
          });
          break;
        }
        case MessageType.Leave: {
          const leaveMessage = LeaveMessage.fromBuffer(buffer);
          const playerName = playerLookup[leaveMessage.playerId];
          messages.push({
            playerProfile: profileLookup[playerLookup[leaveMessage.playerId]],
            content: `${playerName} has left the game.`,
            isSystemMessage: true,
          });
          delete playerLookup[leaveMessage.playerId];
          break;
        }
        case MessageType.Chat: {
          const chatMessage = ChatMessage.fromBuffer(buffer);
          messages.push({
            playerProfile: profileLookup[playerLookup[chatMessage.playerId]],
            content: chatMessage.content,
            isSystemMessage: false,
          });
          break;
        }
        case MessageType.Sync: {
          loading = true;
          const syncMessage = SyncMessage.fromBuffer(buffer);
          playerLookup = syncMessage.data.players;
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
            levelData.textures.map(async (texture) => {
              const uri = getMediaUrl(textureMediaLookup[texture]);
              return renderer
                .loadTexture(texture, uri, {
                  mode: "nearest",
                })
                .catch((e) => {
                  if (e instanceof Error && e.message.includes("already in use")) {
                    return;
                  }
                  throw e;
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
          handleRelease();
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

  function handleLoadLevel(levelId: string) {
    const loadLevelMessage = new LoadLevelMessage(
      messageIDHandle,
      BigInt(Math.floor(new Date().getTime() / 1000)),
      levelId,
    );
    incrementMessageIDHandle();
    pendingMessages.push(loadLevelMessage);
    socket.send(loadLevelMessage.toBuffer());
  }

  async function handleInvitePlayer(event: SubmitEvent) {
    event.preventDefault();

    const form = new FormData(event.currentTarget as HTMLFormElement);
    const invitee = form.get("invitee");
    if (!invitee) {
      return;
    }
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

  function handleSendChatMessage(event: SubmitEvent) {
    event.preventDefault();

    const form = new FormData(event.currentTarget as HTMLFormElement);
    const message = form.get("message");
    if (!message || !(message as string).trim() || !data.profile) {
      return;
    }
    const playerId = Object.entries(playerLookup).find(
      ([, name]) => name === data.profile!.username,
    )?.[0];
    const chatMessage = new ChatMessage(
      messageIDHandle,
      BigInt(Math.floor(new Date().getTime() / 1000)),
      playerId!,
      message as string,
    );
    incrementMessageIDHandle();
    pendingMessages.push(chatMessage);
    socket.send(chatMessage.toBuffer());
    messages.push({
      playerProfile: profileLookup[data.profile.username],
      content: chatMessage.content,
      isSystemMessage: false,
    });
  }

  function handleClear() {
    input = { type: "none" };
  }

  function handlePress(event: GameMousePressEvent) {
    input = { type: "dragging", button: event.button };
  }

  function handleRelease() {
    if (input.type === "dragging") {
      input = { type: "none" };
    }
  }

  function handleMove(event: GameMouseMoveEvent) {
    if (input.type === "dragging") {
      if (input.button === MouseButton.Middle) {
        // measure world units per pixel by unprojecting two nearby screen points
        // at the cursor location onto the z=0 plane
        const origin = renderer.canvasCoordToWorldCoord(camera, event.x, event.y);
        const oneRight = renderer.canvasCoordToWorldCoord(camera, event.x + 1, event.y);
        const oneDown = renderer.canvasCoordToWorldCoord(camera, event.x, event.y + 1);

        const worldPerPixelX = oneRight.subtract(origin);
        const worldPerPixelY = oneDown.subtract(origin);

        // camera basis vectors from the view matrix
        const right = GLM.vec3.fromValues(camera.view[0], camera.view[4], camera.view[8]);
        // "up on screen" projected onto the ground plane, so panning stays parallel to z=0 regardless of camera tilt
        const upFlat = GLM.vec3.fromValues(camera.view[1], camera.view[5], 0);
        GLM.vec3.normalize(right, right);
        GLM.vec3.normalize(upFlat, upFlat);

        // screen-forward magnitude of one pixel of drag, in world units
        const pxX = GLM.vec2.length(GLM.vec2.fromValues(worldPerPixelX.x, worldPerPixelX.y));
        const pxY = GLM.vec2.length(GLM.vec2.fromValues(worldPerPixelY.x, worldPerPixelY.y));

        const dx = event.deltaX * pxX;
        const dy = event.deltaY * pxY;

        const translation = GLM.vec3.create();
        GLM.vec3.scaleAndAdd(translation, translation, right, dx);
        GLM.vec3.scaleAndAdd(translation, translation, upFlat, dy);

        camera?.translate(translation);
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

<main class="relative grid justify-start h-dvh">
  <canvas class="absolute inset-0 bg-black" bind:this={canvas}></canvas>
  <button
    onclick={() => (showLeftMenu = !showLeftMenu)}
    class="absolute z-10 top-18 left-4 bg-aurora-gray-1200 hover:bg-aurora-gray-1000 active:bg-aurora-gray-800 border-2 border-white rounded-md"
  >
    <Icon
      icon={`material-symbols:arrow-${showLeftMenu ? "left" : "right"}`}
      width={36}
      height={36}
      class="self-center"
    />
  </button>
  <button
    onclick={() => (showRightMenu = !showRightMenu)}
    class="absolute z-10 top-18 right-4 bg-aurora-gray-1200 hover:bg-aurora-gray-1000 active:bg-aurora-gray-800 border-2 border-white rounded-md"
  >
    <Icon
      icon={`material-symbols:arrow-${showRightMenu ? "right" : "left"}`}
      width={36}
      height={36}
      class="self-center"
    />
  </button>
  {#if showRightMenu}
    <GameMenu
      isGameMaster={isGameMaster === true}
      levels={data.levels}
      players={playerLookup}
      {messages}
      {handleLoadLevel}
      {handleSendChatMessage}
      {handleInvitePlayer}
    />
  {/if}
</main>
