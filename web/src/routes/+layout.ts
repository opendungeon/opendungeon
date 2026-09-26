import { callAPI, type APIStatus } from "$lib/api";
import { error, redirect } from "@sveltejs/kit";
import type { LayoutLoad } from "./$types";

const setupRoute = "/setup";

export const load: LayoutLoad = async ({ url, fetch }) => {
  const statusRes = await callAPI(fetch, "GET", "/status");
  if (!statusRes.ok) {
    error(500, statusRes.error.message);
  }

  const status: APIStatus = await statusRes.data.json();
  const isSettingUp = url.pathname.includes(setupRoute);
  if (status.needsSetup && !isSettingUp) {
    redirect(303, "/setup");
  }

  return {
    status,
  };
};
