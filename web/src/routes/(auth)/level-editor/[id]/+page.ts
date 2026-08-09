import { callAPI, type APICellTexture, type APILevel } from "$lib/api";
import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

export const prerender = false;

export const load: PageLoad = async ({ fetch, params }) => {
  const [levelRes, textureRes] = await Promise.all([
    callAPI(fetch, "GET", "/levels/" + params.id),
    callAPI(fetch, "GET", "/cell-textures"),
  ]);
  if (!levelRes.ok) {
    error(500, levelRes.error.message);
  }

  if (!textureRes.ok) {
    error(500, textureRes.error.message);
  }

  return {
    level: (await levelRes.data.json()) as APILevel,
    cellTextures: (await textureRes.data.json()) as APICellTexture[],
  };
};
