import { callAPI, type APIGame, type APILevelMetaData } from "$lib/api";
import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch }) => {
  const levelsRes = await callAPI(fetch, "GET", "/levels");
  if (!levelsRes.ok) {
    error(500, "Failed to get levels.");
  }

  const gamesRes = await callAPI(fetch, "GET", "/games")
  if (!gamesRes.ok) {
    error(500, "Failed to get games.")
  }


  const levels: APILevelMetaData[] = await levelsRes.data.json();
  const games: APIGame[] = await gamesRes.data.json();

  return { levels, games };
};
