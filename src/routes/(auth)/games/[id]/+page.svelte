<script lang="ts">
  import { onMount } from "svelte";
  import { type PageProps } from "./$types";
  import { type GameMessage } from "$lib/game";
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
  import Icon from "@iconify/svelte";
  import GameMenu from "$lib/components/GameMenu.svelte";
  import { resolve } from "$app/paths";
  import { goto } from "$app/navigation";
  import { GameMenuTool } from "$lib/game";
  import GameToolMenu from "$lib/components/GameToolMenu.svelte";
  import Animator from "$lib/renderer/animator";
  import type InstanceGLTF from "$lib/renderer/model/instance";
  import DynamicGLTF from "$lib/renderer/model/dynamic";
  import type { LevelData } from "$lib/server/database/levels";
  import { ServerMessageType, type ServerMessage } from "$lib/messages";
  import type { GamePlayer, GameState } from "$lib/server/live/state";
  import decorations from "$lib/assets/decorations.json";
  import type StaticModel from "$lib/renderer/model/static";

  let { data }: PageProps = $props();

  let canvas = $state<HTMLCanvasElement>();
  let isGameMaster = $derived(data.profile && data.profile.user_id === data.game.game_master_id);
  let players: Record<string, Omit<GamePlayer, "userId">> = $state({});
  let messages: (GameMessage | string)[] = $state([]);
  let loadingCount = $state(1);
  let showLeftMenu = $state(true);
  let showRightMenu = $state(true);
  let selectedTool: GameMenuTool | null = $state(GameMenuTool.Select); // TODO: Implement functional tool type, rather than pure UI state
  let pingIdHandle = 0;
  let pings: Record<number, { point: Cartesian; opacity: number }> = {};
  let characters: {
    modelId: number;
    instance: InstanceGLTF;
  }[] = [];
  let controller: Controller;
  let renderer: Renderer;
  let camera: Camera;
  let animator = new Animator();
  let levelData: LevelData | null;
  let frameHandle = -1;
  let input: { type: "none" } | { type: "dragging"; button: number } = { type: "none" };
  let rectId: number;
  let decorationElementLookup: Record<string, number> = {};
  let decorationDataLookup: Record<
    string,
    { x: number; y: number; rotation: number; scale: number }[]
  > = {};

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
    renderer.loadTexture("system.plain", new Texture(1, 1)).then(() => loadingCount--);

    loop();

    const eventSource = new EventSource(`/api/games/${data.game.game_id}/stream`);

    eventSource.onmessage = async (event) => {
      const message: ServerMessage = JSON.parse(event.data);

      switch (message.type) {
        case ServerMessageType.ChatReceived: {
          if (message.senderId === data.profile.user_id) {
            return;
          }

          const player = players[message.senderId];
          if (!player) {
            console.error("failing to receive message");
            return;
          }

          messages.push({
            username: player.username,
            avatarUri: player.avatarUri,
            content: message.content,
          });
          break;
        }
        case ServerMessageType.PlayerJoined: {
          if (message.userId === data.profile.user_id) {
            return;
          }

          players[message.userId] = {
            username: message.username,
            avatarUri: message.avatarUri,
            permissionLevel: message.permissionLevel,
          };

          messages.push(`${message.username} has joined the game.`);
          break;
        }
        case ServerMessageType.PlayerLeft: {
          const player = players[message.userId];
          messages.push(`${player.username} has left the game.`);
          delete players[message.userId];
          break;
        }
        case ServerMessageType.CharacterLoaded: {
          await handleLoadCharacter(message.uri, message.x, message.y);
          break;
        }
        case ServerMessageType.CharacterMoved: {
          // TODO: character move
          break;
        }
        case ServerMessageType.LevelLoaded: {
          loadingCount++;
          try {
            await handleLoadLevel(message.data);
          } catch (e) {
            console.error(e);
          } finally {
            loadingCount--;
          }
          break;
        }
        case ServerMessageType.MapPinged: {
          if (message.userId === data.profile.user_id) {
            return;
          }

          // TODO: color the ping per player
          handlePlayPing(new Cartesian(message.x, message.y));
          break;
        }
        case ServerMessageType.DataSynced: {
          loadingCount++;
          try {
            await handleSync(message.state);
          } catch (e) {
            console.error(e);
          } finally {
            loadingCount--;
          }
          break;
        }
      }
    };

    fetch(`/api/games/${data.game.game_id}`).then(async (response) => {
      if (!response.ok) {
        // TODO: handle this
        console.error("failed to get game state");
        return;
      }

      const state: GameState = await response.json();
      loadingCount++;
      await handleSync(state);
      loadingCount--;
    });

    // re-sync every 30 seconds as a backup
    const syncItrv = setInterval(async () => {
      console.info("Resyncing...");
      const response = await fetch(`/api/games/${data.game.game_id}`);
      if (!response.ok) {
        console.error("failed to sync");
        return;
      }

      const state: GameState = await response.json();
      loadingCount++;
      await handleSync(state);
      loadingCount--;
      console.info("Resynced.");
    }, 30_000);

    return () => {
      clearInterval(syncItrv);
      eventSource.close();
      window.cancelAnimationFrame(frameHandle);
    };
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
    if (!levelData || loadingCount >= 1) {
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

    // draw decorations
    for (let i = 0; i < levelData.decorations.length; i++) {
      const key = levelData.decorations[i];
      const elementId = decorationElementLookup[key];
      const data = decorationDataLookup[key];

      if (elementId === undefined || !data) {
        continue;
      }
      const element = renderer.getAndUseElement<StaticModel>(elementId);
      element.setCamera(camera);
      const buffer = element.allocate(data.length);

      for (let j = 0; j < data.length; j++) {
        const offset = j * element.instanceSize;

        const transform = GLM.mat4.create();
        const { x, y, rotation, scale } = data[j];
        const rounded = new Cartesian(x, y).scale(0.5).round().scale(2);
        GLM.mat4.translate(
          transform,
          transform,
          GLM.vec3.fromValues(rounded.x - 0.5, rounded.y - 0.5, 0),
        );
        GLM.mat4.rotateZ(transform, transform, rotation);
        GLM.mat4.rotateX(transform, transform, degToRad(90));
        GLM.mat4.scale(transform, transform, GLM.vec3.fromValues(2 * scale, 2 * scale, 2 * scale));

        buffer.set(transform, offset);
      }

      element.draw();
    }

    // draw characters
    for (const character of characters) {
      const model = renderer.getAndUseElement<DynamicGLTF>(character.modelId);
      model.setCamera(camera);
      model.draw();
    }
  }

  async function handleSync(state: GameState) {
    if (state.level) {
      await handleLoadLevel(state.level);
    }

    await Promise.all(
      Object.values(state.characters ?? {}).map(({ uri, x, y }) => {
        return handleLoadCharacter(uri, x, y);
      }),
    );

    players = {
      ...state.players,
      [data.profile.user_id]: {
        username: data.profile.username,
        avatarUri: data.profile.avatar_uri,
        permissionLevel: isGameMaster ? "game_master" : "player",
      },
    };
  }

  async function handleSendLoadLevel(levelId: string) {
    const res = await fetch(`/api/games/${data.game.game_id}/level`, {
      method: "PUT",
      body: JSON.stringify({ levelId }),
    });
    if (!res.ok) {
      console.error("failed to load level");
    }
  }

  async function handleSendChatMessage(event: SubmitEvent) {
    event.preventDefault();

    const form = new FormData(event.currentTarget as HTMLFormElement);
    const message = form.get("message") as string;
    if (!message || !message.trim() || !data.profile) {
      return;
    }

    messages.push({
      username: data.profile.username,
      avatarUri: data.profile.avatar_uri,
      content: message,
    });

    const res = await fetch(`/api/games/${data.game.game_id}/chat`, {
      method: "POST",
      body: JSON.stringify({ content: message }),
    });
    if (!res.ok) {
      // TODO: rework this to pop the correct message, not just the last one
      messages.pop();
    }
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

  async function handleLoadCharacter(uri: string, x: number, y: number) {
    const modelId = await renderer.createDynamicGLBElement("/api/media/" + uri);
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

  async function handleSendLoadCharacter(characterId: string) {
    const res = await fetch(`/api/games/${data.game.game_id}/characters`, {
      method: "POST",
      body: JSON.stringify({ x: 0, y: 0, characterId }),
    });
    if (!res.ok) {
      console.error("failed to load character");
    }
  }

  async function handleLoadLevel(loadedLevel: LevelData) {
    const textureUriLookup = loadedLevel.textures.reduce<Record<string, string>>((prev, key) => {
      const cellTexture = data.cellTextures.find((cellTexture) => cellTexture.key === key);
      if (!cellTexture) {
        throw new Error(`Failed to find cell texture with key "${key}".`);
      }
      return { ...prev, [key]: cellTexture.uri };
    }, {});

    // load decorations data lookup
    decorationDataLookup = {};
    for (let row = 0; row < loadedLevel.grid.length; row++) {
      for (let col = 0; col < loadedLevel.grid.length; col++) {
        const cell = loadedLevel.grid[row][col];
        if (!cell || !cell.decoration) {
          continue;
        }

        const key = loadedLevel.decorations[cell.decoration.index];
        if (!decorationDataLookup[key]) {
          decorationDataLookup[key] = [
            { x: col, y: row, rotation: cell.decoration.rotation, scale: cell.decoration.scale },
          ];
        } else {
          decorationDataLookup[key].push({
            x: col,
            y: row,
            rotation: cell.decoration.rotation,
            scale: cell.decoration.scale,
          });
        }
      }
    }

    await Promise.all([
      ...loadedLevel.textures.map(async (texture) => {
        const uri = `/api/media/${textureUriLookup[texture]}`;
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
      ...loadedLevel.decorations.map(async (key) => {
        const { uri } = decorations[key];
        const elementId = await renderer.createStaticGLBElement(uri);
        decorationElementLookup[key] = elementId;
      }),
    ]);

    levelData = loadedLevel;
  }

  async function handleDoubleClick(event: MouseEvent) {
    event.preventDefault();

    if (!data.profile) {
      return;
    }

    const coord = renderer.canvasCoordToWorldCoord(camera, event.x, event.y).round();
    handlePlayPing(coord);

    const res = await fetch(`/api/games/${data.game.game_id}/pings`, {
      method: "POST",
      body: JSON.stringify({ x: coord.x, y: coord.y }),
    });
    if (!res.ok) {
      console.error("failed to ping");
    }
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
      {players}
      {messages}
      characters={data.characters}
      handleLoadLevel={handleSendLoadLevel}
      {handleSendChatMessage}
      {handleLeaveGame}
      {handleSendLoadCharacter}
    />
  {/if}
</main>
