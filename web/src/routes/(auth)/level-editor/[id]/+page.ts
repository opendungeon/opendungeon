import { callAPI, type APILevel } from "$lib/api";
import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

export const prerender = false;

export const load: PageLoad = async ({ fetch, params }) => {
  const res = await callAPI(fetch, "GET", "/levels/" + params.id);
  if (!res.ok) {
    error(500, res.error.message);
  }

  return {
    level: (await res.data.json()) as APILevel,
  };
};
