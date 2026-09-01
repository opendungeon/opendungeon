<script lang="ts">
  import ReconnectingWebSocket from "$lib/websocket";
  import { onMount } from "svelte";
  import { type PageProps } from "./$types";
  import {
    type ChatMessage,
    type LoadCharacterMessage,
    type LoadLevelMessage,
    type Message,
    type PingMessage,
  } from "$lib/messages";
  import { type GameMessage } from "$lib/game";
  import { callAPI, getMediaUrl, getSocketUrl, type APILevelData, type APIProfile } from "$lib/api";
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
  import assert from "$lib/assert";
  import Icon from "@iconify/svelte";
  import GameMenu from "$lib/components/GameMenu.svelte";
  import { addToast } from "$lib/components/Toaster.svelte";
  import { resolve } from "$app/paths";
  import { goto } from "$app/navigation";
  import { GameMenuTool } from "$lib/game";
  import GameToolMenu from "$lib/components/GameToolMenu.svelte";
  import Animator from "$lib/renderer/animator";
  import type InstanceGLTF from "$lib/renderer/gltf/instance";
  import DynamicGLTF from "$lib/renderer/gltf/dynamic";

  let { data }: PageProps = $props();

  let socketUrl = $derived(getSocketUrl("/rooms/" + data.game.id));
  let socket: ReconnectingWebSocket;
  let canvas = $state<HTMLCanvasElement>();
  let isGameMaster = $derived(data.profile && data.profile.id === data.game.gameMasterId);
  let profiles: Record<string, APIProfile> = $derived(
    data.game.profiles.reduce<Record<string, APIProfile>>((prev, curr) => {
      return { ...prev, [curr.id]: curr };
    }, {}),
  );
  let messages: GameMessage[] = $state([]);
  let loading = $state(true);
  let onlinePlayers: Record<string, string> = $state({});
  let showLeftMenu = $state(true);
  let showRightMenu = $state(true);
  let selectedTool: GameMenuTool | null = $state(GameMenuTool.Select); // TODO: Implement functional tool type, rather than pure UI state
  let messageIdHandle = 0;
  let pingIdHandle = 0;
  let pings: Record<number, { point: Cartesian; opacity: number }> = {};
  let characters: {
    modelId: number;
    instance: InstanceGLTF;
  }[] = [];
  let pendingMessages: Message[] = [];
  let controller: Controller;
  let renderer: Renderer;
  let camera: Camera;
  let animator = new Animator();
  let levelData: APILevelData | undefined;
  let frameHandle = -1;
  let input: { type: "none" } | { type: "dragging"; button: number } = { type: "none" };
  let rectId: number;

  function getMessageId() {
    const id = messageIdHandle;

    if (messageIdHandle >= 255) {
      messageIdHandle = 0;
    } else {
      messageIdHandle++;
    }

    return id;
  }

  function getPingId() {
    const id = pingIdHandle;

    if (pingIdHandle >= 255) {
      pingIdHandle = 0;
    } else {
      pingIdHandle++;
    }

    return id;
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

    loop();

    return () => {
      window.cancelAnimationFrame(frameHandle);
    };
  });

  $effect(() => {
    const ws = new ReconnectingWebSocket(socketUrl);
    socket = ws;

    ws.onmessage = async (event) => {
      const message: Message = JSON.parse(await event.data.text());

      switch (message.type) {
        case "ack": {
          const index = pendingMessages.findIndex((msg) => msg.id === message.promptId);
          assert(index !== -1, "Received an ACK for a message that was not sent.");

          if (message.accepted) {
            pendingMessages.splice(index, 1);
          } else {
            console.error("Message was rejected by the server.");
            return;
          }
          break;
        }
        case "chat": {
          messages.push({
            playerProfile: profiles[message.playerId],
            content: message.content,
            isSystemMessage: false,
          });
          break;
        }
        case "join": {
          onlinePlayers[message.playerId] = message.playerName;
          messages.push({
            playerProfile: profiles[message.playerId],
            content: `${message.playerName} has joined the game.`,
            isSystemMessage: true,
          });
          break;
        }
        case "leave": {
          const playerName = onlinePlayers[message.playerId];
          messages.push({
            playerProfile: profiles[message.playerId],
            content: `${playerName} has left the game.`,
            isSystemMessage: true,
          });
          delete onlinePlayers[message.playerId];
          break;
        }
        case "loadcharacter": {
          await handleLoadCharacter(message.mediaId, message.x, message.y);
          break;
        }
        case "ping": {
          // TODO: color the ping per player
          handlePlayPing(new Cartesian(message.x, message.y));
          break;
        }
        case "sync": {
          loading = true;
          Object.entries(message.data.players).map(([playerId, player]) => {
            if (player.online) {
              onlinePlayers[playerId] = player.username;
            }
          });
          levelData = message.data.level;

          if (!levelData) {
            return;
          }

          const textureMediaLookup = data.cellTextures.reduce<Record<string, string>>(
            (prev, curr) => {
              return { ...prev, [curr.key]: curr.mediaId };
            },
            {},
          );

          Promise.all([
            ...levelData.textures.map(async (texture) => {
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
            ...message.data.characters.map(async ({ mediaId, x, y }) => {
              return handleLoadCharacter(mediaId, x, y);
            }),
          ]).then(() => (loading = false));
          break;
        }
      }
    };

    ws.connect();

    return () => ws.close();
  });

  function tick(time: number) {
    animator.tick(time);

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

    // draw pings
    const pingEntries = Object.entries(pings);
    if (pingEntries.length >= 1) {
      rect.use();
      renderer.useTexture("system.plain");
      const buffer = rect.allocate(pingEntries.length);
      let offset = 0;
      for (const [, { point, opacity }] of pingEntries) {
        const model = GLM.mat4.create();
        GLM.mat4.translate(model, model, GLM.vec3.fromValues(point.x, point.y, 0.1));
        const color = new Float32Array([1, 1, 1, opacity]);

        buffer.set(model, offset);
        buffer.set(color, offset + model.length);

        offset += rect.instanceSize;
      }
      rect.draw();
    }

    // draw characters
    for (const character of characters) {
      const model = renderer.getAndUseElement<DynamicGLTF>(character.modelId);
      model.setCamera(camera);
      model.draw();
    }
  }

  function handleLoadLevel(levelId: string) {
    const loadLevelMessage: LoadLevelMessage = {
      type: "loadlevel",
      id: getMessageId(),
      sentAt: Math.floor(new Date().getTime() / 1000),
      levelId,
    };
    pendingMessages.push(loadLevelMessage);
    socket.send(JSON.stringify(loadLevelMessage));
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
    const inviteRes = await callAPI(fetch, "POST", "/games/" + data.game.id + "/players", {
      body: formData,
    });
    if (!inviteRes.ok) {
      addToast({
        data: {
          title: "Failed to Invite Player",
          description: inviteRes.error.message,
          level: "danger",
        },
      });
      return;
    }

    const profileRes = await callAPI(fetch, "GET", "/profiles/" + invitee);
    if (!profileRes.ok) {
      addToast({
        data: {
          title: "Failed to Load Invitee's Profile",
          description: profileRes.error.message,
          level: "danger",
        },
      });
      return;
    }

    const newPlayerProfile: APIProfile = await profileRes.data.json();
    profiles = { ...profiles, [newPlayerProfile.username]: newPlayerProfile };
  }

  function handleSendChatMessage(event: SubmitEvent) {
    event.preventDefault();

    const form = new FormData(event.currentTarget as HTMLFormElement);
    const message = form.get("message");
    if (!message || !(message as string).trim() || !data.profile) {
      return;
    }

    const chatMessage: ChatMessage = {
      type: "chat",
      id: getMessageId(),
      sentAt: Math.floor(new Date().getTime() / 1000),
      playerId: data.profile.id,
      content: message as string,
    };
    pendingMessages.push(chatMessage);
    socket.send(JSON.stringify(chatMessage));
    messages.push({
      playerProfile: profiles[data.profile.id],
      content: chatMessage.content,
      isSystemMessage: false,
    });
  }

  async function handleLeaveGame() {
    await goto(resolve("/dashboard"));
  }

  function handleChangeTool(tool: GameMenuTool | null) {
    // TODO: implement the functional tool types, rather than the pure UI GameMenuTool
    selectedTool = tool;
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

  function handlePlayPing(coord: Cartesian) {
    const id = getPingId();
    animator.playValue(
      0,
      2 * Math.PI,
      1,
      (value) => {
        const opacity = Math.abs(Math.sin(value));
        pings[id] = { point: coord, opacity };
      },
      () => {
        delete pings[id];
      },
    );
  }

  async function handleLoadCharacter(mediaId: string, x: number, y: number) {
    const res = await callAPI(fetch, "GET", "/media/" + mediaId + "/content");

    if (!res.ok) {
      assert(false, "load media failed");
      return;
    }

    const src = await res.data.json();
    const modelId = await renderer.createDynamicGLTFElement(src);
    const model = renderer.getElement<DynamicGLTF>(modelId);
    const instance = model.createInstance();
    const transform = GLM.mat4.create();
    GLM.mat4.translate(transform, transform, GLM.vec3.fromValues(x, y, 0));
    instance.transform = transform;
    instance.updateTransforms();
    instance.computeSkinningMatrix();
    characters.push({
      modelId,
      instance,
    });
  }

  function handleSendLoadCharacter(mediaId: string) {
    const loadCharacterMessage: LoadCharacterMessage = {
      type: "loadcharacter",
      id: getMessageId(),
      sentAt: Math.floor(new Date().getTime() / 1000),
      playerId: data.profile!.id,
      mediaId,
      x: 0,
      y: 0,
    };
    pendingMessages.push(loadCharacterMessage);
    socket.send(JSON.stringify(loadCharacterMessage));

    handleLoadCharacter(mediaId, 0, 0);
  }

  function handleDoubleClick(event: MouseEvent) {
    event.preventDefault();

    if (!data.profile) {
      return;
    }

    const coord = renderer.canvasCoordToWorldCoord(camera, event.x, event.y).round();
    const message: PingMessage = {
      type: "ping",
      id: getMessageId(),
      sentAt: Math.floor(new Date().getTime() / 1000),
      playerId: data.profile.id,
      x: coord.x,
      y: coord.y,
    };
    pendingMessages.push(message);
    socket.send(JSON.stringify(message));

    handlePlayPing(coord);
  }

  function loop() {
    frameHandle = window.requestAnimationFrame((ms) => {
      const time = ms / 1000;
      tick(time);
      draw();
      loop();
    });
  }
</script>

<main class="relative grid justify-start h-dvh">
  <canvas class="absolute inset-0 bg-black" bind:this={canvas} ondblclick={handleDoubleClick}
  ></canvas>
  <button
    onclick={() => (showLeftMenu = !showLeftMenu)}
    class="absolute z-10 top-18 left-6 bg-aurora-gray-1200 hover:bg-aurora-gray-1000 active:bg-aurora-gray-800 border-2 border-aurora-gray-400 rounded-md duration-100"
  >
    <span class="sr-only">Show left menu</span>
    <Icon
      icon={`material-symbols:arrow-${showLeftMenu ? "left" : "right"}`}
      width={28}
      height={28}
      class="self-center"
    />
  </button>
  <button
    onclick={() => (showRightMenu = !showRightMenu)}
    class="absolute z-10 top-18 right-6 bg-aurora-gray-1200 hover:bg-aurora-gray-1000 active:bg-aurora-gray-800 border-2 border-aurora-gray-400 rounded-md duration-100"
  >
    <span class="sr-only">Show right menu</span>
    <Icon
      icon={`material-symbols:arrow-${showRightMenu ? "right" : "left"}`}
      width={28}
      height={28}
      class="self-center"
    />
  </button>
  {#if showLeftMenu}
    <GameToolMenu {handleChangeTool} {selectedTool} />
  {/if}
  {#if showRightMenu}
    <GameMenu
      gameName={data.game.name}
      isGameMaster={isGameMaster === true}
      levels={data.levels}
      {onlinePlayers}
      {profiles}
      {messages}
      characters={data.characters}
      {handleLoadLevel}
      {handleSendChatMessage}
      {handleInvitePlayer}
      {handleLeaveGame}
      {handleSendLoadCharacter}
    />
  {/if}
</main>
