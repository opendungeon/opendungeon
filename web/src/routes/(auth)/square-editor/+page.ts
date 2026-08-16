import { callAPI, type APICellTexture } from "$lib/api";
import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

export const prerender = false;

export const load: PageLoad = async ({ fetch }) => {
  const res = await callAPI(fetch, "GET", "/cell-textures");
  if (!res.ok) {
    error(500, res.error.message);
  }

  const cellTextures: APICellTexture[] = await res.data.json();
  if (cellTextures.length < 1) {
    error(500, "instance has no cell textures");
  }

  return {
    cellTextures,
  };
};
