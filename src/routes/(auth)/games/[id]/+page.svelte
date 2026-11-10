<script lang="ts">
  import Animator from "#lib/animator.ts";
  import Billboard from "#lib/billboard.ts";
  import {
    PLAYER_COLOR_HEX,
    PLAYER_COLOR_LINEAR,
    PLAYER_COLOR_RGBA,
    type PlayerColor,
  } from "#lib/colors.ts";
  import GameMenu, { type Message } from "#lib/components/GameMenu.svelte";
  import GameToolMenu from "#lib/components/GameToolMenu.svelte";
  import StaticModelViewer from "#lib/components/StaticModelViewer.svelte";
  import WebGLWindow from "#lib/components/WebGLWindow.svelte";
  import { MouseButton } from "#lib/controller.ts";
  import { Bezier } from "#lib/curves/bezier.ts";
  import type { Curve } from "#lib/curves/index.ts";
  import { GameTools } from "#lib/game/gametools.svelte.ts";
  import { GameMenuTab, GRID_WIDTH, MAXIMUM_ZOOM, MINIMUM_ZOOM } from "#lib/game/index.ts";
  import { GameClient } from "#lib/gameclient.ts";
  import { Level } from "#lib/level.ts";
  import { Point, degToRad } from "#lib/point.ts";
  import Rectangle from "#lib/rectangle.ts";
  import type { LevelData } from "#lib/server/database/levels.ts";
  import {
    type GameCharacter,
    type GameEventHandlers,
    type GameState,
  } from "#lib/server/games/index.ts";
  import { clamp } from "#lib/utils.ts";
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
  const CAMERA_VELOCITY = 0.05;
  const DEFAULT_ZOOM = 15;
  const CHARACTER_LABEL_Z_POSITION = 4;
  const DEFAULT_CHARACTER_VELOCITY = 0.008;
  const PING_DURATION = 2000;

  type ClientCharacter = Omit<GameCharacter, "lastMove"> & {
    velocity: number;
    lastMoveTime: number;
    curve: Curve;
  };

  type ClientGameState = Omit<GameState, "characters"> & {
    characters: Record<string, ClientCharacter>;
  };

  let { data, params }: PageProps = $props();

  let canvas = $state<HTMLCanvasElement>();
  let messages: Message[] = $state([]);
  let loadingCount = $state(0);
  let showLeftMenu = $state(true);
  let showRightMenu = $state(true);
  let toolData = $state(new GameTools());
  let measureText = $state<HTMLDivElement>();
  let selectedCharacterId = $state<string | null>(null);
  let isDraggingCharacter = $state(false);
  let cameraLocked = $state(false);
  let characterNameOverlay = $state<HTMLDivElement>();
  let characters = $derived(data.characters);
  let measurePath = $state<{ path: Point[]; cost: number } | undefined>();
  let isGameMaster = $derived(data.state.players[data.profile.user_id].isGameMaster);
  let client = $derived(new GameClient(params.id));
  let gameState = $derived<ClientGameState>(convertServerToClientState(data.state));
  let selectedGameMenuTab = $state<GameMenuTab>(GameMenuTab.Chat);
  let chatInputActive = $state(false);

  let pings: Record<string, { userId: string; point: Point; opacity: number; createdAt: number }> =
    {};
  let characterModelId: number;
  let billboardId: number;
  let characterInstances: Record<string, { id: number; instance: ModelInstance }> = {};
  let characterNames: Record<string, HTMLDivElement> = {};
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
    loadingCount += 3;
    Promise.all([
      renderer.createDynamicGLBElement("/human.male.glb"),
      renderer.createElement(Billboard),
      renderer.loadTexture("system.plain", new Texture(1, 1)),
      renderer.loadTexture("indicator.ping", "/indicator.ping.webp", { mode: "nearest" }),
      renderer.loadTexture("indicator.walk", "/indicator.walk.webp", { mode: "nearest" }),
    ]).then(([res, id]) => {
      characterModelId = unwrap(res);
      billboardId = id;
      loadingCount -= 3;
    });

    client.onload = handleLoad;
    client.onchat = handleChat;
    client.onplayeradd = handlePlayerAdd;
    client.onplayerjoin = handlePlayerJoin;
    client.onplayerleave = handlePlayerLeave;
    client.oncharacterload = handleCharacterLoad;
    client.oncharactermove = handleCharacterMove;
    client.oncharacterunload = handleCharacterUnload;
    client.onping = handlePing;
    client.onlevelload = handleLoadLevel;
    client.onroll = handleRoll;

    loadingCount++;
    client.start().then((res) => {
      unwrap(res);
      loadingCount--;
    });

    return () => {
      client.destroy();
    };
  });

  function convertServerToClientState(serverState: GameState): ClientGameState {
    return {
      ...serverState,
      characters: Object.fromEntries(
        Object.entries(serverState.characters).map(([characterId, character]) => [
          characterId,
          convertCharacterToClientCharacter(character),
        ]),
      ),
    };
  }

  function convertCharacterToClientCharacter(serverCharacter: GameCharacter): ClientCharacter {
    const lastMove = serverCharacter.lastMove!;
    const curve = unwrap(Bezier.fromCoords(lastMove.path));
    const clientCharacter = {
      userId: serverCharacter.userId,
      name: serverCharacter.name,
      velocity: lastMove.velocity,
      lastMoveTime: lastMove.startTime,
      characterId: serverCharacter.characterId,
      curve,
    };
    return clientCharacter;
  }

  function getCameraLookingAt(): Point {
    const cameraWorld = GLM.mat4.create();
    GLM.mat4.invert(cameraWorld, camera.view);

    const cameraTranslation = GLM.vec3.create();
    GLM.mat4.getTranslation(cameraTranslation, cameraWorld);

    const forward = GLM.vec3.fromValues(0, 0, -1);
    GLM.vec3.transformMat4(forward, forward, cameraWorld);
    GLM.vec3.sub(forward, forward, cameraTranslation);
    GLM.vec3.normalize(forward, forward);
    const lookingAt = renderer.getRayWorldIntersect(cameraTranslation, forward);

    return Point.fromCoord(lookingAt);
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
    const player = gameState.players[userId];
    const color = player.isGameMaster ? "red" : (player as unknown as { color: PlayerColor }).color;
    return color;
  }

  function tick(time: number, dt: number) {
    animator.tick(time);

    // TODO: handle setting animation state in draw (will require storing animation state somewhere)
    if (loadingCount === 0) {
      for (const character of Object.values(gameState.characters)) {
        const inst = characterInstances[character.characterId];
        if (!inst) {
          // TODO: figure out why this occurs.
          console.warn("Instance not yet loaded.");
          continue;
        }

        const t =
          character.curve.length === 0
            ? 0
            : clamp(
                (character.velocity * (time - character.lastMoveTime)) / character.curve.length,
                0,
                1,
              );
        const { x, y } = character.curve.getPoint(t);
        const rad = character.curve.getAngle(t);
        const isMoving = 0 < t && t < 1;

        GLM.mat4.identity(inst.instance.transform);
        GLM.mat4.translate(
          inst.instance.transform,
          inst.instance.transform,
          GLM.vec3.fromValues(x, y, 0.1),
        );
        GLM.mat4.rotateZ(inst.instance.transform, inst.instance.transform, rad + 0.5 * Math.PI);
        GLM.mat4.rotateX(inst.instance.transform, inst.instance.transform, 0.5 * Math.PI);
        GLM.mat4.scale(
          inst.instance.transform,
          inst.instance.transform,
          GLM.vec3.fromValues(2, 2, 2),
        );

        const animation = isMoving ? "Run" : "Idle";
        const { duration } = inst.instance.model.animations[animation];
        const animationFrame = (time / 1000) % duration;
        unwrap(inst.instance.applyAnimation(animation, animationFrame));
        inst.instance.updateTransforms();
        unwrap(inst.instance.computeSkinningMatrix());
      }
    }

    for (const [key, value] of Object.entries(pings)) {
      const t = clamp(time - value.createdAt, 0, PING_DURATION) / PING_DURATION;
      if (t >= 1) {
        delete pings[key];
        continue;
      }

      const opacity = Math.abs(Math.sin(t * 3 * Math.PI));
      pings[key] = { ...value, opacity };
    }

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
      const inst = characterInstances[selectedCharacterId];
      if (inst) {
        const characterTranslation = GLM.vec3.create();
        GLM.mat4.getTranslation(characterTranslation, inst.instance.transform);
        const [x, y] = characterTranslation;
        const point = new Point(x, y + 1);
        const lookingAt = getCameraLookingAt();
        const t = 1 - Math.exp(-dt / 200);
        const midpoint = Point.lerp(lookingAt, point, t);
        const dx = midpoint.x - lookingAt.x;
        const dy = midpoint.y - lookingAt.y;
        camera.translate(GLM.vec3.fromValues(-dx, -dy, 0));
      }
    }
  }

  function draw(time: number) {
    if (!level || loadingCount >= 1) {
      return;
    }

    renderer.clear();

    level.draw(renderer, camera);

    // draw pings
    const pingValues = Object.values(pings);
    if (pingValues.length >= 1) {
      const billboard = renderer.getAndUseElement<Billboard>(billboardId);
      renderer.useTexture("indicator.ping");
      billboard.setCamera(camera);
      const buffer = billboard.allocate(pingValues.length);

      for (let i = 0; i < pingValues.length; i++) {
        const { userId, opacity, point } = pingValues[i];

        const offset = i * billboard.instanceSize;
        const transform = GLM.mat4.create();
        GLM.mat4.translate(
          transform,
          transform,
          GLM.vec3.fromValues(point.x + 0.5, point.y + 0.5, 1),
        );
        GLM.mat4.scale(transform, transform, GLM.vec3.fromValues(2, 2, 2));

        const color = getPlayerColor(userId);
        const rgba = PLAYER_COLOR_RGBA[color].slice();
        rgba[3] = opacity;

        buffer.set(transform, offset);
        buffer.set(rgba, offset + transform.length);
      }

      billboard.draw();
    }

    // draw walk indicators
    const movingCharacters = Object.values(gameState.characters).filter(
      ({ lastMoveTime, velocity, curve }) => {
        const t = clamp((velocity * (time - lastMoveTime)) / curve.length, 0, 1);
        return 0 < t && t < 1;
      },
    );
    if (movingCharacters.length >= 1) {
      const billboard = renderer.getAndUseElement<Billboard>(billboardId);
      renderer.useTexture("indicator.walk");
      billboard.setCamera(camera);
      const buffer = billboard.allocate(movingCharacters.length);

      for (let i = 0; i < movingCharacters.length; i++) {
        const { userId, curve } = movingCharacters[i];
        const { x, y } = curve.end;

        const offset = i * billboard.instanceSize;
        const transform = GLM.mat4.create();
        GLM.mat4.translate(transform, transform, GLM.vec3.fromValues(x, y, 1));
        GLM.mat4.scale(transform, transform, GLM.vec3.fromValues(1.5, 1.5, 1.5));

        const color = getPlayerColor(userId);
        const rgba = PLAYER_COLOR_RGBA[color];

        buffer.set(transform, offset);
        buffer.set(rgba, offset + transform.length);
      }

      billboard.draw();
    }

    // draw movement measure line
    const rect = renderer.getAndUseElement<Rectangle>(rectId);
    rect.setCamera(camera);
    if (measurePath && selectedCharacterId) {
      const character = gameState.characters[selectedCharacterId];
      if (character && measurePath.path.length >= 2) {
        const curve = unwrap(Bezier.fromCoords(measurePath.path));
        const color = getPlayerColor(data.profile.user_id);

        renderer.useTexture("system.plain");
        const segmentCount = Math.max(0, curve.segments.length);
        const lineBuffer = rect.allocate(segmentCount);

        for (let i = 0; i < segmentCount; i++) {
          const offset = i * rect.instanceSize;
          const segment = curve.segments[i];
          const transform = getLineTransform(segment.start, segment.end);
          lineBuffer.set(transform, offset);
          lineBuffer.set(PLAYER_COLOR_RGBA[color], offset + transform.length);
        }

        rect.draw();
      }
    }

    // draw measure line
    if (toolData.measure.lineTransform) {
      renderer.useTexture("system.plain");

      const lineBuffer = rect.allocate(1);
      lineBuffer.set(toolData.measure.lineTransform);

      const red = new Float32Array([1, 0, 0, 1]);
      lineBuffer.set(red, toolData.measure.lineTransform.length);

      rect.draw();
    }

    // draw measure cells
    if (toolData.measure.cells.length >= 1) {
      renderer.useTexture("system.plain");

      const buffer = rect.allocate(toolData.measure.cells.length);
      for (let i = 0; i < toolData.measure.cells.length; i++) {
        const offset = i * rect.instanceSize;
        const transform = GLM.mat4.create();
        const { x, y } = toolData.measure.cells[i];
        GLM.mat4.translate(transform, transform, GLM.vec3.fromValues(x, y, 0.11));
        buffer.set(transform, offset);
        const translucentWhite = new Float32Array([1, 1, 1, 0.6]);
        buffer.set(translucentWhite, offset + transform.length);
      }

      rect.draw();
    }

    // draw characters
    const model = renderer.getAndUseElement<DynamicModel>(characterModelId);
    model.setCamera(camera);
    model.draw();

    // position character names
    // TODO: cull off-screen names or constrain them to the window
    for (const [characterId, nameElement] of Object.entries(characterNames)) {
      const instance = characterInstances[characterId];
      if (!instance) {
        continue;
      }

      const translation = GLM.vec3.create();
      GLM.mat4.getTranslation(translation, instance.instance.transform);
      const coord = renderer.worldCoordToCanvasCoord(
        camera,
        translation[0],
        translation[1],
        CHARACTER_LABEL_Z_POSITION,
      );

      nameElement.style.transform = `translate(${coord.x}px, ${coord.y}px) translate(-50%, -100%)`;
    }
  }

  async function handleLoad(event: GameEventHandlers["load"]) {
    gameState = convertServerToClientState(event.state);
    if (event.state.levelUri) {
      const res = unwrap(await tryFetch(`/api/media/${event.state.levelUri}`));
      const data: LevelData = await res.json();
      await handleLoadLevel({ uri: event.state.levelUri, data });
    }

    const characters = Object.values(event.state.characters);
    await Promise.all(
      characters.map(({ characterId, name, userId, lastMove }) =>
        handleCharacterLoad({ coord: lastMove!.path.at(-1)!, characterId, userId, name }),
      ),
    );
  }

  function handleChat(event: GameEventHandlers["chat"]) {
    messages.push({ isSystemMessage: false, userId: event.userId, message: event.message });
  }

  function handlePlayerAdd(event: GameEventHandlers["playeradd"]) {
    gameState.players[event.player.userId] = event.player;
  }

  function handlePlayerJoin(event: GameEventHandlers["playerjoin"]) {
    gameState.players[event.userId].online = true;
    const { username } = gameState.players[event.userId];
    messages.push({ isSystemMessage: true, heading: `${username} joined the game.` });
  }

  function handlePlayerLeave(event: GameEventHandlers["playerleave"]) {
    gameState.players[event.userId].online = false;
    const { username } = gameState.players[event.userId];
    messages.push({ isSystemMessage: true, heading: `${username} left the game.` });
  }

  function handleCharacterLoad(event: GameEventHandlers["characterload"]) {
    loadingCount++;
    const model = renderer.getElement<DynamicModel>(characterModelId);
    const { id, instance } = model.createInstance();

    const color = getPlayerColor(event.userId);
    const linear = PLAYER_COLOR_LINEAR[color];
    instance.defaultMaterial = {
      name: "color.solid",
      baseColorFactor: linear,
      alphaMode: "BLEND",
      alphaCutoff: 0,
      doubleSided: false,
    };

    characterInstances[event.characterId] = {
      id,
      instance,
    };
    loadingCount--;

    const lastMove = {
      path: [event.coord],
      velocity: 0,
      startTime: 0,
    };
    gameState.characters[event.characterId] = convertCharacterToClientCharacter({
      characterId: event.characterId,
      userId: event.userId,
      name: event.name,
      lastMove,
    });

    if (event.userId === data.profile.user_id) {
      selectedCharacterId = event.characterId;
      cameraLocked = true;
    }

    const nameElement = document.createElement("div");
    nameElement.style.position = "absolute";
    nameElement.style.pointerEvents = "none";
    nameElement.style.color = "var(--color-aurora-dddgray-100)";
    nameElement.style.textShadow = "0px 2px 0px var(--color-aurora-gray-1400)";
    nameElement.textContent = event.name;
    characterNameOverlay!.appendChild(nameElement);
    characterNames[event.characterId] = nameElement;
  }

  function handleCharacterMove(event: GameEventHandlers["charactermove"]) {
    gameState.characters[event.characterId] = {
      ...gameState.characters[event.characterId],
      curve: unwrap(Bezier.fromCoords(event.move.path)),
      velocity: event.move.velocity,
      lastMoveTime: event.move.startTime,
    };
  }

  async function handleCharacterUnload(event: GameEventHandlers["characterunload"]) {
    await deleteCharacter(event.characterId, true);
  }

  async function deleteCharacter(characterId: string, gameOnly: boolean) {
    if (!gameOnly) {
      await tryFetch("/api/characters/" + characterId, {
        method: "DELETE",
      });

      const index = characters.findIndex((c) => c.character_id === characterId);
      if (index !== -1) {
        characters = characters.toSpliced(index, 1);
      }
    }

    if (selectedCharacterId === characterId) {
      selectedCharacterId = null;
      cameraLocked = false;
    }

    if (characterInstances[characterId]) {
      const model = renderer.getElement<DynamicModel>(characterModelId);
      model.deleteInstance(characterInstances[characterId].id);
      delete characterInstances[characterId];
      delete gameState.characters[characterId];
      characterNames[characterId].remove();
      delete characterNames[characterId];
    }
  }

  function handlePing(event: GameEventHandlers["ping"]) {
    const pingId = crypto.randomUUID();
    pings[pingId] = {
      userId: event.userId,
      point: Point.fromCoord(event.coord),
      opacity: 0,
      createdAt: Date.now(),
    };
  }

  async function handleLoadLevel(event: GameEventHandlers["levelload"]) {
    level = Level.load(event.data);
    loadingCount++;
    await level.loadAssets(renderer).then(() => loadingCount--);
    const { x, y } = level.center;

    camera.zoom = DEFAULT_ZOOM;
    const lookingAt = getCameraLookingAt();
    const dx = x - lookingAt.x;
    const dy = y - lookingAt.y;
    camera.translate(GLM.vec3.fromValues(-dx, -dy, 0));
  }

  function handleRoll(event: GameEventHandlers["roll"]) {
    const player = gameState.players[event.userId];
    const heading = `${player.username} rolled a ${event.evaluation.total}`;
    const subheading = event.evaluation.rolls.join(", ");
    messages.push({ isSystemMessage: true, heading, subheading });
  }

  function handleSelectCharacter(characterId: string | null) {
    if (characterId && !gameState.characters[characterId]) {
      return;
    }
    selectedCharacterId = characterId;
    cameraLocked = true;
  }

  function handleToggleDraggingCharacter(characterId: string) {
    if (gameState.characters[characterId]) {
      return;
    }
    selectedCharacterId = characterId;
    isDraggingCharacter = !isDraggingCharacter;
  }

  function handleClear() {
    isMeasuring = false;
    measurePath = undefined;
    isDraggingCharacter = false;
    const model = renderer.getElement<DynamicModel>(characterModelId);
    model.deleteInstance(draggingCharacterId);
  }

  async function handleLeftMouseDown(event: MouseEvent) {
    const { x, y } = renderer.canvasCoordToWorldCoord(camera, event.x, event.y);
    const rounded = new Point(x, y).round();

    isMeasuring = false;
    measurePath = undefined;
    chatInputActive = false;

    if (toolData.activeTool?.type === "measure") {
      toolData.measure.isMeasuring = true;
      toolData.measure.start = rounded;
    } else {
      if (selectedCharacterId) {
        client
          .moveCharacter(selectedCharacterId, DEFAULT_CHARACTER_VELOCITY, rounded)
          .then((res) => !res.ok && console.warn(res.error));
      }
    }
  }

  function handleLeftMouseUp(event: MouseEvent) {
    if (isDraggingCharacter) {
      const coord = renderer.canvasCoordToWorldCoord(camera, event.x, event.y);
      const rounded = new Point(coord.x, coord.y).round();
      const characterId = isGameMaster ? selectedCharacterId! : crypto.randomUUID();
      const characterIndex = data.characters.findIndex((c) => c.character_id === characterId);
      const characterName =
        characterIndex > -1 ? data.characters[characterIndex].name : data.profile.username;
      client.loadCharacter(characterId, characterName, rounded).then((res) => {
        if (res.ok) {
          cameraLocked = true;
          selectedCharacterId = characterId;
        }
      });
      isDraggingCharacter = false;
      renderer.getElement<DynamicModel>(characterModelId).deleteInstance(draggingCharacterId);
    } else if (toolData.activeTool?.type === "measure") {
      toolData.resetMeasureTool();
    }
  }

  function handleMouseMove(event: MouseEvent) {
    const character = gameState.characters[selectedCharacterId ?? ""];
    if (level && isMeasuring && character) {
      const { x, y } = renderer.canvasCoordToWorldCoord(camera, event.x, event.y);
      const t = clamp(
        (character.velocity * (Date.now() - character.lastMoveTime)) / character.curve.length,
        0,
        1,
      );
      const start = character.curve.getPoint(t);
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

    if (toolData.measure.isMeasuring) {
      const { x, y } = renderer.canvasCoordToWorldCoord(camera, event.x, event.y);
      const rounded = new Point(x, y).round();
      const changedCell =
        toolData.measure.cells.length === 0 ||
        (toolData.measure.cells.length > 0 && !rounded.isEqual(toolData.measure.cells.at(-1)!));
      if (changedCell) {
        toolData.updateMeasureLine(toolData.measure.start!, rounded, 0.05);
        toolData.updateMeasureCells(toolData.measure.start!, rounded);
        measureText!.innerHTML = `${Math.ceil(2.5 * toolData.measure.distance)}ft`;
        measureText!.style.left = `${event.x}px`;
        measureText!.style.top = `${event.y}px`;
      }
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
    onpointermove={handleMouseMove}
    onwheel={handleScroll}
    onrightmousedown={() => {
      isMeasuring = true;
    }}
    onrightmouseup={() => {
      isMeasuring = false;
      measurePath = undefined;
    }}
    ondbltap={(event) => {
      if (event.key === " " && selectedCharacterId) {
        cameraLocked = true;
        camera.zoom = DEFAULT_ZOOM;
      }
    }}
    onkeydown={(event) => {
      switch (event.key) {
        case "w": {
          holdingForward = true;
          cameraLocked = false;
          break;
        }
        case "a": {
          holdingLeft = true;
          cameraLocked = false;
          break;
        }
        case "s": {
          holdingBackward = true;
          cameraLocked = false;
          break;
        }
        case "d": {
          holdingRight = true;
          cameraLocked = false;
          break;
        }
        case "Escape": {
          if (isGameMaster) {
            selectedCharacterId = null;
          }
          handleClear();
          break;
        }
        case "Backspace":
        case "Delete": {
          if (selectedCharacterId) {
            client.unloadCharacter(selectedCharacterId);
          }
          break;
        }
        case "/":
          event.preventDefault();
        // falls through
        case "Enter": {
          showRightMenu = true;
          selectedGameMenuTab = GameMenuTab.Chat;
          chatInputActive = true;
          break;
        }
        default:
          return;
      }
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
    onmousedown={(event) => event.preventDefault()}
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
    onmousedown={(event) => event.preventDefault()}
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
  <GameMenu
    {messages}
    {characters}
    {selectedCharacterId}
    gameId={params.id}
    isGameMaster={isGameMaster === true}
    levels={data.levels}
    players={gameState.players}
    friends={data.friends}
    onLoadLevel={client.loadLevel}
    onChat={client.chat}
    onCommand={client.command}
    onLeaveGame={() => goto(resolve("/(auth)/dashboard"))}
    onDeleteCharacter={(characterId) => {
      if (gameState.characters[characterId]) {
        client.unloadCharacter(characterId);
      }
      deleteCharacter(characterId, false);
    }}
    onSelectCharacter={handleSelectCharacter}
    onToggleDraggingCharacter={handleToggleDraggingCharacter}
    active={showRightMenu}
    selectedTab={selectedGameMenuTab}
    onSelectTab={(tab) => (selectedGameMenuTab = tab)}
    {chatInputActive}
  />
  {#if !isGameMaster && !selectedCharacterId}
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
      class="absolute bottom-4 z-10 justify-self-center bg-aurora-gray-1400 text-white rounded border-2 border-aurora-gray-600 hover:border-aurora-gray-100 shadow-black shadow-sm"
    >
      <StaticModelViewer
        modelUri="/human.male.glb"
        width={64}
        height={64}
        cameraPosition={GLM.vec3.fromValues(0, -0.9, 0)}
        autoRotate
        class="size-16"
      />
    </button>
  {/if}
  <ul class="absolute right-6 bottom-4 z-10 flex gap-4">
    <li data-visible={cameraLocked} class="data-[visible=false]:hidden">Camera locked</li>
  </ul>
  <div
    data-active={!!measurePath || toolData.measure.distance > 0}
    bind:this={measureText}
    class="pointer-events-none absolute z-10 hidden p-1 text-2xl font-bold text-shadow-aurora-gray-1400 text-shadow-sm data-[active=true]:flex"
  ></div>
  <div
    bind:this={characterNameOverlay}
    class="overlay pointer-events-none z-10 absolute top-0 bottom-0 left-0 right-0"
  ></div>
</main>
