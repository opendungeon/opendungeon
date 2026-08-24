export function getInitials(name: string): string {
  return name
    .split(" ")
    .filter((chunk) => chunk.length >= 1)
    .map(([letter]) => letter)
    .join("");
}
