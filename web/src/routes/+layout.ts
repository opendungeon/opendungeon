import { auth, getMyProfile, NOT_FOUND, UNAUTHORIZED } from "$lib/api.svelte";
import { error, redirect } from "@sveltejs/kit";
import type { LayoutLoad } from "./$types";

export const prerender = true;

const authRoutes = ["/register", "/sign-in"];
const profileRoutes = ["/me/edit"];

export const load: LayoutLoad = async ({ url }) => {
  const isUnauthedRoute = authRoutes.some((path) => url.pathname.includes(path));
  if (isUnauthedRoute) {
    return;
  }

  if (auth.isSignedIn === "no") {
    redirect(303, "/sign-in");
  }

  const res = await getMyProfile();
  if (!res.ok) {
    if (res.error.cause === UNAUTHORIZED) {
      auth.isSignedIn = "no";
      redirect(303, "/sign-in");
    } else if (res.error.cause === NOT_FOUND) {
      const isProfileRoute = profileRoutes.some((path) => url.pathname.includes(path));
      if (isProfileRoute) {
        return;
      }
      redirect(303, "/me/edit");
    }

    error(500, res.error.message);
  }
  auth.isSignedIn = "yes";
  auth.profile = res.profile;
};
