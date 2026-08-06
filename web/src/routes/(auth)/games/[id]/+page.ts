import { callAPI, type APIGame } from "$lib/api";
import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

export const prerender = false;

export const load: PageLoad = async ({ fetch, params }) => {
  const res = await callAPI(fetch, "GET", "/games/" + params.id);
  if (!res.ok) {
    error(500, res.error.message);
  }

  const game: APIGame = await res.data.json();
  if (!game.isActive) {
    error(404, "Game is not active"); // TODO: redirect to dashboard with error
  }

  return {
    game,
  };
};
