import { SvelteURL } from "svelte/reactivity";

export const UNAUTHORIZED = "unauthorized";
export const NOT_FOUND = "not found";
const BASE_URL = new URL(import.meta.env.DEV ? "http://localhost:8000" : window.location.href);

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

export const auth = $state<{ isSignedIn: "unknown" | "yes" | "no"; profile: APIProfile | null }>({
  isSignedIn: "unknown",
  profile: null,
});

export async function register(
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: Error }> {
  if (auth.isSignedIn === "yes") {
    console.warn("already signed in.");
    return { ok: true };
  }

  const data = new FormData();
  data.append("email", email);
  data.append("password", password);
  const res = await makeRequest("POST", "/auth/register", data);
  if (res.ok) {
    auth.isSignedIn = "yes";
  }

  return res;
}

export async function signIn(
  email: string,
  password: string,
): Promise<{ ok: true } | { ok: false; error: Error }> {
  if (auth.isSignedIn === "yes") {
    console.warn("already signed in.");
    return { ok: true };
  }

  const data = new FormData();
  data.append("email", email);
  data.append("password", password);
  const res = await makeRequest("POST", "/auth/sign-in", data);
  if (res.ok) {
    auth.isSignedIn = "yes";
  }

  return res;
}

export function signOut() {
  auth.isSignedIn = "no";
  auth.profile = null;
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
        throw new Error("Unauthorized", { cause: UNAUTHORIZED });
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
    if (error instanceof Error) {
      return { ok: false, error };
    }

    return { ok: false, error: new Error("An unknown error occurred.") };
  }
}
