import { api, callAPI, NOT_FOUND, UNAUTHORIZED, type APIStatus } from "$lib/api.svelte";
import { error, isRedirect, redirect } from "@sveltejs/kit";
import type { LayoutLoad } from "./$types";

export const prerender = true;
export const ssr = false;

const setupRoute = "/setup";
const profileRoute = "/me/edit";
const authRoutes = ["/setup", "/register", "/sign-in"];

export const load: LayoutLoad = async ({ url, fetch }) => {
  const statusRes = await callAPI(fetch, "GET", "/status");
  if (!statusRes.ok) {
    error(500, statusRes.error.message);
  }
  const { needsSetup }: APIStatus = await statusRes.data.json();
  api.needsSetup = needsSetup ? "yes" : "no";

  const isSetupRoute = url.pathname.includes(setupRoute);
  if (needsSetup && !isSetupRoute) {
    redirect(303, "/setup");
  }

  const profileRes = await callAPI(fetch, "GET", "/profiles/me").catch(
    (error) =>
      ({
        ok: false,
        error: isRedirect(error)
          ? new Error("Unauthorized", { cause: UNAUTHORIZED })
          : (error as Error),
      }) as const,
  );
  if (profileRes.ok) {
    api.profile = await profileRes.data.json();
  } else {
    const isAuthRoute = authRoutes.some((path) => url.pathname.includes(path));
    if (profileRes.error.cause === UNAUTHORIZED && isAuthRoute) {
      return;
    }

    if (profileRes.error.cause === UNAUTHORIZED) {
      redirect(303, "/sign-in");
    }

    if (profileRes.error.cause !== NOT_FOUND) {
      error(500, profileRes.error.message);
    }

    const isProfileRoute = url.pathname.includes(profileRoute);
    if (!isProfileRoute) {
      redirect(303, "/me/edit");
    }
  }

  api.isSignedIn = "yes";
};
