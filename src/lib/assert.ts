class AssertionError extends Error {
  constructor(message?: string) {
    super(message);
  }
}

export default function assert(expression: boolean, message?: string) {
  if (!expression) {
    console.error(message ?? "assertion failed");
    alert(message ?? "assertion failed");
    throw new AssertionError(message ?? "assertion failed");
  }
}
