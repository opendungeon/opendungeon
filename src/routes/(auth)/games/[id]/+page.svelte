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
  import StaticModelViewer from "#lib/components/StaticModelViewer.svelte";
  import WebGLWindow from "#lib/components/WebGLWindow.svelte";
  import { MouseButton } from "#lib/controller.ts";
  import { Bezier } from "#lib/curves/bezier.ts";
  import type { Curve } from "#lib/curves/index.ts";
  import {
    GameTools,
    getCellsInCircle,
    getCellsInCone,
    getCellsInLine,
    getCellsInSquare,
  } from "#lib/game/gametools.svelte.ts";
  import { GameMenuTab, GRID_WIDTH, MAXIMUM_ZOOM, MINIMUM_ZOOM } from "#lib/game/index.ts";
  import { GameClient } from "#lib/gameclient.ts";
  import { Level } from "#lib/level.ts";
  import { Point, degToRad, type Coord } from "#lib/point.ts";
  import Rectangle from "#lib/rectangle.ts";
  import type { LevelData } from "#lib/server/database/levels.ts";
  import {
    type GameCharacter,
    type GameEventHandlers,
    type GameState,
    type Measurement,
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

  const PITCH = -degToRad(54.74);
  const CAMERA_VELOCITY = 0.05;
  const DEFAULT_ZOOM = 15;
  const CHARACTER_LABEL_Z_POSITION = 4;
  const DEFAULT_CHARACTER_VELOCITY = 0.008;
  const PING_DURATION = 2000;
  const TRANSLUCENT_WHITE = new Float32Array([1, 1, 1, 0.6]);
  const CLICK_THRESHOLD_MS = 300;

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
  let showRightMenu = $state(true);
  let toolData = $state(new GameTools());
  let measureTextOverlay = $state<HTMLDivElement>();
  let selectedCharacterId = $state<string | null>(null);
  let isDraggingCharacter = $state(false);
  let cameraLocked = $state(false);
  let characterNameOverlay = $state<HTMLDivElement>();
  let characters = $derived(data.characters);
  let isGameMaster = $derived(data.state.players[data.profile.user_id].isGameMaster);
  let client = $derived(new GameClient(params.id));
  let gameState = $derived<ClientGameState>(convertServerToClientState(data.state));
  let selectedGameMenuTab = $state<GameMenuTab>(GameMenuTab.Chat);
  let chatInput = $state<HTMLInputElement>();

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
  let mouseCanvasCoord: Point | undefined;
  let mouseWorldCoord: Point | undefined;
  let lastMeasurePoint: Point | undefined;
  let measureStartCoord: Point | undefined;
  let rightMouseDownAt = -1;
  let middleMouseDownAt = -1;
  let shiftHeld = false;
  let ctrlHeld = false;
  let altHeld = false;

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
    client.onmeasure = handleMeasure;
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

  function getLineTransform(from: Coord, to: Coord): GLM.mat4 {
    const difference = Point.fromCoord(to).subtract(from);
    const halfDifference = difference.scale(0.5);
    const midpoint = Point.fromCoord(from).add(halfDifference);
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

  function deleteAllCharacters() {
    loadingCount++;

    characters = [];
    gameState.characters = {};
    selectedCharacterId = null;
    draggingCharacterId = undefined;
    isDraggingCharacter = false;
    cameraLocked = false;

    try {
      const character = renderer.getElement<DynamicModel>(characterModelId);
      Object.values(characterInstances).forEach(({ id }) => character.deleteInstance(id));
    } catch {
      console.warn("Cannot delete instances on missing element.");
    }
    characterInstances = {};

    Object.values(characterNames).forEach((div) => div.remove());
    characterNames = {};

    loadingCount--;
  }

  function getMeasurementComponents(measurement: Measurement): {
    lines: { start: Coord; end: Coord }[];
    cells: Coord[];
  } {
    if (measurement.shape === "path") {
      const curve = unwrap(Bezier.fromCoords(measurement.path));
      return { lines: curve.segments, cells: measurement.path };
    }

    const { start, end } = measurement;
    const cells = (() => {
      switch (measurement.shape) {
        case "line":
          return getCellsInLine(start, end).cells;
        case "cone":
          return getCellsInCone(start, end);
        case "circle":
          return getCellsInCircle(start, end);
        case "square":
          return getCellsInSquare(start, end);
      }
    })();

    return { lines: [{ start, end }], cells };
  }

  function calculatePathDistance(path: Coord[]): number {
    if (path.length === 0) {
      return 0;
    }

    let distance = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const a = Point.fromCoord(path[i]);
      const b = path[i + 1];
      distance += a.distance(b);
    }

    return distance;
  }

  function tick(time: number, dt: number) {
    animator.tick(time);

    mouseWorldCoord = !mouseCanvasCoord
      ? undefined
      : Point.fromCoord(renderer.canvasCoordToWorldCoord(camera, mouseCanvasCoord)).round();

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
        GLM.mat4.rotateZ(
          inst.instance.transform,
          inst.instance.transform,
          character.curve.length === 0 ? 0 : rad + 0.5 * Math.PI,
        );
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

    const isLocalMeasuring = rightMouseDownAt > 0 && selectedCharacterId;
    const isGlobalMeasuring =
      middleMouseDownAt > 0 &&
      Date.now() - middleMouseDownAt > CLICK_THRESHOLD_MS &&
      measureStartCoord;
    if (
      (isLocalMeasuring || isGlobalMeasuring) &&
      mouseWorldCoord &&
      !mouseWorldCoord.isEqual(lastMeasurePoint)
    ) {
      lastMeasurePoint = mouseWorldCoord;

      const start = isGlobalMeasuring
        ? measureStartCoord!
        : (() => {
            const character = gameState.characters[selectedCharacterId!];
            const t =
              character.curve.length === 0
                ? 0
                : clamp(
                    (character.velocity * (time - character.lastMoveTime)) / character.curve.length,
                    0,
                    1,
                  );
            return character.curve.getPoint(t);
          })();
      const end = mouseWorldCoord!;

      const measurement: Measurement =
        shiftHeld && middleMouseDownAt > 0
          ? {
              shape: "line",
              start,
              end,
            }
          : ctrlHeld
            ? {
                shape: "cone",
                start,
                end,
              }
            : altHeld
              ? {
                  shape: "circle",
                  start,
                  end,
                }
              : { shape: "path", path: level?.shortestPath(start, end).path ?? [] };

      if (measurement.shape !== "path" || measurement.path.length >= 1) {
        client.measure(measurement);
      }
    } else if (rightMouseDownAt < 0 && middleMouseDownAt < 0 && lastMeasurePoint) {
      client.measure(null);
      lastMeasurePoint = undefined;
    }

    for (const { userId, measurement } of Object.values(gameState.players)) {
      const span = measureTextOverlay!.querySelector<HTMLSpanElement>("#measure-" + userId);
      if (!span) {
        continue;
      }

      if (!measurement) {
        span.style.display = "none";
        continue;
      }

      const { end, distance } =
        measurement.shape !== "path"
          ? {
              end: measurement.end,
              distance: Point.fromCoord(measurement.start).distance(measurement.end),
            }
          : { end: measurement.path.at(-1), distance: calculatePathDistance(measurement.path) };
      if (end) {
        const canvasCoord = renderer.worldCoordToCanvasCoord(camera, end.x, end.y);
        span.style.display = "block";
        span.style.top = `${canvasCoord.y}px`;
        span.style.left = `${canvasCoord.x + 8}px`;
        span.innerHTML = `${2.5 * Math.floor(distance)} ft.`; // TODO: support metric
      }
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
        const point = new Point(x, y + 3);
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

    // draw measurements
    const rect = renderer.getAndUseElement<Rectangle>(rectId);
    rect.setCamera(camera);
    renderer.useTexture("system.plain");
    for (const { userId, measurement } of Object.values(gameState.players)) {
      if (!measurement) {
        continue;
      }

      const { lines, cells } = getMeasurementComponents(measurement);
      const buffer = rect.allocate(lines.length + cells.length);
      const color = PLAYER_COLOR_RGBA[getPlayerColor(userId)];

      for (let i = 0; i < lines.length; i++) {
        const offset = i * rect.instanceSize;
        const { start, end } = lines[i];
        const transform = getLineTransform(start, end);
        buffer.set(transform, offset);
        buffer.set(color, offset + transform.length);
      }

      for (let i = 0; i < cells.length; i++) {
        const offset = (i + lines.length) * rect.instanceSize;
        const { x, y } = cells[i];
        const transform = GLM.mat4.create();
        GLM.mat4.translate(transform, transform, GLM.vec3.fromValues(x, y, 0.11));
        buffer.set(transform, offset);
        buffer.set(TRANSLUCENT_WHITE, offset + transform.length);
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

    // MUST COME AFTER LEVEL LOAD
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

  function handleMeasure(event: GameEventHandlers["measure"]) {
    gameState.players[event.userId].measurement = event.measurement;
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
      alphaMode: "OPAQUE",
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
    deleteAllCharacters();

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
    rightMouseDownAt = -1;
    isDraggingCharacter = false;
    const model = renderer.getElement<DynamicModel>(characterModelId);
    model.deleteInstance(draggingCharacterId);
  }

  async function handleLeftMouseDown(event: MouseEvent) {
    const { x, y } = renderer.canvasCoordToWorldCoord(camera, event);
    const rounded = new Point(x, y).round();
    chatInput!.blur();

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
      const coord = renderer.canvasCoordToWorldCoord(camera, event);
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
    mouseCanvasCoord = new Point(event.x, event.y);
  }

  function handleScroll(event: WheelEvent) {
    const before = renderer.canvasCoordToWorldCoord(camera, event);
    const zoomDelta = 1 + Math.pow(camera.zoom, 2.25) / 1000;
    const newZoom = camera.zoom + (event.deltaY > 0 ? zoomDelta : -zoomDelta);
    camera.zoom = Math.min(MAXIMUM_ZOOM, Math.max(MINIMUM_ZOOM, newZoom));
    const after = renderer.canvasCoordToWorldCoord(camera, event);
    const dx = after.x - before.x;
    const dy = after.y - before.y;
    camera.translate(GLM.vec3.fromValues(dx, dy, 0));
  }

  function handleMiddleMouseDown() {
    middleMouseDownAt = Date.now();
    measureStartCoord = mouseWorldCoord;
  }

  async function handleMiddleMouseUp(event: MouseEvent) {
    if (!data.profile) {
      return;
    }

    if (Date.now() - middleMouseDownAt <= CLICK_THRESHOLD_MS) {
      const { x, y } = renderer.canvasCoordToWorldCoord(camera, event);
      const coord = new Point(x, y).round().scale(0.5).floor().scale(2.0);
      await client.ping(coord).then((res) => !res.ok && console.error("failed to ping"));
    }

    middleMouseDownAt = -1;
    measureStartCoord = undefined;
  }

  function handleKeyDown(event: KeyboardEvent) {
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
        if (!chatInput!.value) {
          chatInput!.value = "/";
        }
      // falls through
      case "Enter": {
        event.preventDefault();
        showRightMenu = true;
        selectedGameMenuTab = GameMenuTab.Chat;
        chatInput?.focus();
        break;
      }
      case "Shift": {
        shiftHeld = true;
        break;
      }
      case "Control": {
        ctrlHeld = true;
        break;
      }
      case "Alt": {
        event.preventDefault();
        altHeld = true;
        break;
      }
      default:
        return;
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
    onmiddlemouseup={handleMiddleMouseUp}
    onpointermove={handleMouseMove}
    onwheel={handleScroll}
    onrightmousedown={() => {
      rightMouseDownAt = Date.now();
    }}
    onrightmouseup={() => {
      rightMouseDownAt = -1;
    }}
    ondbltap={(event) => {
      if (event.key === " " && selectedCharacterId) {
        cameraLocked = true;
        camera.zoom = DEFAULT_ZOOM;
      }
    }}
    onkeydown={handleKeyDown}
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
        case "Shift": {
          shiftHeld = false;
          break;
        }
        case "Control": {
          ctrlHeld = false;
          break;
        }
        case "Alt": {
          event.preventDefault();
          altHeld = false;
          break;
        }
      }
    }}
    class="absolute inset-0 bg-black"
  />
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
    bind:chatInput
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
    bind:this={measureTextOverlay}
    class="pointer-events-none absolute z-10 p-1 inset-0 text-2xl font-bold text-shadow-aurora-gray-1400 text-shadow-sm"
  >
    {#each Object.values(gameState.players) as { userId }, i (i)}
      <span
        id="measure-{userId}"
        style="color: {PLAYER_COLOR_HEX[getPlayerColor(userId)]};"
        class="absolute"
      ></span>
    {/each}
  </div>
  <div
    bind:this={characterNameOverlay}
    class="overlay pointer-events-none z-10 absolute inset-0"
  ></div>
</main>
