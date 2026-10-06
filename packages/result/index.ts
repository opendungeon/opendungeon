export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export function panic(message = "Panic."): never {
  console.error(message);
  alert(message);
  throw new Error(message);
}

export function unwrap<T>(result: Result<T, any>): T {
  if (!result.ok) {
    panic("Unwrap failed.");
  }

  return result.value;
}

export function expect<T>(result: Result<T, any>, message: string): T {
  if (!result.ok) {
    panic(message);
  }

  return result.value;
}

export function ok<T>(value: T): Result<T, any> {
  return { ok: true, value };
}

export function error<E>(error: E): Result<any, E> {
  return { ok: false, error };
}

export async function tryFetch(
  input: string | URL | Request,
  init?: RequestInit,
): Promise<Result<Response, Error>> {
  try {
    const response = await fetch(input, init);
    return ok(response);
  } catch (e) {
    if (e instanceof Error) {
      return error(e);
    }

    return error(new Error("An unknown fetch error occurred."));
  }
}

export function tryMap<I, O, E>(
  iterable: Iterable<I>,
  callbackfn: (value: I, index: number) => Result<O, E>,
): Result<O[], E> {
  const values = [];
  let index = 0;

  for (const value of iterable) {
    const result = callbackfn(value, index);
    if (!result.ok) {
      return result;
    }

    values.push(result.value);

    index++;
  }

  return ok(values);
}
