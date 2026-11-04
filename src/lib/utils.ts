import { Point } from "#lib/point.ts";
import type { Move } from "#lib/server/games/index.ts";

/**
 * Generate a v7 UUID.
 *
 * Meant for browser use. Server environments should use `Bun.randomUUIDv7()`.
 */
export function randomUUIDv7(): string {
  const unixTimeMs = Date.now();
  const timeHex = unixTimeMs.toString(16).padStart(12, "0");

  // Random bytes for the rest
  const randBytes = new Uint8Array(10);
  crypto.getRandomValues(randBytes);

  // Set version 7 (0111) and variant (10xx)
  randBytes[0] = (randBytes[0] & 0x0f) | 0x70; // Version 7
  randBytes[2] = (randBytes[2] & 0x3f) | 0x80; // Variant 10

  const hexValues = Array.from(randBytes, (b) => b.toString(16).padStart(2, "0"));

  return [
    timeHex.slice(0, 8),
    timeHex.slice(8, 12),
    hexValues.slice(0, 2).join(""),
    hexValues.slice(2, 4).join(""),
    hexValues.slice(4, 10).join(""),
  ].join("-");
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .filter((chunk) => chunk.length >= 1)
    .map(([letter]) => letter)
    .join("");
}

export function getSimplifiedTimeSince(from: Date, to: Date): string {
  const secondsDiff = Math.abs(Number(to) - Number(from)) / 1000;

  const days = Math.floor(secondsDiff / (3600 * 24));
  if (days >= 1) {
    return `${days} ${days === 1 ? "day" : "days"} ago`;
  }

  const hours = Math.floor(secondsDiff / 3600);
  if (hours >= 1) {
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }

  const minutes = Math.floor(secondsDiff / 60);
  if (minutes >= 1) {
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  }

  const seconds = Math.floor(secondsDiff);
  return `${seconds} ${seconds === 1 ? "second" : "seconds"} ago`;
}

export function isString(value: unknown): value is string {
  return typeof value === "string";
}

export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

// TODO: this function name is horrible, fix it
export function calculatePosition(
  time: number,
  { startTime, velocity, path }: Move,
): { point: Point; rad: number; isMoving: boolean } {
  const dt = time - startTime;
  const distance = clamp(velocity * dt, 0, path.length - 1);
  const a = path[Math.floor(distance)];
  const b = path[Math.ceil(distance)];
  const frac = distance - Math.trunc(distance);
  const point = Point.lerp(a, b, frac);
  const rad = Point.fromCoord(a).angle(b);
  const isMoving = 0 < distance && distance < path.length - 1;

  return { point, rad, isMoving };
}
