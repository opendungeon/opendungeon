export function getInitials(name: string): string {
  return name
    .split(" ")
    .filter((chunk) => chunk.length >= 1)
    .map(([letter]) => letter)
    .join("");
}

export function getSimplifiedTimeSince(from: number, to: number): string {
  const diff = Math.abs(to - from);

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
