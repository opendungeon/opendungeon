import { callAPI, type APIAuthProvider } from "$lib/api";
import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch }) => {
  const res = await callAPI(fetch, "GET", "/auth/providers");
  if (!res.ok) {
    error(500, res.error.message); // TODO: make it nicer
  }

  const providers: APIAuthProvider[] = await res.data.json();
  return { providers };
};
