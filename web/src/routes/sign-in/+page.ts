import { listAuthProviders } from "$lib/api.svelte";
import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

export const load: PageLoad = async () => {
  const res = await listAuthProviders();
  if (!res.ok) {
    error(500, res.error.message); // TODO: make it nicer
  }

  return { providers: res.providers };
};
