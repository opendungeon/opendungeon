import {
  callAPI,
  type APICellTexture,
  type APIGame,
  type APILevel,
  type APIProfile,
} from "$lib/api";
import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

export const prerender = false;

export const load: PageLoad = async ({ fetch, params, parent }) => {
  const [cellTextureRes, gameRes, profilesRes] = await Promise.all([
    callAPI(fetch, "GET", "/cell-textures"),
    callAPI(fetch, "GET", "/games/" + params.id),
    callAPI(fetch, "GET", "/games/" + params.id + "/profiles"),
  ]);
  if (!cellTextureRes.ok) {
    error(500, cellTextureRes.error.message);
  }

  const cellTextures: APICellTexture[] = await cellTextureRes.data.json();
  if (cellTextures.length < 1) {
    error(500, "instance has no cell textures");
  }

  if (!gameRes.ok) {
    error(500, gameRes.error.message);
  }

  const game: APIGame = await gameRes.data.json();
  if (!game.isActive) {
    error(404, "Game is not active"); // TODO: redirect to dashboard with error
  }

  if (!profilesRes.ok) {
    error(500, profilesRes.error.message);
  }

  const profiles: APIProfile[] = await profilesRes.data.json();

  const { profile } = await parent();
  let levels: APILevel[] = [];
  if (profile && profile.id === game.gameMasterId) {
    const res = await callAPI(fetch, "GET", "/levels");
    if (!res.ok) {
      error(500, res.error.message);
    }

    levels = await res.data.json();
  }

  return {
    profile,
    cellTextures,
    game,
    profiles,
    levels,
  };
};
