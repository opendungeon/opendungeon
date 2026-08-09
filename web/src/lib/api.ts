import { isRedirect, redirect } from "@sveltejs/kit";

export const UNAUTHORIZED = "unauthorized";
export const NOT_FOUND = "not found";
export const BASE_URL = new URL(
  import.meta.env.DEV ? "http://localhost:8000" : window.location.href,
);

export type APIStatus = {
  status: "OK";
  version: string;
  needsSetup: boolean;
};

export type APIUser = {
  id: string;
  email: string;
  isAdmin: boolean;
};

export type APIProfile = {
  username: string;
  avatarId: string;
};

export type APIAuthProvider = {
  name: string;
  authUrl: string;
};

export type APICellTexture = {
  key: string;
  displayName: string;
  mediaId: string;
  createdAt: number;
  updatedAt: number;
};

export type APILevelMetaData = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
};

export type APILevelData = {
  version: number;
  textures: string[];
  grid: {
    cells: {
      r: number;
      q: number;
      weight: number;
      texture: number;
    }[];
  };
};

export type APILevel = APILevelMetaData & {
  data: APILevelData;
};

export type APIGame = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  isActive: boolean;
};

export function getCellTextureUrl(key: string): URL {
  const url = new URL(BASE_URL.href);
  url.pathname = "/api/cell-textures/" + key;
  return url;
}

export function getMediaUrl(mediaId: string): string {
  const url = new URL(BASE_URL.href);
  url.pathname = "/api/media/" + mediaId + "/content";
  return url.toString();
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
    const url = new URL(BASE_URL.href);
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
