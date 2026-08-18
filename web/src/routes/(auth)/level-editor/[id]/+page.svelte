<script lang="ts">
  import { callAPI, getMediaUrl, type APICellTexture, type APILevelData } from "$lib/api";
  import Controller, {
    type GameMouseMoveEvent,
    type GameMousePressEvent,
    type GameMouseReleaseEvent,
    type GameMouseScrollEvent,
    MouseButton,
  } from "$lib/controller";
  import { Cartesian } from "$lib/point";
  import Rectangle from "$lib/rectangle";
  import Renderer from "$lib/renderer";
  import Camera from "$lib/renderer/camera";
  import Texture from "$lib/renderer/texture";
  import * as GLM from "gl-matrix";
  import { onMount } from "svelte";
  import { type PageProps } from "./$types";
  import { addToast } from "$lib/components/Toaster.svelte";
  import { resolve } from "$app/paths";

  const GRID_WIDTH = 256;
  const GRID_HEIGHT = 256;

  let { data }: PageProps = $props();

  let canvas = $state<HTMLCanvasElement>();
  let levelId = $derived<string>(data.level.id);
  let levelName = $derived<string>(data.level.name ?? "");
  let selectedTexture = $state<string | null>(null);
  let loading = $state(true);
  let controller: Controller;
  let renderer: Renderer;
  let camera: Camera;
  let levelData: APILevelData;
  let frameHandle = -1;
  let input: { type: "none" } | { type: "dragging"; button: number } = { type: "none" };
  let dragStartCoord: Cartesian | null = null;
  let dragCurrentCoord: Cartesian | null = null;
  let rectId: number;

  onMount(() => {
    controller = new Controller(canvas!);
    renderer = new Renderer(canvas!, {
      resizeToWindow: true,
      backgroundColor: new Float32Array([0, 0, 0, 1]),
    });
    camera = new Camera(canvas!.width / canvas!.height); // TODO: handle resizing window
    camera.zoom = 100;
    levelData = data.level.data
      ? data.level.data
      : {
          version: 1,
          textures: [],
          decorations: [],
          grid: Array.from({ length: GRID_HEIGHT }, () => new Array(GRID_HEIGHT).fill(null)),
        };

    rectId = renderer.createElement(Rectangle);

    renderer.loadTexture("system.plain", new Texture(1, 1));

    const textureMediaLookup = data.cellTextures.reduce<Record<string, string>>((prev, curr) => {
      return { ...prev, [curr.key]: curr.mediaId };
    }, {});

    Promise.all(
      levelData.textures.map((texture) => {
        const uri = getMediaUrl(textureMediaLookup[texture]);
        return renderer.loadTexture(texture, uri, {
          mode: "nearest",
        });
      }),
    ).then(() => (loading = false));
    // TODO: load decorations

    loop();

    return () => {
      window.cancelAnimationFrame(frameHandle);
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
        if (texture < 0) {
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

    // draw grid lines
    renderer.useTexture("system.plain");
    const buffer = rect.allocate(GRID_HEIGHT / 2 + GRID_WIDTH / 2);
    let offset = 0;
    for (let row = 0; row < GRID_HEIGHT; row += 2) {
      const model = GLM.mat4.create();
      GLM.mat4.translate(model, model, GLM.vec3.fromValues(GRID_WIDTH / 2, row + 0.5, 1));
      GLM.mat4.scale(model, model, GLM.vec3.fromValues(GRID_WIDTH, 0.1, 1));
      buffer.set(model, offset);
      buffer.set(new Float32Array([1, 1, 1, 0.2]), offset + model.length);
      offset += rect.instanceSize;
    }
    for (let col = 0; col < GRID_WIDTH; col += 2) {
      const model = GLM.mat4.create();
      GLM.mat4.translate(model, model, GLM.vec3.fromValues(col + 0.5, GRID_HEIGHT / 2, 1));
      GLM.mat4.scale(model, model, GLM.vec3.fromValues(0.1, GRID_HEIGHT, 1));
      buffer.set(model, offset);
      buffer.set(new Float32Array([1, 1, 1, 0.2]), offset + model.length);
      offset += rect.instanceSize;
    }
    rect.draw();

    // drag indicator
    if (input.type === "dragging" && dragStartCoord && dragCurrentCoord) {
      const minY = Math.min(dragStartCoord.y, dragCurrentCoord.y);
      const maxY = Math.max(dragStartCoord.y, dragCurrentCoord.y);
      const minX = Math.min(dragStartCoord.x, dragCurrentCoord.x);
      const maxX = Math.max(dragStartCoord.x, dragCurrentCoord.x);

      const cells = [];
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          cells.push(new Cartesian(x, y));
        }
      }

      if (cells.length >= 1) {
        const buffer = rect.allocate(cells.length);
        for (let i = 0; i < cells.length; i++) {
          const model = GLM.mat4.create();
          GLM.mat4.translate(model, model, GLM.vec3.fromValues(cells[i].x, cells[i].y, 2));
          const offset = i * rect.instanceSize;
          buffer.set(model, offset);
          buffer.set(
            input.button === MouseButton.Left
              ? new Float32Array([0, 1, 1, 0.4])
              : new Float32Array([1, 0, 0, 0.4]),
            offset + model.length,
          );
        }
        rect.draw();
      }
    }
  }

  function handleClear() {
    input = { type: "none" };
  }

  function handlePress(event: GameMousePressEvent) {
    input = { type: "dragging", button: event.button };
    dragStartCoord = renderer.canvasCoordToWorldCoord(camera, event.x, event.y);
    dragStartCoord.floor();
  }

  function handleRelease(event: GameMouseReleaseEvent) {
    if (input.type === "dragging") {
      input = { type: "none" };
      if (dragStartCoord !== null && dragCurrentCoord !== null) {
        const minY = Math.min(dragStartCoord.y, dragCurrentCoord.y);
        const maxY = Math.max(dragStartCoord.y, dragCurrentCoord.y);
        const minX = Math.min(dragStartCoord.x, dragCurrentCoord.x);
        const maxX = Math.max(dragStartCoord.x, dragCurrentCoord.x);
        if (event.button === MouseButton.Left && selectedTexture) {
          // paint
          for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
              if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) {
                continue;
              }
              if (!levelData.textures.includes(selectedTexture)) {
                levelData.textures.push(selectedTexture);
              }
              const textureIndex = levelData.textures.findIndex(
                (texture) => texture === selectedTexture,
              );
              if (textureIndex === -1) {
                alert("Failed to insert and find texture! BAD!!!");
              }
              levelData.grid[y][x] = {
                texture: textureIndex,
                decoration: -1,
              };
            }
          }
        } else if (event.button === MouseButton.Right) {
          // erase
          for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
              if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) {
                continue;
              }
              levelData.grid[y][x] = null;
            }
          }
        }
      }
      dragStartCoord = null;
      dragCurrentCoord = null;
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
      } else if (input.button === MouseButton.Left || input.button === MouseButton.Right) {
        dragCurrentCoord = renderer.canvasCoordToWorldCoord(camera, event.x, event.y);
        dragCurrentCoord.floor();
      }
    }
  }

  function handleScroll(event: GameMouseScrollEvent) {
    camera!.zoom = Math.max(1, camera!.zoom + event.delta / 25);
  }

  async function handleLoadTexture(texture: APICellTexture) {
    try {
      await renderer.loadTexture(texture.key, getMediaUrl(texture.mediaId), { mode: "nearest" });
    } catch (e) {
      if (e instanceof Error && e.message.includes("already in use")) {
        return;
      }

      alert("failed to load texture.");
    }
  }

  async function handleSaveLevel(event: SubmitEvent) {
    event.preventDefault();

    const body = JSON.stringify({ name: levelName, level: levelData });
    const res = await callAPI(fetch, "PUT", "/levels/" + levelId, { body });
    if (!res.ok) {
      addToast({
        data: { title: "Failed To Save Level", description: res.error.message, level: "danger" },
      });
      return;
    }

    addToast({
      data: { title: "Saved.", description: "Level saved successfully.", level: "success" },
    });
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
  <div class="relative z-10 grid justify-start">
    <a href={resolve("/dashboard")}>Exit</a>
    <form onsubmit={handleSaveLevel}>
      <input type="text" placeholder="Level Name" bind:value={levelName} />
      <button>Save</button>
    </form>
    <ul class="grid justify-start">
      {#each data.cellTextures as cellTexture, i (i)}
        <li class="grid justify-start">
          <button
            data-selected={cellTexture.key === selectedTexture}
            class="data-[selected=true]:text-blue-500 group"
            onclick={() => {
              handleLoadTexture(cellTexture).then(() => {
                selectedTexture = cellTexture.key;
              });
            }}
          >
            <img
              alt={cellTexture.displayName}
              src={getMediaUrl(cellTexture.mediaId)}
              width={128}
              height={128}
              class="texture border-2 border-gray-800 group-data-[selected=true]:border-gray-200"
            />
          </button>
        </li>
      {/each}
    </ul>
  </div>
</main>

<style>
  .texture {
    image-rendering: pixelated;
  }
</style>
