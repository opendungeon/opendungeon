<script lang="ts">
  import { callAPI, getMediaUrl, type APICellTexture } from "$lib/api";
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

  const GRID_WIDTH = 256;
  const GRID_HEIGHT = 256;

  type Cell = {
    texture: number | null;
    decoration: number | null;
  };

  type LevelData = {
    version: number;
    textures: string[];
    decorations: string[];
    grid: (Cell | null)[][];
  };

  let canvas = $state<HTMLCanvasElement>();
  let controller: Controller;
  let renderer: Renderer;
  let camera: Camera;
  let levelData: LevelData;
  let frameHandle = -1;
  let input: { type: "none" } | { type: "dragging"; button: number } = { type: "none" };

  onMount(async () => {
    controller = new Controller(canvas!);
    renderer = new Renderer(canvas!, {
      resizeToWindow: true,
      backgroundColor: new Float32Array([0, 0, 0, 1])
    });
    camera = new Camera(canvas!.width / canvas!.height); // TODO: handle resizing window
    camera.zoom = 100;
    levelData = {
      version: 1,
      textures: ["grass", "mud", "water"],
      decorations: [],
      grid: Array.from({ length: GRID_HEIGHT }, () => new Array(GRID_HEIGHT).fill(null)),
    };

    levelData.grid[6][7] = {
      texture: 0,
      decoration: null,
    };
    levelData.grid[4][20] = {
      texture: 1,
      decoration: null,
    };
    levelData.grid[69][69] = {
      texture: 2,
      decoration: null,
    };

    await renderer.loadTexture("system.plain", new Texture(1, 1))

    const res = await callAPI(fetch, "GET", "/cell-textures");
    if (!res.ok) {
      throw "cock wock";
    }

    const textureMediaLookup = await res.data.json().then((cellTextures: APICellTexture[]) => {
      return cellTextures.reduce<Record<string, string>>((prev, curr) => {
        return { ...prev, [curr.key]: curr.mediaId };
      }, {});
    });

    await Promise.all(
      levelData.textures.map((texture) => {
        const uri = getMediaUrl(textureMediaLookup[texture]);
        return renderer.loadTexture(texture, uri, {
          mode: "nearest",
        });
      }),
    );
    // load decorations

    loop();

    window.onbeforeunload = () => {
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
    if (!renderer || !levelData) {
      return;
    }

    renderer.clear();

    const rectId = renderer.createElement(Rectangle);
    const cellsByTexture: Record<number, Cartesian[]> = {};
    for (let row = 0; row < levelData.grid.length; row++) {
      for (let col = 0; col < levelData.grid[row].length; col++) {
        const cell = levelData.grid[row][col];
        if (!cell) continue;
        const texture = cell.texture;

        if (texture === null) continue;

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
    renderer.useTexture("system.plain")
    const buffer = rect.allocate(GRID_HEIGHT / 2 + GRID_WIDTH / 2)
    let offset = 0
    for (let row = 0; row < GRID_HEIGHT; row += 2) {
      const model = GLM.mat4.create();
      GLM.mat4.translate(model, model, GLM.vec3.fromValues(GRID_WIDTH / 2, row + 0.5, 1))
      GLM.mat4.scale(model, model, GLM.vec3.fromValues(GRID_WIDTH, 0.1, 1))
      buffer.set(model, offset)
      buffer.set(new Float32Array([1, 1, 1, 0.2]), offset + model.length)
      offset += rect.instanceSize
    }
    for (let col = 0; col < GRID_WIDTH; col += 2) {
      const model = GLM.mat4.create();
      GLM.mat4.translate(model, model, GLM.vec3.fromValues(col + 0.5, GRID_HEIGHT / 2, 1))
      GLM.mat4.scale(model, model, GLM.vec3.fromValues(0.1, GRID_HEIGHT, 1))
      buffer.set(model, offset)
      buffer.set(new Float32Array([1, 1, 1, 0.2]), offset + model.length)
      offset += rect.instanceSize
    }
    rect.draw()
  }

  function handleClear() {
    input = { type: "none" };
  }

  function handlePress(event: GameMousePressEvent) {
    input = { type: "dragging", button: event.button };
  }

  function handleRelease(event: GameMouseReleaseEvent) {
    if (input.type === "dragging") {
      input = { type: "none" };
    }
  }

  function handleMove(event: GameMouseMoveEvent) {
    if (input.type === "dragging" && input.button === MouseButton.Middle) {
      const end = renderer.canvasCoordToWorldCoord(camera, event.x, event.y);
      const start = renderer.canvasCoordToWorldCoord(
        camera,
        event.x - event.deltaX,
        event.y - event.deltaY,
      );
      const delta = start.subtract(end);

      camera?.translate(GLM.vec3.fromValues(-delta.x, delta.y, 0));
    }
  }

  function handleScroll(event: GameMouseScrollEvent) {
    camera!.zoom = Math.max(1, camera!.zoom + event.delta / 25);
  }

  function loop() {
    frameHandle = window.requestAnimationFrame(() => {
      tick();
      draw();
      loop();
    });
  }
</script>

<canvas bind:this={canvas}></canvas>
