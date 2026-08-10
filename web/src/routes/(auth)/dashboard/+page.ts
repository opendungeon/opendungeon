import { callAPI, type APIGame, type APILevelMetaData } from "$lib/api";
import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch }) => {
  const [levelsRes, gamesRes] = await Promise.all([
    callAPI(fetch, "GET", "/levels"),
    callAPI(fetch, "GET", "/games"),
  ]);
  if (!levelsRes.ok) {
    error(500, "Failed to get levels.");
  }
  if (!gamesRes.ok) {
    error(500, "Failed to get games.");
  }

  const levels: APILevelMetaData[] = await levelsRes.data.json();
  const games: APIGame[] = await gamesRes.data.json();

  return { levels, games };
};
