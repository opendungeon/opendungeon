export type APICellTexture = {
  key: string;
  displayName: string;
  createdAt: number;
  updatedAt: number;
};

class API {
  private baseUrl: URL;

  constructor(baseUrl: URL) {
    this.baseUrl = baseUrl;
  }

  async listCellTextures(): Promise<
    { ok: true; textures: APICellTexture[] } | { ok: false; error: Error }
  > {
    const res = await this.makeRequest<APICellTexture[]>(
      "GET",
      "/cell-textures",
      null,
    );
    if (!res.ok) {
      return res;
    }

    return { ok: true, textures: res.data };
  }

  getCellTextureUrl(key: string): URL {
    const url = new URL(this.baseUrl.href);
    url.pathname = "/api/cell-textures/" + key;
    return url;
  }

  private async makeRequest<T>(
    method: string,
    path: string,
    body: BodyInit | null,
    query?: Record<string, string>,
  ): Promise<{ ok: true; data: T } | { ok: false; error: Error }> {
    if (!this.baseUrl) {
      return { ok: false, error: new Error("No remote URL.") };
    }

    try {
      const url = new URL(this.baseUrl.href);
      url.pathname = "/api" + path;
      if (query) {
        Object.entries(query).forEach(([k, v]) => {
          url.searchParams.set(k, v);
        });
      }

      const res = await fetch(url, {
        method,
        body,
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message);
      }

      const data: T = await res.json();
      return { ok: true, data };
    } catch (error) {
      if (error instanceof Error) {
        return { ok: false, error };
      }

      return { ok: false, error: new Error("An unknown error occurred.") };
    }
  }
}

const baseUrl = new URL(
  import.meta.env.DEV ? "http://localhost:8000" : window.location.href,
);
const api = new API(baseUrl);
export default api;
