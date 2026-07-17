import { api, listAuthProviders } from "$lib/api.svelte";
import { error, redirect } from "@sveltejs/kit";
import type { PageLoad } from "./$types";
import { resolve } from "$app/paths";

export const load: PageLoad = async ({ parent }) => {
  await parent();

  if (api.isSignedIn === "yes") {
    redirect(303, resolve("/dashboard"));
  }

  const res = await listAuthProviders();
  if (!res.ok) {
    error(500, res.error.message); // TODO: make it nicer
  }

  return { providers: res.providers };
};
