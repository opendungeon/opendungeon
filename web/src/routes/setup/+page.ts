import { api } from "$lib/api.svelte";
import { redirect } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ parent }) => {
  await parent();

  if (api.needsSetup === "no") {
    redirect(303, "/dashboard");
  }
};
