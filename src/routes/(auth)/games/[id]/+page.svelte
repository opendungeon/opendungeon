<script lang="ts">
  import Animator from "#lib/animator.ts";
  import {
    PLAYER_COLOR_HEX,
    PLAYER_COLOR_LINEAR,
    PLAYER_COLOR_RGBA,
    type PlayerColor,
  } from "#lib/colors.ts";
  import GameMenu from "#lib/components/GameMenu.svelte";
  import GameToolMenu from "#lib/components/GameToolMenu.svelte";
  import WebGLWindow from "#lib/components/WebGLWindow.svelte";
  import { MouseButton } from "#lib/controller.ts";
  import { GameTools } from "#lib/game/gametools.svelte.ts";
  import { GRID_WIDTH, MAXIMUM_ZOOM, MINIMUM_ZOOM } from "#lib/game/index.ts";
  import { GameClient } from "#lib/gameclient.ts";
  import { Level } from "#lib/level.ts";
  import { Point, degToRad, type Coord } from "#lib/point.ts";
  import Rectangle from "#lib/rectangle.ts";
  import { type GameEventHandlers } from "#lib/server/games.ts";
  import { calculatePosition } from "#lib/utils.ts";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { type PageProps } from "./$types";
  import Icon from "@iconify/svelte";
  import {
    type Camera,
    DynamicModel,
    ModelInstance,
    PerspectiveCamera,
    Renderer,
    Texture,
  } from "@opendungeon/renderer";
  import { tryFetch, unwrap } from "@opendungeon/result";
  import * as GLM from "gl-matrix";
  import { onMount } from "svelte";

  const PITCH = -degToRad(30);
  const CAMERA_VELOCITY = 50;
  const DEFAULT_ZOOM = 15;

  let { data, params }: PageProps = $props();

  let canvas = $state<HTMLCanvasElement>();
  let messages: { userId: string; message: string }[] = $state([]);
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
  let measurePath = $state<{ path: Point[]; cost: number } | undefined>();
  let isGameMaster = $derived(data.state.players[data.profile.user_id].isGameMaster);
  let client = $derived(new GameClient(params.id));

  let pings: Record<number, { userId: string; point: Point; opacity: number }> = {};
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

    client.onchat = handleChat;
    client.onplayeradd = handlePlayerAdd;
    client.onplayerjoin = handlePlayerJoin;
    client.onplayerleave = handlePlayerLeave;
    client.oncharacterload = handleCharacterLoad;
    client.oncharactermove = handleCharacterMove;
    client.onping = handlePing;
    client.onlevelload = handleLoadLevel;
    // add listeners

    loadingCount++;
    client.start().then(() => loadingCount--);

    return () => {
      client.destroy();
    };
  });

  function focusCameraOnPoint({ x, y }: Coord) {
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

  function getLineTransform(from: Point, to: Point): GLM.mat4 {
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

    // TODO: update characters and such

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
    } else if (selectedCharacterId) {
      const instance = characterInstances[selectedCharacterId];
      if (instance) {
        const characterTranslation = GLM.vec3.create();
        GLM.mat4.getTranslation(characterTranslation, instance.transform);
        const [x, y] = characterTranslation;
        focusCameraOnPoint({ x, y });
      }
    }
  }

  function draw() {
    if (!level || loadingCount >= 1) {
      return;
    }

    renderer.clear();

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

  /*
  TODO: actually get and sync game state at client.start()

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
  */

  async function handleChat(event: GameEventHandlers["chat"]) {
    messages.push(event);
  }

  async function handlePlayerAdd(event: GameEventHandlers["playeradd"]) {
    data.state.players[event.player.userId] = event.player;
  }

  async function handlePlayerJoin(event: GameEventHandlers["playerjoin"]) {
    data.state.players[event.userId].online = true;
  }

  async function handlePlayerLeave(event: GameEventHandlers["playerleave"]) {
    data.state.players[event.userId].online = false;
  }

  async function handleCharacterLoad(event: GameEventHandlers["characterload"]) {
    const lastMove = {
      path: [event.coord],
      velocity: 0,
      startTime: 0,
    };
    data.state.characters[event.characterId] = {
      characterId: event.characterId,
      userId: event.userId,
      lastMove,
    };

    loadingCount++;
    // add character to renderer
    loadingCount--;
  }

  async function handleCharacterMove(event: GameEventHandlers["charactermove"]) {
    data.state.characters[event.characterId].lastMove = event.move;
  }

  async function handlePing(event: GameEventHandlers["ping"]) {
    // handle all the ping shit
  }

  async function handleLoadLevel(event: GameEventHandlers["levelload"]) {
    level = Level.load(event.data);
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

  function handleClear() {
    isMeasuring = false;
    measurePath = undefined;
  }

  async function handleLeftMouseDown(event: MouseEvent) {
    const { x, y } = renderer.canvasCoordToWorldCoord(camera, event.x, event.y);
    const rounded = new Point(x, y).round();

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
      const rounded = new Point(coord.x, coord.y).round();
      client.loadCharacter(rounded).then((res) => {
        if (res.ok) {
          cameraLocked = true;
        }
      });
      isDraggingCharacter = false;
      renderer.getElement<DynamicModel>(characterModelId).deleteInstance(draggingCharacterId);
    }
  }

  function handleMove(event: MouseEvent) {
    const character = data.state.characters[selectedCharacterId ?? ""];
    if (level && isMeasuring && character) {
      const { x, y } = renderer.canvasCoordToWorldCoord(camera, event.x, event.y);
      const start = calculatePosition(performance.now(), character.lastMove!);
      const end = new Point(x, y).round();
      measurePath = level.shortestPath(start, end);
      // TODO: support metric
      measureText!.innerHTML = `${Math.ceil(2.5 * measurePath.cost)}ft`;
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
      const linear = PLAYER_COLOR_LINEAR[color].slice();
      linear[3] = 0.4;
      instance.defaultMaterial = {
        name: "color.solid",
        baseColorFactor: linear,
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

  async function handleMiddleMouseDown(event: MouseEvent) {
    event.preventDefault();

    if (!data.profile) {
      return;
    }

    const { x, y } = renderer.canvasCoordToWorldCoord(camera, event.x, event.y);
    const coord = new Point(x, y).round().scale(0.5).floor().scale(2.0);
    await client.ping(coord).then((res) => !res.ok && console.error("failed to ping"));
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
      onChat={client.chat}
      onLoadLevel={client.loadLevel}
      onLeaveGame={() => goto(resolve("/(auth)/dashboard"))}
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
