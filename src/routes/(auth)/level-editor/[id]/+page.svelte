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

  const GRID_WIDTH = 256;
  const GRID_HEIGHT = 256;

  let { data }: PageProps = $props();

  let canvas = $state<HTMLCanvasElement>();
  let selectedTexture = $state<string | null>(null);
  let loadingCount = $state(0);
  let rotation: number = $state(0);
  let scale: number = $state(1);
  let selectedDecorationCells: Cartesian[] = $state([]);
  let renderer: Renderer;
  let camera: Camera;
  let levelData: LevelData;
  let frameHandle = -1;
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
    camera.zoom = 100;
    levelData = data.level.data
      ? data.level.data
      : {
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

    loop();

    return () => {
      window.cancelAnimationFrame(frameHandle);
    };
  });

  $effect(() => {
    for (let i = 0; i < selectedDecorationCells.length; i++) {
      const { x, y } = selectedDecorationCells[i];

      if (levelData.grid[y][x]?.decoration) {
        const rot = degToRad(rotation);

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

        levelData.grid[y][x].decoration.rotation = rot;
        levelData.grid[y][x].decoration.scale = scale;
        decorationDataLookup[key][index].rotation = rot;
        decorationDataLookup[key][index].scale = scale;
      }
    }
  });

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
      GLM.mat4.translate(model, model, GLM.vec3.fromValues(GRID_WIDTH / 2, row + 0.5, 0.1));
      GLM.mat4.scale(model, model, GLM.vec3.fromValues(GRID_WIDTH, 0.1, 1));
      buffer.set(model, offset);
      buffer.set(new Float32Array([1, 1, 1, 0.2]), offset + model.length);
      offset += rect.instanceSize;
    }
    for (let col = 0; col < GRID_WIDTH; col += 2) {
      const model = GLM.mat4.create();
      GLM.mat4.translate(model, model, GLM.vec3.fromValues(col + 0.5, GRID_HEIGHT / 2, 0.1));
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
        { offset: [-0.5, 0, 0], scale: [0.1, 1, 1] }, // left
        { offset: [0, 0.5, 0], scale: [1, 0.1, 1] }, // top
        { offset: [0.5, 0, 0], scale: [0.1, 1, 1] }, // right
        { offset: [0, -0.5, 0], scale: [1, 0.1, 1] }, // bottom
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

      const space = cursorLocation.scale(0.5).round();
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
          GLM.vec3.fromValues(rounded.x - 0.5, rounded.y - 0.5, 0),
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
    const x = 2 * space.x - 1;
    const y = 2 * space.y - 1;
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
        const minY = Math.min(dragStartCoord.y, dragCurrentCoord.y);
        const maxY = Math.max(dragStartCoord.y, dragCurrentCoord.y);
        const minX = Math.min(dragStartCoord.x, dragCurrentCoord.x);
        const maxX = Math.max(dragStartCoord.x, dragCurrentCoord.x);

        if (event.button === MouseButton.Left && !selectedTexture) {
          // deselect
          selectedDecorationCells = [];
          rotation = 0;

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
    camera!.zoom = Math.max(1, camera!.zoom + event.deltaY / 25);
  }

  async function handleLoadTexture(key: string, uri: string) {
    try {
      await renderer.loadTexture(key, `/api/media/${uri}`, { mode: "nearest" });
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

  function loop() {
    frameHandle = window.requestAnimationFrame(() => {
      draw();
      loop();
    });
  }
</script>

<main class="relative grid justify-start">
  <canvas
    class="absolute inset-0 bg-white"
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
    }}
    ondragover={(event) => {
      event.preventDefault();

      const { x, y } = renderer.canvasCoordToWorldCoord(camera, event.x, event.y);
      cursorLocation = new Cartesian(x, y);
    }}
    ondrop={(event) => {
      console.log("drop");
      const key = event.dataTransfer?.getData("text/plain;name=key");
      if (!key) {
        console.log("no key :(");
        return;
      }

      const coord = renderer.canvasCoordToWorldCoord(camera, event.x, event.y);
      const { x, y } = new Cartesian(coord.x, coord.y).round();
      if (!levelData.grid[y][x]) {
        console.log("no cell");
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
    bind:this={canvas}
  ></canvas>
  <div class="relative z-10 grid justify-start">
    <button onclick={() => goto(resolve("dashboard"))}>Exit</button>
    <form
      method="POST"
      action="?/savelevel"
      enctype="multipart/form-data"
      use:enhance={handleSubmit}
    >
      <input name="name" type="text" placeholder="Level Name" value={data.level.name ?? ""} />
      <button>Save</button>
    </form>
    <ul class="grid justify-start">
      {#each Object.entries(cellTextures) as [key, { displayName, uri }], i (i)}
        <li class="grid justify-start">
          <button
            data-selected={key === selectedTexture}
            class="group data-[selected=true]:text-blue-500"
            onclick={() => {
              handleLoadTexture(key, uri).then(() => {
                selectedTexture = key;
              });
            }}
          >
            <img
              alt={displayName}
              src={uri}
              width={128}
              height={128}
              class="texture border-2 border-gray-800 group-data-[selected=true]:border-gray-200"
            />
          </button>
        </li>
      {/each}
    </ul>
    <ul class="grid">
      {#each Object.entries(decorations) as [key, { uri }], i (i)}
        <li
          ondragstart={(event) => {
            event.dataTransfer?.setData("text/plain;name=key", key);
          }}
          draggable="true"
          class="grid cursor-grab justify-self-start duration-300 hover:bg-white"
        >
          <ModelViewer autoRotate modelUri={uri} width={128} height={128} />
        </li>
      {/each}
    </ul>
    {#if selectedDecorationCells.length >= 1}
      <div>
        <label>
          Rotation
          <input type="range" min={0} max={360} bind:value={rotation} />
        </label>
        <label>
          Scale
          <input type="range" min={1} max={5} step={0.25} bind:value={scale} />
        </label>
      </div>
    {/if}
  </div>
</main>

<style>
  .texture {
    image-rendering: pixelated;
  }
</style>
