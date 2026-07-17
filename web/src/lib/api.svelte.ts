import { SvelteURL } from "svelte/reactivity";
import HexagonalGrid from "./hexagonal-grid";
import { isRedirect, redirect } from "@sveltejs/kit";

export const UNAUTHORIZED = "unauthorized";
export const NOT_FOUND = "not found";
const BASE_URL = new URL(import.meta.env.DEV ? "http://localhost:8000" : window.location.href);

export type APIStatus = {
  status: "OK";
  version: string;
  needsSetup: boolean;
};

export type APIProfile = {
  username: string;
  avatar: string;
};

export type APIAuthProvider = {
  name: string;
  authUrl: string;
};

export type APICellTexture = {
  key: string;
  displayName: string;
  createdAt: number;
  updatedAt: number;
};

export type APILevel = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
};

type APIState = {
  needsSetup: "unknown" | "yes" | "no";
  isSignedIn: "unknown" | "yes" | "no";
  profile: APIProfile | null;
};

export const api = $state<APIState>({
  needsSetup: "unknown",
  isSignedIn: "unknown",
  profile: null,
});

export async function register(
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: Error }> {
  if (api.isSignedIn === "yes") {
    console.warn("already signed in.");
    return { ok: true };
  }

  const data = new FormData();
  data.append("email", email);
  data.append("password", password);
  const res = await makeRequest("POST", "/auth/register", data);
  if (res.ok) {
    api.isSignedIn = "yes";
  }

  return res;
}

export async function signIn(
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: Error }> {
  if (api.isSignedIn === "yes") {
    console.warn("already signed in.");
    return { ok: true };
  }

  const data = new FormData();
  data.append("email", email);
  data.append("password", password);
  const res = await makeRequest("POST", "/auth/sign-in", data);
  if (res.ok) {
    api.isSignedIn = "yes";
  }

  return res;
}

export async function signOut(): Promise<{ ok: true } | { ok: false; error: Error }> {
  const res = await makeRequest("POST", "/auth/sign-out", null);
  if (!res.ok) {
    return res;
  }

  return { ok: true };
}

export async function upsertMyProfile(
  username: string,
): Promise<{ ok: true; profile: APIProfile } | { ok: false; error: Error }> {
  const data = new FormData();
  data.append("username", username);

  const res = await makeRequest("PUT", "/profiles/me", data);
  if (!res.ok) {
    return res;
  }

  const profile: APIProfile = await res.data.json();
  return { ok: true, profile };
}

export async function getMyProfile(): Promise<
  { ok: true; profile: APIProfile } | { ok: false; error: Error }
> {
  const res = await makeRequest("GET", "/profiles/me", null);
  if (!res.ok) {
    return res;
  }

  const profile: APIProfile = await res.data.json();
  return { ok: true, profile };
}

export async function listCellTextures(): Promise<
  { ok: true; textures: APICellTexture[] } | { ok: false; error: Error }
> {
  const res = await makeRequest("GET", "/cell-textures", null);
  if (!res.ok) {
    return res;
  }

  const textures: APICellTexture[] = await res.data.json();
  return { ok: true, textures };
}

export function getCellTextureUrl(key: string): URL {
  const url = new SvelteURL(BASE_URL.href);
  url.pathname = "/api/cell-textures/" + key;
  return url;
}

export async function listAuthProviders(): Promise<
  { ok: true; providers: APIAuthProvider[] } | { ok: false; error: Error }
> {
  const res = await makeRequest("GET", "/auth/providers", null);
  if (!res.ok) {
    return res;
  }

  const providers: APIAuthProvider[] = await res.data.json();
  return { ok: true, providers };
}

export async function createLevel(
  name: string,
  grid: HexagonalGrid<{
    weight: number;
    texture: string | null;
  }>,
): Promise<{ ok: true; level: APILevel } | { ok: false; error: Error }> {
  const shrunkGrid = grid.shrink((value) => value.weight === 0 && value.texture === null);
  if (shrunkGrid.isEmpty) {
    // TODO: actually verify this is empty (i.e. loop through cells)
    return { ok: false, error: new Error("Level may not be empty.") };
  }

  const body = JSON.stringify({
    name,
    level: {
      version: 1,
      grid: { cells: shrunkGrid.toObject() },
    },
  });

  const res = await makeRequest("POST", "/levels", body);
  if (!res.ok) {
    return res;
  }

  const level: APILevel = await res.data.json();
  return { ok: true, level };
}

export async function listLevels(): Promise<
  { ok: true; levels: APILevel[] } | { ok: false; error: Error }
> {
  const res = await makeRequest("GET", "/levels", null);
  if (!res.ok) {
    return res;
  }

  const levels: APILevel[] = await res.data.json();
  return { ok: true, levels };
}

type CallAPIOptions = {
  body?: BodyInit;
  query?: Record<string, string>;
};

export async function callAPI(
  fetcher: (input: string | URL | Request, init?: RequestInit) => Promise<Response>,
  method: string,
  path: string,
  options: CallAPIOptions = {},
): Promise<{ ok: true; data: Response } | { ok: false; error: Error }> {
  try {
    const url = new SvelteURL(BASE_URL.href);
    url.pathname = "/api" + path;
    if (options.query) {
      Object.entries(options.query).forEach(([k, v]) => {
        url.searchParams.set(k, v);
      });
    }

    const res = await fetcher(url, {
      method,
      body: options.body,
      credentials: import.meta.env.DEV ? "include" : "same-origin",
    });

    if (!res.ok) {
      if (res.status === 401) {
        api.isSignedIn = "no";
        throw redirect(303, "/sign-in");
      }

      const message = await res.text();
      const error = new Error(message);
      if (res.status === 404) {
        error.cause = NOT_FOUND;
      }

      throw error;
    }

    return { ok: true, data: res };
  } catch (error) {
    if (isRedirect(error)) {
      throw error;
    }

    if (error instanceof Error) {
      return { ok: false, error };
    }

    return { ok: false, error: new Error("An unknown error occurred.") };
  }
}

export function getAvatarUrl(avatarId: string): string {
  const url = new SvelteURL(BASE_URL.href);
  url.pathname = "/api/media/avatars/" + avatarId;
  return url.toString();
}

async function makeRequest(
  method: string,
  path: string,
  body: BodyInit | null,
  query?: Record<string, string>,
): Promise<{ ok: true; data: Response } | { ok: false; error: Error }> {
  try {
    const url = new SvelteURL(BASE_URL.href);
    url.pathname = "/api" + path;
    if (query) {
      Object.entries(query).forEach(([k, v]) => {
        url.searchParams.set(k, v);
      });
    }

    const res = await fetch(url, {
      method,
      body,
      credentials: import.meta.env.DEV ? "include" : "same-origin",
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw redirect(303, "/sign-in");
      }

      const message = await res.text();
      const error = new Error(message);
      if (res.status === 404) {
        error.cause = NOT_FOUND;
      }

      throw error;
    }

    return { ok: true, data: res };
  } catch (error) {
    if (isRedirect(error)) {
      throw error;
    }

    if (error instanceof Error) {
      return { ok: false, error };
    }

    return { ok: false, error: new Error("An unknown error occurred.") };
  }
}
