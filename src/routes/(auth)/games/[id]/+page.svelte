<script lang="ts">
  import { onMount } from "svelte";
  import { type PageProps } from "./$types";
  import {
    Command,
    GRID_WIDTH,
    MAXIMUM_ZOOM,
    MINIMUM_ZOOM,
    type GameMessage,
  } from "#lib/game/index.js";
  import { MouseButton } from "#lib/controller.js";
  import {
    type Camera,
    DynamicModel,
    ModelInstance,
    PerspectiveCamera,
    Renderer,
    Texture,
  } from "odr";
  import { Cartesian, degToRad } from "#lib/point.js";
  import * as GLM from "gl-matrix";
  import Icon from "@iconify/svelte";
  import GameMenu from "#lib/components/GameMenu.svelte";
  import { resolve } from "$app/paths";
  import { goto } from "$app/navigation";
  import GameToolMenu from "#lib/components/GameToolMenu.svelte";
  import Animator from "#lib/animator.js";
  import type { LevelData } from "#lib/server/database/levels.js";
  import {
    ServerMessageType,
    type DiceRolled,
    type PlayerJoined,
    type ServerMessage,
  } from "#lib/messages.js";
  import { type GameState } from "#lib/server/games.js";
  import { PLAYER_COLOR_HEX, PLAYER_COLOR_RGBA, type PlayerColor } from "#lib/colors.js";
  import { GameTools } from "#lib/game/gametools.svelte.js";
  import { expect, tryFetch, unwrap } from "result";
  import WebGLWindow from "#lib/components/WebGLWindow.svelte";
  import Rectangle from "#lib/rectangle.js";
  import { Level } from "#lib/level.js";

  const PITCH = -degToRad(30);
  const CAMERA_VELOCITY = 50;
  const DEFAULT_ZOOM = 15;

  let { data, params }: PageProps = $props();

  let canvas = $state<HTMLCanvasElement>();
  let isGameMaster = $derived(data.state.players[data.profile.user_id].isGameMaster);
  let messages: GameMessage[] = $state([]);
  let loadingCount = $state(0);
  let showLeftMenu = $state(true);
  let showRightMenu = $state(true);
  let toolData = $state(new GameTools());
  let measureText = $state<HTMLDivElement>();
  let selectedCharacterId = $state<string | null>(null);
  let levelUri = $state<string | null>(null);
  let isDraggingCharacter = $state(false);
  let cameraLocked = $state(false);
  let movementLocked = $state(false);
  let measurePath = $state<{ path: Cartesian[]; cost: number } | undefined>();

  let pingIdHandle = 0;
  let pings: Record<number, { userId: string; point: Cartesian; opacity: number }> = {};
  let characterModelId: number;
  let characterInstances: Record<string, ModelInstance> = {};
  let renderer: Renderer;
  let camera: Camera;
  let animator = new Animator();
  let level: Level | null = null;
  let rectId: number;
  let holdingForward = false;
  let holdingLeft = false;
  let holdingBackward = false;
  let holdingRight = false;
  let draggingCharacterId: number | undefined;
  let isMeasuring = false;

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
    renderer = new Renderer(canvas!, {
      resizeToWindow: true,
      backgroundColor: new Float32Array([0, 0, 0, 1]),
    });
    camera = new PerspectiveCamera(canvas!.width / canvas!.height); // TODO: handle resizing window
    camera.rotateX(PITCH);
    camera.zoom = 100;
    camera.translate(GLM.vec3.fromValues(-GRID_WIDTH / 2, 0, 0));

    rectId = renderer.createElement(Rectangle);
    loadingCount += 2;
    renderer.loadTexture("system.plain", new Texture(1, 1)).then(() => loadingCount--);
    renderer.createDynamicGLBElement("/human.male.glb").then((res) => {
      characterModelId = unwrap(res);
      loadingCount--;
    });

    const eventSource = new EventSource(`/api/games/${params.id}/stream`);

    eventSource.onmessage = async (event) => {
      const message: ServerMessage = JSON.parse(event.data);

      switch (message.type) {
        case ServerMessageType.ChatReceived: {
          const player = data.state.players[message.senderId];
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

          const player: Omit<PlayerJoined, "type"> & Partial<Pick<PlayerJoined, "type">> = message;
          delete player["type"];

          if (!Object.hasOwn(data.state.players, message.userId)) {
            data.state.players = {
              ...data.state.players,
              [message.userId]: player,
            };
          }

          if (player.online) {
            messages.push({ content: `${message.username} has joined the game.` });
          }
          break;
        }
        case ServerMessageType.PlayerLeft: {
          if (Object.hasOwn(data.state.players, message.userId)) {
            data.state.players[message.userId].online = false;
          }

          break;
        }
        case ServerMessageType.CharacterLoaded: {
          await handleLoadCharacter(
            message.userId,
            message.characterId,
            message.x,
            message.y,
            message.rot,
          );
          break;
        }
        case ServerMessageType.CharacterMoved: {
          handleMoveCharacter(message.characterId, message.x, message.y);
          break;
        }
        case ServerMessageType.LevelLoaded: {
          loadingCount++;
          try {
            data.state.characters = {};
            characterInstances = {};
            renderer.getElement<DynamicModel>(characterModelId).clearInstances();
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
          handlePlayPing(message.userId, new Cartesian(message.x, message.y));
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
        case ServerMessageType.DiceRolled: {
          const player = data.state.players[message.userId];
          if (!player) {
            console.error("failing to receive message");
            return;
          }

          messages.push({
            content: `${data.state.players[message.userId].username} rolled ${String(message.total)}`,
            subcontent: message.rolls.join(", "),
          });
          break;
        }
      }
    };

    fetch(`/api/games/${params.id}`).then(async (response) => {
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

    /* TODO re-sync every 30 seconds as a backup
    const syncItrv = setInterval(async () => {
      console.info("Resyncing...");
      const response = await fetch(`/api/games/${params.id}`);
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
    */

    return () => {
      // clearInterval(syncItrv);
      eventSource.close();
    };
  });

  function focusCameraOnPoint({ x, y }: { x: number; y: number }) {
    const cameraWorld = GLM.mat4.create();
    GLM.mat4.invert(cameraWorld, camera.view);

    const cameraTranslation = GLM.vec3.create();
    GLM.mat4.getTranslation(cameraTranslation, cameraWorld);

    const forward = GLM.vec3.fromValues(0, 0, -1);
    GLM.vec3.transformMat4(forward, forward, cameraWorld);
    GLM.vec3.sub(forward, forward, cameraTranslation);
    GLM.vec3.normalize(forward, forward);
    const lookingAt = renderer.getRayWorldIntersect(cameraTranslation, forward);

    const dx = x - lookingAt.x;
    const dy = y - lookingAt.y;

    camera.translate(GLM.vec3.fromValues(-dx, -dy, 0));
  }

  function getLineTransform(from: Cartesian, to: Cartesian): GLM.mat4 {
    const difference = to.subtract(from);
    const halfDifference = difference.scale(0.5);
    const midpoint = from.add(halfDifference);
    const length = Math.sqrt(difference.x * difference.x + difference.y * difference.y);
    const theta = Math.atan(difference.y / difference.x);

    const transform = GLM.mat4.create();
    GLM.mat4.translate(transform, transform, GLM.vec3.fromValues(midpoint.x, midpoint.y, 0.2));
    GLM.mat4.rotate(transform, transform, theta, GLM.vec3.fromValues(0, 0, 1));
    GLM.mat4.scale(transform, transform, GLM.vec3.fromValues(length, 0.2 /* width */, 1));

    return transform;
  }

  function getPlayerColor(userId: string): PlayerColor | "red" {
    const player = data.state.players[userId];
    const color = player.isGameMaster ? "red" : (player as unknown as { color: PlayerColor }).color;
    return color;
  }

  function tick(time: number, dt: number) {
    animator.tick(time);

    if (!cameraLocked) {
      let dx = 0;
      if (holdingLeft) {
        dx++;
      }
      if (holdingRight) {
        dx--;
      }

      let dy = 0;
      if (holdingForward) {
        dy--;
      }
      if (holdingBackward) {
        dy++;
      }

      if (dx != 0 || dy != 0) {
        camera.translate(
          GLM.vec3.fromValues(CAMERA_VELOCITY * dx * dt, CAMERA_VELOCITY * dy * dt, 0),
        );
      }
    }
  }

  function draw() {
    if (!level || loadingCount >= 1) {
      return;
    }

    renderer.clear();

    if (selectedCharacterId && cameraLocked) {
      // focus camera on character
      const instance = characterInstances[selectedCharacterId];
      if (instance) {
        const characterTranslation = GLM.vec3.create();
        GLM.mat4.getTranslation(characterTranslation, instance.transform);
        const [x, y] = characterTranslation;
        focusCameraOnPoint({ x, y });
      }
    }

    level.draw(renderer, camera);

    // draw pings
    const rect = renderer.getAndUseElement<Rectangle>(rectId);
    rect.setCamera(camera);
    const pingEntries = Object.entries(pings);
    if (pingEntries.length >= 1) {
      renderer.useTexture("system.plain");
      const buffer = rect.allocate(pingEntries.length);
      let offset = 0;
      for (const [, { userId, point, opacity }] of pingEntries) {
        const model = GLM.mat4.create();
        GLM.mat4.translate(model, model, GLM.vec3.fromValues(point.x + 0.5, point.y + 0.5, 0.1));
        GLM.mat4.scale(model, model, GLM.vec3.fromValues(2, 2, 1));
        const color = getPlayerColor(userId);
        const rgba = PLAYER_COLOR_RGBA[color].slice();
        rgba[3] = opacity;

        buffer.set(model, offset);
        buffer.set(rgba, offset + model.length);

        offset += rect.instanceSize;
      }
      rect.draw();
    }

    // draw measure line
    if (measurePath && selectedCharacterId) {
      const character = data.state.characters[selectedCharacterId];
      if (character) {
        const { path } = measurePath;
        const color = getPlayerColor(data.profile.user_id);

        renderer.useTexture("system.plain");
        const lineBuffer = rect.allocate(Math.max(0, path.length - 1));

        for (let i = 0; i < path.length - 1; i++) {
          const offset = i * rect.instanceSize;

          const a = path[i];
          const b = path[i + 1];

          const transform = getLineTransform(a, b);
          lineBuffer.set(transform, offset);
          lineBuffer.set(PLAYER_COLOR_RGBA[color], offset + transform.length);
        }

        rect.draw();
      }
    }

    // draw characters
    const model = renderer.getAndUseElement<DynamicModel>(characterModelId);
    model.setCamera(camera);
    model.draw();
  }

  async function handleSync(state: GameState) {
    if (state.levelUri && state.levelUri !== levelUri) {
      levelUri = state.levelUri;

      const response = expect(
        await tryFetch("/api/media/" + state.levelUri),
        "Failed to load level data.",
      );
      await handleLoadLevel(await response.json());
    }

    await Promise.all(
      Object.entries(state.characters ?? {}).map(([characterId, { userId, x, y, rot }]) => {
        return handleLoadCharacter(userId, characterId, x, y, rot);
      }),
    );

    data.state.players = state.players;
  }

  async function handleSendLoadLevel(levelId: string) {
    const res = await fetch(`/api/games/${params.id}/level`, {
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

    const command = Object.values(Command).find((c) => message.startsWith(c));

    const isPrivateRoll = command === Command.PrivateRoll;

    if (!isPrivateRoll) {
      const res = await fetch(`/api/games/${params.id}/chat`, {
        method: "POST",
        body: JSON.stringify({ content: message }),
      });
      if (!res.ok) {
        const index = messages.findIndex((m) => typeof m === "object" && m.content === message);
        if (index !== -1) {
          messages.splice(index, 1);
        }
        return;
      }
    }

    if (command) {
      const [, args] = message.split(command);
      const res = await fetch(`/api/games/${params.id}/command`, {
        method: "POST",
        body: JSON.stringify({
          command,
          args,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        console.error(body.message);
        return;
      }

      if (isPrivateRoll) {
        const rollMessage: DiceRolled = await res.json();
        messages.push({
          content: `${data.profile.username} rolled ${String(rollMessage.total)}`,
          subcontent: rollMessage.rolls.join(", "),
        });
      }
    }
  }

  async function handleLeaveGame() {
    await goto(resolve("dashboard"));
  }

  function handleClear() {
    isMeasuring = false;
    measurePath = undefined;
  }

  async function handleLeftMouseDown(event: MouseEvent) {
    const { x, y } = renderer.canvasCoordToWorldCoord(camera, event.x, event.y);
    const rounded = new Cartesian(x, y).round();

    if (selectedCharacterId && !movementLocked) {
      movementLocked = true;
      const res = await tryFetch(`/api/games/${params.id}/characters/${selectedCharacterId}`, {
        method: "PUT",
        body: JSON.stringify({ x: rounded.x, y: rounded.y, rot: 0 }),
      });
      if (!res.ok || !res.value.ok) {
        movementLocked = false;
        console.warn("Failed to move character.");
      }
    }
  }

  function handleLeftMouseUp(event: MouseEvent) {
    if (isDraggingCharacter) {
      const coord = renderer.canvasCoordToWorldCoord(camera, event.x, event.y);
      const { x, y } = new Cartesian(coord.x, coord.y).round();
      handleSendLoadCharacter(x, y, 0).then((characterId) => {
        selectedCharacterId = characterId;
        cameraLocked = true;
      });
      isDraggingCharacter = false;
      renderer.getElement<DynamicModel>(characterModelId).deleteInstance(draggingCharacterId);
    }
  }

  function handleMove(event: MouseEvent) {
    const character = data.state.characters[selectedCharacterId ?? ""];
    if (level && isMeasuring && character) {
      const { x, y } = renderer.canvasCoordToWorldCoord(camera, event.x, event.y);
      const start = new Cartesian(x, y).round();
      const end = new Cartesian(character.x, character.y);
      measurePath = level.shortestPath(start, end);
      // TODO: support metric
      measureText!.innerHTML = `${Math.ceil(2.5 * measurePath.cost)}ft`; // TODO ass shit
      measureText!.style.left = `${event.x}px`;
      measureText!.style.top = `${event.y}px`;

      const color = getPlayerColor(data.profile.user_id);
      measureText!.style.color = PLAYER_COLOR_HEX[color];
    }

    if (isDraggingCharacter) {
      const model = renderer.getElement<DynamicModel>(characterModelId);
      const { x, y } = renderer.canvasCoordToWorldCoord(camera, event.x, event.y);

      if (draggingCharacterId !== undefined) {
        const existing = model.getInstance(draggingCharacterId);
        if (existing !== undefined) {
          GLM.mat4.identity(existing.transform);
          GLM.mat4.translate(
            existing.transform,
            existing.transform,
            GLM.vec3.fromValues(x, y, 0.5),
          );
          GLM.mat4.rotateX(existing.transform, existing.transform, 0.5 * Math.PI);
          GLM.mat4.scale(existing.transform, existing.transform, GLM.vec3.fromValues(2, 2, 2));
          existing.updateTransforms();
          existing.computeSkinningMatrix();
          return;
        }
      }

      const { id, instance } = model.createInstance();
      const color = getPlayerColor(data.profile.user_id);
      const rgba = PLAYER_COLOR_RGBA[color].slice();
      rgba[3] = 0.4;
      instance.defaultMaterial = {
        name: "color.solid",
        baseColorFactor: rgba,
        alphaMode: "BLEND",
        alphaCutoff: 0,
        doubleSided: false,
      };
      GLM.mat4.translate(instance.transform, instance.transform, GLM.vec3.fromValues(x, y, 0.5));
      GLM.mat4.rotateX(instance.transform, instance.transform, 0.5 * Math.PI);
      GLM.mat4.scale(instance.transform, instance.transform, GLM.vec3.fromValues(2, 2, 2));
      instance.updateTransforms();
      instance.computeSkinningMatrix();
      draggingCharacterId = id;
    }
  }

  function handleScroll(event: WheelEvent) {
    const before = renderer.canvasCoordToWorldCoord(camera, event.x, event.y);
    const zoomDelta = 1 + Math.pow(camera.zoom, 2.25) / 1000;
    const newZoom = camera.zoom + (event.deltaY > 0 ? zoomDelta : -zoomDelta);
    camera.zoom = Math.min(MAXIMUM_ZOOM, Math.max(MINIMUM_ZOOM, newZoom));
    const after = renderer.canvasCoordToWorldCoord(camera, event.x, event.y);
    const dx = after.x - before.x;
    const dy = after.y - before.y;
    camera.translate(GLM.vec3.fromValues(dx, dy, 0));
  }

  function handlePlayPing(userId: string, coord: Cartesian) {
    const id = getPingId();
    animator.playValue(
      0,
      2 * Math.PI,
      1,
      (value) => {
        const opacity = Math.abs(Math.sin(value));
        pings[id] = { point: coord, userId, opacity };
      },
      () => {
        delete pings[id];
      },
    );
  }

  async function handleLoadCharacter(
    userId: string,
    characterId: string,
    x: number,
    y: number,
    rot = 0,
  ) {
    const model = renderer.getElement<DynamicModel>(characterModelId);
    const color = getPlayerColor(userId);

    const { instance } = model.createInstance();
    instance.defaultMaterial = {
      name: "color.solid",
      baseColorFactor: PLAYER_COLOR_RGBA[color],
      alphaMode: "OPAQUE",
      alphaCutoff: 0,
      doubleSided: false,
    };

    const transform = GLM.mat4.create();
    GLM.mat4.translate(transform, transform, GLM.vec3.fromValues(x, y, 0));
    GLM.mat4.rotateX(transform, transform, 0.5 * Math.PI);
    GLM.mat4.rotateZ(transform, transform, rot);
    GLM.mat4.scale(transform, transform, GLM.vec3.fromValues(2, 2, 2));
    instance.transform = transform;
    instance.applyAnimation("Idle", 0);
    instance.updateTransforms();
    instance.computeSkinningMatrix();
    characterInstances[characterId] = instance;

    data.state.characters[characterId] = {
      userId,
      x,
      y,
      rot,
    };

    if (userId === data.profile.user_id) {
      selectedCharacterId = characterId;
    }
  }

  async function handleSendLoadCharacter(x: number, y: number, rot = 0) {
    const characterId = crypto.randomUUID();
    const res = await fetch(`/api/games/${params.id}/characters`, {
      method: "POST",
      body: JSON.stringify({ x, y, rot, characterId }),
    });
    if (!res.ok) {
      console.error("failed to load character");
      return null;
    }

    return characterId;
  }

  function handleMoveCharacter(characterId: string, x: number, y: number) {
    if (!level) {
      return;
    }

    const { x: prevX, y: prevY } = data.state.characters[characterId];
    data.state.characters[characterId].x = x;
    data.state.characters[characterId].y = y;

    const from = new Cartesian(prevX, prevY);
    const to = new Cartesian(x, y);

    const { path } = level.shortestPath(from, to);
    const duration = 0.15 * path.length;

    const instance = characterInstances[characterId];
    const anim = instance.model.animations["Run"];

    animator.playValue(
      0,
      1,
      duration,
      (value) => {
        const node = value * (path.length - 1);
        const a = Math.floor(node);
        const b = Math.ceil(node);
        const frac = node - Math.trunc(node);
        const aNode = path[a];
        const bNode = path[b];
        const { x, y } = Cartesian.lerp(aNode, bNode, frac);
        const rad = aNode.angle(bNode);

        instance.transform = GLM.mat4.create();
        GLM.mat4.translate(instance.transform, instance.transform, GLM.vec3.fromValues(x, y, 0));
        GLM.mat4.rotateZ(instance.transform, instance.transform, rad + 0.5 * Math.PI);
        GLM.mat4.rotateX(instance.transform, instance.transform, 0.5 * Math.PI);
        GLM.mat4.scale(instance.transform, instance.transform, GLM.vec3.fromValues(2, 2, 2));

        const t = (value * duration) % anim.duration;
        unwrap(instance.applyAnimation("Run", t));
        instance.updateTransforms();
        unwrap(instance.computeSkinningMatrix());
      },
      () => {
        unwrap(instance.applyAnimation("Idle", 0));
        instance.updateTransforms();
        unwrap(instance.computeSkinningMatrix());

        if (characterId === selectedCharacterId) {
          movementLocked = false;
        }
      },
    );
  }

  async function handleLoadLevel(loadedLevel: LevelData) {
    level = Level.load(loadedLevel);
    await level.loadAssets(renderer);

    camera.zoom = DEFAULT_ZOOM;

    const ownedCharacter = Object.entries(data.state.characters).find(
      ([, { userId }]) => userId === data.profile.user_id,
    );
    if (ownedCharacter) {
      const [characterId] = ownedCharacter;
      selectedCharacterId = characterId;
      cameraLocked = true;
    } else {
      selectedCharacterId = null;
      focusCameraOnPoint(level.center);
    }
  }

  async function handleMiddleMouseDown(event: MouseEvent) {
    event.preventDefault();

    if (!data.profile) {
      return;
    }

    const { x, y } = renderer.canvasCoordToWorldCoord(camera, event.x, event.y);
    const coord = new Cartesian(x, y).round().scale(0.5).floor().scale(2.0);
    handlePlayPing(data.profile.user_id, coord);

    const res = await fetch(`/api/games/${params.id}/pings`, {
      method: "POST",
      body: JSON.stringify({ x: coord.x, y: coord.y }),
    });
    if (!res.ok) {
      console.error("failed to ping");
    }
  }
</script>

<main class="relative grid h-dvh justify-start overflow-hidden">
  <WebGLWindow
    {draw}
    {tick}
    bind:canvas
    onpointerleave={handleClear}
    onleftmousedown={handleLeftMouseDown}
    onleftmouseup={handleLeftMouseUp}
    onmiddlemousedown={handleMiddleMouseDown}
    onpointermove={handleMove}
    onwheel={handleScroll}
    onrightmousedown={() => {
      isMeasuring = true;
    }}
    onrightmouseup={() => {
      isMeasuring = false;
      measurePath = undefined;
    }}
    ondbltap={(event) => {
      if (event.key === " ") {
        cameraLocked = true;
        camera.zoom = DEFAULT_ZOOM;
      }
    }}
    onkeydown={(event) => {
      switch (event.key) {
        case "w": {
          holdingForward = true;
          break;
        }
        case "a": {
          holdingLeft = true;
          break;
        }
        case "s": {
          holdingBackward = true;
          break;
        }
        case "d": {
          holdingRight = true;
          break;
        }
        default:
          return;
      }
      cameraLocked = false;
    }}
    onkeyup={(event) => {
      switch (event.key) {
        case "w": {
          holdingForward = false;
          break;
        }
        case "a": {
          holdingLeft = false;
          break;
        }
        case "s": {
          holdingBackward = false;
          break;
        }
        case "d": {
          holdingRight = false;
          break;
        }
      }
    }}
    class="absolute inset-0 bg-black"
  />
  <button
    onclick={() => (showLeftMenu = !showLeftMenu)}
    class="absolute top-18 left-6 z-10 rounded-md border-2 border-aurora-gray-400 bg-aurora-gray-1200 duration-100 hover:bg-aurora-gray-1000 active:bg-aurora-gray-800"
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
    class="absolute top-18 right-6 z-10 rounded-md border-2 border-aurora-gray-400 bg-aurora-gray-1200 duration-100 hover:bg-aurora-gray-1000 active:bg-aurora-gray-800"
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
    <GameToolMenu {toolData} />
  {/if}
  {#if showRightMenu}
    <GameMenu
      gameId={params.id}
      isGameMaster={isGameMaster === true}
      levels={data.levels}
      players={data.state.players}
      {messages}
      friends={data.friends}
      handleLoadLevel={handleSendLoadLevel}
      {handleSendChatMessage}
      {handleLeaveGame}
    />
  {/if}
  {#if !selectedCharacterId && levelUri}
    <button
      onpointerup={(event) => {
        if (event.button === MouseButton.Left) {
          isDraggingCharacter = false;
        }
      }}
      onpointerdown={(event) => {
        if (event.button === MouseButton.Left) {
          isDraggingCharacter = true;
        }
      }}
      class="absolute bottom-4 z-10 justify-self-center bg-aurora-gray-1200 text-white"
    >
      {isDraggingCharacter ? "Drop Anywhere On The Level" : "Drag This To Add Character To Level"}
    </button>
  {/if}
  <ul class="absolute right-6 bottom-4 z-10 flex gap-4">
    <li data-visible={cameraLocked} class="data-[visible=false]:hidden">Camera locked</li>
    <li data-visible={movementLocked} class="data-[visible=false]:hidden">Walking</li>
  </ul>
  <div
    data-active={!!measurePath}
    bind:this={measureText}
    class="pointer-events-none absolute z-10 hidden p-1 text-2xl font-bold text-shadow-aurora-gray-1400 text-shadow-sm data-[active=true]:flex"
  ></div>
</main>
