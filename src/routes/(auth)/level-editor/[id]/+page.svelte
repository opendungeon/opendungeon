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
  import WebGLWindow from "#lib/components/WebGLWindow.svelte";
  import Tile from "#lib/tile.js";

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
  let levelData: LevelData = $derived(
    data.level.data ?? {
      version: 1,
      textures: [],
      decorations: [],
      grid: Array.from({ length: GRID_HEIGHT }, () => new Array(GRID_HEIGHT).fill(null)),
    },
  );
  let input: { type: "none" } | { type: "dragging"; button: number } = { type: "none" };
  let dragStartCoord: Cartesian | null = null;
  let dragCurrentCoord: Cartesian | null = null;
  let rectId: number;
  let tileId: number;
  let decorationElementLookup: Record<string, number> = {};
  let decorationDataLookup: Record<
    string,
    { x: number; y: number; rotation: number; scale: number }[]
  > = {};
  let draggingDecoration: {
    key: string;
    coord: Cartesian | null;
  } | null = null;
  let inputFocused = $state(false);

  onMount(() => {
    renderer = new Renderer(canvas!, {
      resizeToWindow: true,
      backgroundColor: new Float32Array([0, 0, 0, 1]),
    });
    camera = new OrthographicCamera(canvas!.width / canvas!.height); // TODO: handle resizing window
    camera.zoom = 150;
    camera.translate(GLM.vec3.fromValues(-GRID_WIDTH / 2, -GRID_HEIGHT / 2, 0));

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
    tileId = renderer.createElement(Tile);

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
          repeat: true,
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
          const rot = degToRad(Math.min(MAXIMUM_ROTATION, rotation));
          levelData.grid[y][x].decoration.rotation = rot;
          decorationDataLookup[key][index].rotation = rot;
        }
        if (scale !== null) {
          const scl = Math.max(MINIMUM_SCALE, Math.min(MAXIMUM_SCALE, scale));
          levelData.grid[y][x].decoration.scale = scl;
          decorationDataLookup[key][index].scale = scl;
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

    // draw cells
    const tile = renderer.getAndUseElement<Tile>(tileId);
    tile.setCamera(camera);
    for (const [textureIndex, coords] of Object.entries(cellsByTexture)) {
      renderer.useTexture(levelData.textures[Number(textureIndex)]);
      const buffer = tile.allocate(coords.length);
      for (let i = 0; i < coords.length; i++) {
        const offset = i * tile.instanceSize;
        const model = GLM.mat4.create();
        const coord = coords[i];
        GLM.mat4.translate(model, model, GLM.vec3.fromValues(coord.x, coord.y, 0));
        buffer.set(model, offset);
        buffer.set(new Float32Array([1, 1, 1, 1]), offset + model.length);
      }
      tile.draw();
    }

    // draw grid lines
    const rect = renderer.getAndUseElement<Rectangle>(rectId);
    rect.setCamera(camera);
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
      dragCurrentCoord &&
      selectedDecorationCells.length === 0 &&
      !draggingDecoration
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
      GLM.mat4.translate(pivot, pivot, GLM.vec3.fromValues(x, y, 100));
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

    // dragging decoration
    if (draggingDecoration?.coord) {
      const elementId = decorationElementLookup[draggingDecoration.key];
      if (elementId !== undefined) {
        const element = renderer.getAndUseElement<StaticModel>(elementId);
        element.setCamera(camera);
        const buffer = element.allocate(1);
        const transform = GLM.mat4.create();
        const rounded = draggingDecoration.coord.scale(0.5).round().scale(2);
        GLM.mat4.translate(
          transform,
          transform,
          GLM.vec3.fromValues(rounded.x + 0.5, rounded.y + 0.5, 0),
        );
        GLM.mat4.rotateX(transform, transform, degToRad(90));
        GLM.mat4.scale(transform, transform, GLM.vec3.fromValues(2, 2, 2));

        buffer.set(transform, 0);

        element.draw();
      }
    }
  }

  function handleClear() {
    input = { type: "none" };
    draggingDecoration = null;
  }

  function handlePress(event: MouseEvent) {
    event.preventDefault();

    input = { type: "dragging", button: event.button };
    const { x, y } = renderer.canvasCoordToWorldCoord(camera, event.x, event.y);
    dragStartCoord = new Cartesian(x, y).round();

    if (event.button !== MouseButton.Middle) {
      const targetCoord = dragStartCoord.scale(0.5).floor().scale(2);
      const targetCell = levelData.grid[targetCoord.y][targetCoord.x];
      if (!selectedDecorationCells.find((cell) => cell.isEqual(targetCoord))) {
        if (!targetCell?.decoration) {
          selectedDecorationCells = [];
        } else {
          selectedDecorationCells = [targetCoord];
        }
      }
    }
  }

  function handleRelease(event: MouseEvent) {
    if (input.type === "dragging") {
      input = { type: "none" };
      if (dragStartCoord !== null && dragCurrentCoord !== null) {
        const minY = Math.max(0, Math.min(dragStartCoord.y, dragCurrentCoord.y));
        const maxY = Math.min(GRID_HEIGHT, Math.max(dragStartCoord.y, dragCurrentCoord.y));
        const minX = Math.max(0, Math.min(dragStartCoord.x, dragCurrentCoord.x));
        const maxX = Math.min(GRID_WIDTH, Math.max(dragStartCoord.x, dragCurrentCoord.x));

        if (
          event.button === MouseButton.Left &&
          !selectedTexture &&
          selectedDecorationCells.length === 0
        ) {
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
              levelData.grid[y][x] = {
                texture: textureIndex,
                decoration: levelData.grid[y][x]?.decoration ?? null,
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

              const cell = levelData.grid[y][x];
              if (cell?.decoration) {
                const index = decorationDataLookup[
                  levelData.decorations[cell.decoration.index]
                ].findIndex((c) => c.x === x && c.y === y);
                assert(index !== -1, "Failed to find decoration data");
                decorationDataLookup[levelData.decorations[cell.decoration.index]].splice(index, 1);
              }

              levelData.grid[y][x] = null;
            }
          }
        }
      } else if (event.button === MouseButton.Left && draggingDecoration?.coord) {
        // drop a decoration
        const { x, y } = renderer.canvasCoordToWorldCoord(camera, event.x, event.y);
        const targetCoord = new Cartesian(x, y).round().scale(0.5).floor().scale(2.0);
        const targetCell = levelData.grid[targetCoord.y][targetCoord.x];
        if (targetCell && !targetCell.decoration) {
          let index = levelData.decorations.findIndex((value) => value === draggingDecoration!.key);
          if (index === -1) {
            index = levelData.decorations.length;
            levelData.decorations.push(draggingDecoration.key);
          }
          const decoration = {
            index,
            x: draggingDecoration.coord.x,
            y: draggingDecoration.coord.y,
            rotation: 0,
            scale: 1,
          };
          targetCell.decoration = decoration;
          if (!decorationDataLookup[draggingDecoration.key]) {
            decorationDataLookup[draggingDecoration.key] = [decoration];
          } else {
            decorationDataLookup[draggingDecoration.key].push(decoration);
          }

          selectedDecorationCells = [draggingDecoration.coord];
        } else {
          selectedDecorationCells = [];
        }

        draggingDecoration = null;
      }
      dragStartCoord = null;
      dragCurrentCoord = null;
    }
  }

  function handleMove(event: MouseEvent) {
    if (!document.hasFocus()) {
      console.warn("Cannot move unfocused window.");
      return;
    }

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

        if (draggingDecoration) {
          const target = new Cartesian(
            Math.min(GRID_WIDTH - 1, Math.max(0, x)),
            Math.min(GRID_HEIGHT - 1, Math.max(0, y)),
          )
            .round()
            .scale(0.5)
            .floor()
            .scale(2.0);
          draggingDecoration = {
            ...draggingDecoration,
            coord: target,
          };

          return;
        }

        if (selectedDecorationCells.length > 0) {
          const space = new Cartesian(
            Math.min(GRID_WIDTH - 1, Math.max(0, dragCurrentCoord?.x ?? dragStartCoord!.x)),
            Math.min(GRID_HEIGHT - 1, Math.max(0, dragCurrentCoord?.y ?? dragStartCoord!.y)),
          )
            .round()
            .scale(0.5)
            .floor();

          dragCurrentCoord = new Cartesian(x, y).round();

          const targetSpace = new Cartesian(
            Math.min(GRID_WIDTH - 1, Math.max(0, dragCurrentCoord.x)),
            Math.min(GRID_HEIGHT - 1, Math.max(0, dragCurrentCoord.y)),
          )
            .round()
            .scale(0.5)
            .floor();

          if (
            space.isEqual(targetSpace) ||
            dragStartCoord!.x < 0 ||
            dragStartCoord!.x > GRID_WIDTH - 1 ||
            dragStartCoord!.y < 0 ||
            dragStartCoord!.y > GRID_HEIGHT - 1
          ) {
            return;
          }

          const delta = space.scale(2.0).subtract(targetSpace.scale(2.0));

          // check if decorations can move
          for (const cell of selectedDecorationCells) {
            if (
              cell.x - delta.x < 0 ||
              cell.x - delta.x > GRID_WIDTH - 1 ||
              cell.y - delta.y < 0 ||
              cell.y - delta.y > GRID_HEIGHT - 1
            ) {
              return;
            }

            const canonical = levelData.grid[cell.y][cell.x];
            assert(
              canonical !== null && canonical.decoration !== null,
              "Failed to move decoration of null cell.",
            );

            const key = levelData.decorations[canonical!.decoration!.index];
            const index = decorationDataLookup[key].findIndex(
              (c) => c.x === cell.x && c.y === cell.y,
            );
            assert(index !== -1, "Failed to move non-existant decoration.");

            const target = levelData.grid[cell.y - delta.y][cell.x - delta.x];
            if (
              !target ||
              (!selectedDecorationCells.find((c) =>
                new Cartesian(cell.x - delta.x, cell.y - delta.y)
                  .round()
                  .scale(0.5)
                  .floor()
                  .scale(2.0)
                  .isEqual(c),
              ) &&
                target.decoration)
            ) {
              return;
            }
          }

          // move decorations using a clone of the grid to avoid conflicts
          const gridCopy = structuredClone(levelData.grid);
          for (let i = 0; i < selectedDecorationCells.length; i++) {
            let cell = selectedDecorationCells[i];

            const canonical = gridCopy[cell.y][cell.x]!;

            const key = levelData.decorations[canonical!.decoration!.index];
            const index = decorationDataLookup[key].findIndex(
              (c) => c.x === cell.x && c.y === cell.y,
            );

            levelData.grid[cell.y - delta.y][cell.x - delta.x]!.decoration = {
              ...canonical.decoration!,
            };

            selectedDecorationCells[i] = cell.subtract(delta);
            if (!selectedDecorationCells.find((c) => c.isEqual(cell))) {
              levelData.grid[cell.y][cell.x]!.decoration = null;
            }

            decorationDataLookup[key][index].x = cell.x - delta.x;
            decorationDataLookup[key][index].y = cell.y - delta.y;
          }
        } else {
          dragCurrentCoord = new Cartesian(x, y).round();
        }
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
      await renderer.loadTexture(key, uri, { mode: "nearest", repeat: true });
    } catch (e) {
      if (e instanceof Error && e.message.includes("already in use")) {
        return;
      }

      assert(false, "failed to load texture");
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    switch (event.key) {
      case "Backspace":
      case "Delete":
        if (inputFocused) {
          return;
        }
        for (const cell of selectedDecorationCells) {
          const canonical = levelData.grid[cell.y][cell.x];
          assert(
            canonical !== null && canonical.decoration !== null,
            "Failed to find selected decoration cell in level data.",
          );

          const cellsByDecoration =
            decorationDataLookup[levelData.decorations[canonical!.decoration!.index]];
          const index = cellsByDecoration.findIndex((c) => new Cartesian(c.x, c.y).isEqual(cell));
          cellsByDecoration.splice(index, 1);

          levelData.grid[cell.y][cell.x]!.decoration = null;
        }

        selectedDecorationCells = [];
        break;
      case "Escape":
        selectedTexture = null;
        selectedDecorationCells = [];
        dragStartCoord = null;
        dragCurrentCoord = null;
        draggingDecoration = null;
        break;
    }
  }

  async function handleSubmit({ formData }: { formData: FormData }) {
    const blob = new Blob([JSON.stringify(levelData)], { type: "application/json" });
    formData.append("level-data", blob);
  }
