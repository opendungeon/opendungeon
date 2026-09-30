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
  const diff = Math.abs(Number(to) - Number(from));

  const days = Math.floor(diff / (3600 * 24));
  if (days >= 1) {
    return `${days} ${days === 1 ? "day" : "days"} ago`;
  }

  const hours = Math.floor(diff / 3600);
  if (hours >= 1) {
    return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  }

  const minutes = Math.floor(diff / 60);
  if (minutes >= 1) {
    return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  }

  const seconds = Math.floor(diff);
  return `${seconds} ${seconds === 1 ? "second" : "seconds"} ago`;
}
