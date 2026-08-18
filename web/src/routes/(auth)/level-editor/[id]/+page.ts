import { callAPI, type APICellTexture, type APILevel } from "$lib/api";
import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

export const prerender = false;

export const load: PageLoad = async ({ fetch, params }) => {
  const [cellTextureRes, levelRes] = await Promise.all([
    callAPI(fetch, "GET", "/cell-textures"),
    callAPI(fetch, "GET", "/levels/" + params.id),
  ]);
  if (!cellTextureRes.ok) {
    error(500, cellTextureRes.error.message);
  }

  const cellTextures: APICellTexture[] = await cellTextureRes.data.json();
  if (cellTextures.length < 1) {
    error(500, "instance has no cell textures");
  }

  const level: { id: string; name: null; data: null } | APILevel = !levelRes.ok
    ? { id: params.id, name: null, data: null }
    : await levelRes.data.json();

  return {
    cellTextures,
    level,
  };
};
