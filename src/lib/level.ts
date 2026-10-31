import { Renderer, StaticModel, type Camera } from "odr";
import { Cartesian, degToRad } from "#lib/point.js";
import { aStar } from "#lib/search.js";
import type { LevelData } from "./server/database/levels";
import Tile from "#lib/tile.js";
import * as GLM from "gl-matrix";
import decorationAssets from "#lib/assets/decorations.json";
import textureAssets from "#lib/assets/celltextures.json";
import { error, expect, unwrap } from "result";

export class Level {
  private textures: string[];
  private decorations: string[];
  private grid: LevelData["grid"];
  private decorationElementLookup: Record<string, number>;
  private decorationDataLookup: Record<
    string,
    { x: number; y: number; rotation: number; scale: number }[]
  >;
  private _tileId: number;

  private constructor(textures: string[], decorations: string[], grid: LevelData["grid"]) {
    this.textures = textures;
    this.decorations = decorations;
    this.grid = grid;
    this.decorationElementLookup = {};
    this.decorationDataLookup = {};
    this._tileId = -1;
  }

  get tileId(): number {
    return this._tileId;
  }

  get center(): Cartesian {
    let minY = Infinity;
    let maxY = -Infinity;
    let minX = Infinity;
    let maxX = -Infinity;
    for (let row = 0; row < this.grid.length; row++) {
      for (let col = 0; col < this.grid[row].length; col++) {
        if (!col) {
          continue;
        }

        if (row < minY) {
          minY = row;
        }
        if (row > maxY) {
          maxY = row;
        }

        if (col < minX) {
          minX = col;
        }
        if (col > maxX) {
          maxX = col;
        }
      }
    }

    if (!isFinite(minY) || !isFinite(maxY) || !isFinite(minX) || !isFinite(maxX)) {
      return new Cartesian(0, 0);
    }

    const x = 0.5 * (maxX - minX) + minX;
    const y = 0.5 * (maxY - minY) + minY;
    return new Cartesian(x, y);
  }

  static load(data: LevelData): Level {
    return new Level(data.textures, data.decorations, data.grid);
  }

  at(x: number, y: number) {
    return this.grid[y][x];
  }

  shortestPath(from: Cartesian, to: Cartesian): { path: Cartesian[]; cost: number } {
    return aStar(from, to, ({ x, y }: Cartesian) => {
      return this.at(x, y)?.texture !== undefined;
    });
  }

  /**
   * __CLIENT ONLY__: Delete loaded assets in `renderer`.
   */
  unloadAssets(renderer: Renderer) {
    renderer.deleteElement(this._tileId);

    for (const elementId of Object.values(this.decorationElementLookup)) {
      renderer.deleteElement(elementId);
    }
  }

  /**
   * __CLIENT ONLY__: Load level assets into `renderer`.
   */
  async loadAssets(renderer: Renderer) {
    this._tileId = renderer.createElement(Tile);

    const textureUriLookup = this.textures.reduce<Record<string, string>>((prev, key) => {
      const texture = Object.entries(textureAssets).find(
        ([cellTextureKey]) => cellTextureKey === key,
      );
      if (!texture) {
        throw new Error(`Failed to find cell texture with key "${key}".`);
      }
      const [, { uri }] = texture;
      return { ...prev, [key]: uri };
    }, {});

    // load decorations data lookup
    for (let row = 0; row < this.grid.length; row++) {
      for (let col = 0; col < this.grid.length; col++) {
        const cell = this.grid[row][col];
        if (!cell || !cell.decoration) {
          continue;
        }

        const key = this.decorations[cell.decoration.index];
        if (!this.decorationDataLookup[key]) {
          this.decorationDataLookup[key] = [
            { x: col, y: row, rotation: cell.decoration.rotation, scale: cell.decoration.scale },
          ];
        } else {
          this.decorationDataLookup[key].push({
            x: col,
            y: row,
            rotation: cell.decoration.rotation,
            scale: cell.decoration.scale,
          });
        }
      }
    }

    await Promise.all([
      ...this.textures.map(async (texture) => {
        const uri = textureUriLookup[texture];
        return renderer
          .loadTexture(texture, uri, {
            mode: "nearest",
            repeat: true,
          })
          .catch((e) => {
            if (e instanceof Error && e.message.includes("already in use")) {
              return;
            }
            throw e;
          });
      }),
      ...this.decorations.map(async (key) => {
        const decoration = (decorationAssets as Record<string, (typeof decorationAssets)["crate"]>)[
          key
        ];
        if (!decoration) {
          unwrap(error(`Unknown decoration: "${key}".`));
        }

        const elementId = expect(
          await renderer.createStaticGLBElement(decoration.uri),
          "Failed to get static model element ID.",
        );
        this.decorationElementLookup[key] = elementId;
      }),
    ]);
  }

  /**
   * __CLIENT ONLY__: Draw the level using `renderer` and `camera`.
   */
  draw(renderer: Renderer, camera: Camera) {
    if (this._tileId < 0) {
      console.warn("Tile asset not loaded.");
      return;
    }

    const cellsByTexture: Record<number, Cartesian[]> = {};
    for (let row = 0; row < this.grid.length; row++) {
      for (let col = 0; col < this.grid[row].length; col++) {
        const cell = this.grid[row][col];
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

    // draw cells
    const tile = renderer.getAndUseElement<Tile>(this.tileId);
    tile.setCamera(camera);
    for (const [textureIndex, coords] of Object.entries(cellsByTexture)) {
      renderer.useTexture(this.textures[Number(textureIndex)]);
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

    // draw decorations
    for (let i = 0; i < this.decorations.length; i++) {
      const key = this.decorations[i];
      const elementId = this.decorationElementLookup[key];
      const data = this.decorationDataLookup[key];
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
}