</script>

<svelte:window onkeydown={handleKeyDown} />

<main class="relative grid justify-start">
  <WebGLWindow
    {draw}
    bind:canvas
    onpointerleave={handleClear}
    onleftmousedown={handlePress}
    onleftmouseup={handleRelease}
    onmiddlemousedown={handlePress}
    onmiddlemouseup={handleRelease}
    onrightmousedown={handlePress}
    onrightmouseup={handleRelease}
    onpointermove={handleMove}
    onwheel={handleScroll}
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
        <StyledInput
          type="text"
          placeholder="Level Name"
          name="name"
          bind:value={levelName}
          autocomplete="off"
          onfocusin={() => (inputFocused = true)}
          onfocusout={() => (inputFocused = false)}
        />
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
            onpointerdown={() => {
              draggingDecoration = {
                key,
                coord: null,
              };
              input = {
                type: "dragging",
                button: MouseButton.Left,
              };

              selectedTexture = null;
              selectedDecorationCells = [];
              rotation = 0;
              scale = 1;
            }}
            onpointerup={() => {
              draggingDecoration = null;
            }}
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
          onfocusin={() => (inputFocused = true)}
          onfocusout={() => (inputFocused = false)}
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
          onfocusin={() => (inputFocused = true)}
          onfocusout={() => (inputFocused = false)}
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
