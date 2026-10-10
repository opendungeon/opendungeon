<script lang="ts">
  import { MouseButton } from "#lib/controller.js";
  import { Cartesian, degToRad } from "#lib/point.js";
  import Rectangle from "#lib/rectangle.js";
  import { Renderer, OrthographicCamera, type Camera, StaticModel, Texture } from "odr";
  import * as GLM from "gl-matrix";
  import { onMount } from "svelte";
  import { type PageProps } from "./$types";
  import { resolve } from "$app/paths";
  import { goto } from "$app/navigation";
  import assert from "#lib/assert.js";
  import type { LevelData } from "#lib/server/database/levels.js";
  import { enhance } from "$app/forms";
  import decorations from "#lib/assets/decorations.json";
  import cellTextures from "#lib/assets/celltextures.json";
  import ModelViewer from "#lib/components/ModelViewer.svelte";
  import { expect } from "result";
  import {
    GRID_HEIGHT,
    GRID_WIDTH,
    MAXIMUM_ZOOM,
    MINIMUM_ZOOM,
    MAXIMUM_ROTATION,
    MAXIMUM_SCALE,
    MINIMUM_SCALE,
  } from "#lib/game/index.js";
  import StyledButton from "#lib/components/StyledButton.svelte";
  import StyledInput from "#lib/components/StyledInput.svelte";
  import GameWindow from "#lib/components/GameWindow.svelte";

  let { data }: PageProps = $props();

  let canvas = $state<HTMLCanvasElement>();
  let selectedTexture = $state<string | null>(null);
  let loadingCount = $state(0);
  let rotation: number | null = $state(null);
  let scale: number | null = $state(null);
  let selectedDecorationCells: Cartesian[] = $state([]);
  let levelName = $derived<string | null>(data.level.name);
  let renderer: Renderer;
  let camera: Camera;
  let levelData: LevelData;
  let input: { type: "none" } | { type: "dragging"; button: number } = { type: "none" };
  let dragStartCoord: Cartesian | null = null;
  let dragCurrentCoord: Cartesian | null = null;
  let rectId: number;
  let decorationElementLookup: Record<string, number> = {};
  let decorationDataLookup: Record<
    string,
    { x: number; y: number; rotation: number; scale: number }[]
  > = {};
  let draggingDecoration: string | null = null;
  let cursorLocation: Cartesian | null = null;

  onMount(() => {
    renderer = new Renderer(canvas!, {
      resizeToWindow: true,
      backgroundColor: new Float32Array([0, 0, 0, 1]),
    });
    camera = new OrthographicCamera(canvas!.width / canvas!.height); // TODO: handle resizing window
    camera.zoom = 150;
    camera.translate(GLM.vec3.fromValues(-GRID_WIDTH / 2, -GRID_HEIGHT / 2, 0));

    levelData = data.level.data ?? {
      version: 1,
      textures: [],
      decorations: [],
      grid: Array.from({ length: GRID_HEIGHT }, () => new Array(GRID_HEIGHT).fill(null)),
    };

    // load decorations data lookup
    for (let row = 0; row < levelData.grid.length; row++) {
      for (let col = 0; col < levelData.grid.length; col++) {
        const cell = levelData.grid[row][col];
        if (!cell || !cell.decoration) {
          continue;
        }

        const key = levelData.decorations[cell.decoration.index];
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

    rectId = renderer.createElement(Rectangle);

    loadingCount++;
    renderer.loadTexture("system.plain", new Texture(1, 1)).then(() => loadingCount--);

    const textureUriLookup = Object.entries(cellTextures).reduce<Record<string, string>>(
      (prev, [key, { uri }]) => {
        return { ...prev, [key]: uri };
      },
      {},
    );

    loadingCount++;
    Promise.all([
      ...levelData.textures.map((texture) => {
        const uri = textureUriLookup[texture];
        return renderer.loadTexture(texture, uri, {
          mode: "nearest",
        });
      }),
      ...Object.entries(decorations).map(async ([key, { uri }]) => {
        const elementId = expect(
          await renderer.createStaticGLBElement(uri),
          "Failed to get static model element ID.",
        );
        decorationElementLookup[key] = elementId;
      }),
    ]).then(() => loadingCount--);
  });

  $effect(() => {
    for (let i = 0; i < selectedDecorationCells.length; i++) {
      const { x, y } = selectedDecorationCells[i];

      if (levelData.grid[y][x]?.decoration) {
        const key = levelData.decorations[levelData.grid[y][x].decoration.index];
        if (!key) {
          continue;
        }

        const index = decorationDataLookup[key].findIndex(
          (decoration) => decoration.x === x && decoration.y === y,
        );
        if (index < 0) {
          continue;
        }

        if (rotation !== null) {
          rotation = Math.min(MAXIMUM_ROTATION, rotation);
          const rot = degToRad(rotation);
          levelData.grid[y][x].decoration.rotation = rot;
          decorationDataLookup[key][index].rotation = rot;
        }
        if (scale !== null) {
          scale = Math.max(MINIMUM_SCALE, Math.min(MAXIMUM_SCALE, scale));
          levelData.grid[y][x].decoration.scale = scale;
          decorationDataLookup[key][index].scale = scale;
        }
      }
    }
  });

  function draw() {
    if (!levelData || loadingCount >= 1) {
      return;
    }

    renderer.clear();

    // draw cell textures
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
    const buffer = rect.allocate(GRID_HEIGHT / 2 + GRID_WIDTH / 2 + 2);
    let offset = 0;
    for (let row = 0; row <= GRID_HEIGHT; row += 2) {
      const model = GLM.mat4.create();
      GLM.mat4.translate(model, model, GLM.vec3.fromValues(GRID_WIDTH / 2 - 0.5, row - 0.5, 0.01));
      GLM.mat4.scale(model, model, GLM.vec3.fromValues(GRID_WIDTH + 0.1, 0.1, 1));
      buffer.set(model, offset);
      buffer.set(new Float32Array([1, 1, 1, 0.2]), offset + model.length);
      offset += rect.instanceSize;
    }
    for (let col = 0; col <= GRID_WIDTH; col += 2) {
      const model = GLM.mat4.create();
      GLM.mat4.translate(model, model, GLM.vec3.fromValues(col - 0.5, GRID_HEIGHT / 2 - 0.5, 0.01));
      GLM.mat4.scale(model, model, GLM.vec3.fromValues(0.1, GRID_HEIGHT + 0.1, 1));
      buffer.set(model, offset);
      buffer.set(new Float32Array([1, 1, 1, 0.2]), offset + model.length);
      offset += rect.instanceSize;
    }
    rect.draw();

    // drag indicator
    if (
      input.type === "dragging" &&
      input.button !== MouseButton.Middle &&
      dragStartCoord &&
      dragCurrentCoord
    ) {
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
          GLM.mat4.translate(model, model, GLM.vec3.fromValues(cells[i].x, cells[i].y, 0.2));
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

    // draw selected decorations
    for (let i = 0; i < selectedDecorationCells.length; i++) {
      const { x, y } = selectedDecorationCells[i];
      const buffer = rect.allocate(4);
      const pivot = GLM.mat4.create();
      GLM.mat4.translate(pivot, pivot, GLM.vec3.fromValues(x, y, 10));
      GLM.mat4.rotateZ(pivot, pivot, degToRad(0));

      const sides: Array<{ offset: GLM.vec3; scale: GLM.vec3 }> = [
        { offset: [-0.5, 0.5, 0], scale: [0.1, 2.1, 1] }, // left
        { offset: [0.5, 1.5, 0], scale: [2, 0.1, 1] }, // top
        { offset: [1.5, 0.5, 0], scale: [0.1, 2.1, 1] }, // right
        { offset: [0.5, -0.5, 0], scale: [2, 0.1, 1] }, // bottom
      ];

      for (let i = 0; i < sides.length; i++) {
        const side = sides[i];
        const offset = i * rect.instanceSize;

        const transform = GLM.mat4.clone(pivot);
        GLM.mat4.translate(transform, transform, side.offset);
        GLM.mat4.scale(transform, transform, side.scale);
        buffer.set(transform, offset);
        buffer.set(new Float32Array([1, 1, 1, 1]), offset + transform.length);
      }

      rect.draw();
    }

    // decoration drop indicator
    if (draggingDecoration && cursorLocation) {
      const buffer = rect.allocate(4);
      const space = cursorLocation.scale(0.5).floor();
      const cells = getSpaceCells(space);
      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        const offset = i * rect.instanceSize;

        const transform = GLM.mat4.create();
        GLM.mat4.translate(transform, transform, GLM.vec3.fromValues(cell.x, cell.y, 0.2));
        buffer.set(transform, offset);

        const color = new Float32Array([0.1, 0.4, 1.0, 0.8]);
        buffer.set(color, offset + transform.length);
      }

      rect.draw();
    }

    // decorations
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
          GLM.vec3.fromValues(rounded.x + 0.5, rounded.y + 0.5, 0),
        );
        GLM.mat4.rotateZ(transform, transform, rotation);
        GLM.mat4.rotateX(transform, transform, degToRad(90));
        GLM.mat4.scale(transform, transform, GLM.vec3.fromValues(2 * scale, 2 * scale, 2 * scale));

        buffer.set(transform, offset);
      }

      element.draw();
    }
  }

  function getSpaceCells(space: Cartesian): Cartesian[] {
    const x = 2 * space.x;
    const y = 2 * space.y;
    return [
      new Cartesian(x, y),
      new Cartesian(x + 1, y),
      new Cartesian(x, y + 1),
      new Cartesian(x + 1, y + 1),
    ];
  }

  function handleClear() {
    input = { type: "none" };
    cursorLocation = null;
  }

  function handlePress(event: MouseEvent) {
    event.preventDefault();

    input = { type: "dragging", button: event.button };
    const { x, y } = renderer.canvasCoordToWorldCoord(camera, event.x, event.y);
    dragStartCoord = new Cartesian(x, y).round();
  }

  function handleRelease(event: MouseEvent) {
    draggingDecoration = null;

    if (input.type === "dragging") {
      input = { type: "none" };
      if (dragStartCoord !== null && dragCurrentCoord !== null) {
        const minY = Math.max(0, Math.min(dragStartCoord.y, dragCurrentCoord.y));
        const maxY = Math.min(GRID_HEIGHT, Math.max(dragStartCoord.y, dragCurrentCoord.y));
        const minX = Math.max(0, Math.min(dragStartCoord.x, dragCurrentCoord.x));
        const maxX = Math.min(GRID_WIDTH, Math.max(dragStartCoord.x, dragCurrentCoord.x));

        if (event.button === MouseButton.Left && !selectedTexture) {
          // deselect
          selectedDecorationCells = [];
          rotation = null;
          scale = null;

          for (let row = minY; row < maxY; row++) {
            for (let col = minX; col < maxX; col++) {
              if (!levelData.grid[row][col]?.decoration) {
                continue;
              }

              selectedDecorationCells.push(new Cartesian(col, row));
            }
          }
        } else if (event.button === MouseButton.Left && selectedTexture) {
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

              assert(textureIndex !== -1, "Failed to insert and find texture");
              levelData.grid[y][x] = { texture: textureIndex, decoration: null };
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

  function handleMove(event: MouseEvent) {
    if (input.type === "dragging") {
      if (input.button === MouseButton.Middle) {
        const end = renderer.canvasCoordToWorldCoord(camera, event.x, event.y);
        const start = renderer.canvasCoordToWorldCoord(
          camera,
          event.x - event.movementX,
          event.y + event.movementY,
        );
        const delta = new Cartesian(start.x, start.y).subtract(new Cartesian(end.x, end.y));

        camera?.translate(GLM.vec3.fromValues(-delta.x, delta.y, 0));
      } else if (input.button === MouseButton.Left || input.button === MouseButton.Right) {
        const { x, y } = renderer.canvasCoordToWorldCoord(camera, event.x, event.y);
        dragCurrentCoord = new Cartesian(x, y).round();
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

  async function handleLoadTexture(key: string, uri: string) {
    try {
      await renderer.loadTexture(key, uri, { mode: "nearest" });
    } catch (e) {
      if (e instanceof Error && e.message.includes("already in use")) {
        return;
      }

      assert(false, "failed to load texture");
    }
  }

  async function handleSubmit({ formData }: { formData: FormData }) {
    const blob = new Blob([JSON.stringify(levelData)], { type: "application/json" });
    formData.append("level-data", blob);
  }
</script>

<main class="relative grid justify-start">
  <GameWindow
    {draw}
    bind:canvas
    onpointerleave={handleClear}
    onpointerdown={handlePress}
    oncontextmenu={handlePress}
    onpointerup={handleRelease}
    onpointermove={handleMove}
    onwheel={handleScroll}
    ondragenter={(event) => {
      const key = event.dataTransfer?.getData("text/plain;name=key");
      if (!key) {
        return;
      }

      draggingDecoration = key;
      selectedTexture = null;
    }}
    ondragover={(event) => {
      event.preventDefault();

      const { x, y } = renderer.canvasCoordToWorldCoord(camera, event.x, event.y);
      cursorLocation = new Cartesian(
        Math.min(GRID_WIDTH - 1, Math.max(0, x)),
        Math.min(GRID_HEIGHT - 1, Math.max(0, y)),
      ).round();
    }}
    ondrop={(event) => {
      draggingDecoration = null;
      const key = event.dataTransfer?.getData("text/plain;name=key");
      if (!key) {
        console.log("no key :(");
        return;
      }

      const coord = renderer.canvasCoordToWorldCoord(camera, event.x, event.y);
      const space = new Cartesian(
        Math.min(GRID_WIDTH - 1, Math.max(0, coord.x)),
        Math.min(GRID_HEIGHT - 1, Math.max(0, coord.y)),
      )
        .round()
        .scale(0.5)
        .floor();
      const { x, y } = space.scale(2);
      if (!levelData.grid[y][x]) {
        return;
      }

      let index = levelData.decorations.findIndex((value) => value === key);
      if (index === -1) {
        index = levelData.decorations.length;
        levelData.decorations.push(key);
      }

      const rotation = 0;
      const scale = 1;
      levelData.grid[y][x].decoration = {
        rotation,
        index,
        scale,
      };

      if (!decorationDataLookup[key]) {
        decorationDataLookup[key] = [{ x, y, rotation, scale }];
      } else {
        decorationDataLookup[key].push({ x, y, rotation, scale });
      }
    }}
    class="absolute inset-0 bg-white"
  />
  <div
    class="relative top-4 left-4 z-10 grid justify-start gap-4 rounded border-2 border-aurora-gray-1200 bg-aurora-gray-1400 p-4"
  >
    <div class="flex max-w-64 flex-col gap-3 md:max-w-full">
      <StyledButton onclick={() => goto(resolve("dashboard"))} label="Exit" class="w-min px-4" />
      <form
        method="POST"
        action="?/savelevel"
        enctype="multipart/form-data"
        use:enhance={handleSubmit}
        class="flex gap-2"
      >
        <StyledInput type="text" placeholder="Level Name" name="name" bind:value={levelName} />
        <StyledButton label="Save" class="w.min px-4" />
      </form>
    </div>

    <div class="grid gap-2">
      <h2 class="text-center">Textures</h2>
      <ul class="grid grid-cols-3 justify-center">
        {#each Object.entries(cellTextures) as [key, { displayName, uri }], i (i)}
          <li class="grid justify-center">
            <button
              data-selected={key === selectedTexture}
              class="group data-[selected=true]:text-blue-500"
              onclick={() => {
                if (key === selectedTexture) {
                  selectedTexture = null;
                } else {
                  selectedDecorationCells = [];
                  handleLoadTexture(key, uri).then(() => {
                    selectedTexture = key;
                  });
                }
              }}
            >
              <img
                alt={displayName}
                src={uri}
                width={64}
                height={64}
                class="texture rounded border-2 border-gray-800 group-data-[selected=true]:border-gray-200"
              />
            </button>
          </li>
        {/each}
      </ul>
    </div>

    <div class="grid gap-2">
      <h2 class="text-center">Decorations</h2>
      <ul class="grid grid-cols-3">
        {#each Object.entries(decorations) as [key, { uri, displayName }], i (i)}
          <li
            ondragstart={(event) => {
              event.dataTransfer?.setData("text/plain;name=key", key);
            }}
            draggable="true"
            class="grid justify-center"
          >
            <span class="sr-only">{displayName}</span>
            <ModelViewer
              autoRotate
              modelUri={uri}
              width={64}
              height={64}
              class="size-16 rounded border-2 border-gray-800 hover:border-white"
            />
          </li>
        {/each}
      </ul>
    </div>

    {#if selectedDecorationCells.length > 0}
      <div class="flex items-center gap-2">
        <h2 class="flex-1">Rotation</h2>
        <StyledInput
          class="flex-2"
          type="number"
          placeholder="Rotation (degrees)"
          min={0}
          max={360}
          bind:value={rotation}
        />
      </div>

      <div class="flex items-center gap-2">
        <h2 class="flex-1">Scale</h2>
        <StyledInput
          class="flex-2"
          type="number"
          placeholder="Scale"
          min={0.5}
          max={5}
          bind:value={scale}
          step={0.1}
        />
      </div>
    {/if}
  </div>
</main>

<style>
  .texture {
    image-rendering: pixelated;
  }
</style>
