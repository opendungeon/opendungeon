import { Axial, Cube, degToRad } from "$lib/point";
import * as GLM from "gl-matrix";

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

export function getPointsInLine(start: Axial, end: Axial): Axial[] {
  const startCube = start.toCube();
  const endCube = end.toCube();
  const distance = Cube.distance(startCube, endCube);

  const points = [];
  for (let i = 0; i <= distance; i++) {
    const point = Cube.round(startCube.lerp(endCube, (1 / distance) * i)).toAxial();
    points.push(point);
  }

  return points;
}

export function getPointsInCone(start: Axial, end: Axial) {
  const distance = Cube.distance(start.toCube(), end.toCube());

  // Walk every cell within distance of the start
  // Keep the ones whose angle from the line is within 26 degrees.
  const dir = end.toCartesian().subtract(start.toCartesian());
  const dirLen = Math.hypot(dir.x, dir.y);
  const halfAngleCos = Math.cos(degToRad(26));

  const points: Axial[] = [];
  for (let dq = -distance; dq <= distance; dq++) {
    const rMin = Math.max(-distance, -dq - distance);
    const rMax = Math.min(distance, -dq + distance);
    for (let dr = rMin; dr <= rMax; dr++) {
      if (dq === 0 && dr === 0) {
        continue;
      }

      const point = new Axial(start.q + dq, start.r + dr);
      const { x, y } = point.toCartesian().subtract(start.toCartesian());
      const cosAngle = (x * dir.x + y * dir.y) / (Math.hypot(x, y) * dirLen);

      if (cosAngle >= halfAngleCos - 1e-9) {
        points.push(point);
      }
    }
  }

  return points;
}

export function getPointsInArea(start: Axial, end: Axial): Axial[] {
  const radius = Cube.distance(start.toCube(), end.toCube());
  const points: Axial[] = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) {
      points.push(start.add(new Axial(q, r)));
    }
  }

  return points;
}
