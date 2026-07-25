import { callAPI, type APILevelMetaData } from "$lib/api";
import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch }) => {
  const res = await callAPI(fetch, "GET", "/levels");
  if (!res.ok) {
    error(500, "Failed to get levels.");
  }

  const levels: APILevelMetaData[] = await res.data.json();

  return { levels };
};
