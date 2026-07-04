import * as GLM from "gl-matrix";
import {
  DEFAULT_CELL_TEXTURE,
  CLEAR,
  WHITE,
  DEFAULT_BORDER_COLOR,
  ZLEVEL_DEFAULT,
  YELLOW,
  AQUA,
  RED,
  ZLEVEL_ABOVE,
} from "./consts";
import type { Cell } from "../../hexagonal-grid";
import type { Batch } from "../../renderer/utils";
import type { Axial } from "../../point";

type BuildCellsDrawBufferOptions = {
  /** Draw weight overlay on top of every cell */
  drawWeightOverlay?: boolean;
  /** Highlight a point */
  highlightedPoint?: Axial;
};

/**
 * Creates and populates a buffer containing all draw information for the given cells.
 * @param instanceSize Size in floats for a single cell draw instance.
 * @param cells Cells for which draw data is generated.
 * @param batches Batches to group cell data into.
 * @param [options={}] Optional draw data.
 */
export function buildCellsDrawBuffer(
  instanceSize: number,
  cells: Cell<{ weight: number; texture: string }>[],
  batches: Batch[],
  options: BuildCellsDrawBufferOptions = {},
): Float32Array {
  const buffer = new Float32Array(
    instanceSize * cells.length * (!options.drawWeightOverlay ? 1 : 2),
  );

  const instances = new Map(
    batches.map<[string, { offset: number; written: number }]>(
      ({ texture, offset }) => [texture, { offset, written: 0 }],
    ),
  );

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];

    const { x, y } = cell.point.toCartesian();
    const model = GLM.mat4.create();
    GLM.mat4.translate(model, model, GLM.vec3.fromValues(x, y, ZLEVEL_DEFAULT));

    const color = cell.value.texture === DEFAULT_CELL_TEXTURE ? CLEAR : WHITE;

    const isCellHighlighted =
      !!options.highlightedPoint &&
      options.highlightedPoint.isEqual(cell.point);
    const borderColor = isCellHighlighted ? WHITE : DEFAULT_BORDER_COLOR;

    const instance = instances.get(cell.value.texture ?? "plain")!;
    const offset = instanceSize * (instance.offset + instance.written);
    writeHexInstance(buffer, offset, model, color, borderColor);

    if (options.drawWeightOverlay) {
      const weightOffset = instanceSize * (cells.length + i);

      const weightModel = GLM.mat4.create();
      GLM.mat4.translate(
        weightModel,
        weightModel,
        GLM.vec3.fromValues(x, y, ZLEVEL_ABOVE),
      );

      const weightColor =
        cell.value.weight === 2 ? YELLOW : cell.value.weight === 1 ? AQUA : RED;
      const weightBorderColor = isCellHighlighted ? WHITE : weightColor;
      writeHexInstance(
        buffer,
        weightOffset,
        weightModel,
        weightColor,
        weightBorderColor,
      );
    }

    instances.set(cell.value.texture ?? "plain", {
      ...instance,
      written: instance.written + 1,
    });
  }

  if (options.drawWeightOverlay) {
    batches.push({
      texture: "highlight",
      offset: cells.length,
      count: cells.length,
    });
  }

  return buffer;
}

export function writeHexInstance(
  buffer: Float32Array,
  offset: number,
  model: GLM.mat4,
  color: GLM.vec4,
  borderColor: GLM.vec4,
) {
  buffer.set(model, offset);
  buffer.set(color, offset + model.length);
  buffer.set(borderColor, offset + model.length + color.length);
}
