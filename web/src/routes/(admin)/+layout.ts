import { callAPI, UNAUTHORIZED, type APIUser } from "$lib/api";
import { error, isRedirect, redirect } from "@sveltejs/kit";
import type { LayoutLoad } from "./$types";

export const load: LayoutLoad = async ({ fetch }) => {
  const res = await callAPI(fetch, "GET", "/users/me").catch(
    (error) =>
      ({
        ok: false,
        error: isRedirect(error)
          ? new Error("Unauthorized", { cause: UNAUTHORIZED })
          : (error as Error),
      }) as const,
  );
  if (!res.ok) {
    if (res.error.cause === UNAUTHORIZED) {
      redirect(303, "/sign-in");
    }

    error(500, res.error.message);
  }

  const user: APIUser = await res.data.json();
  if (!user.isAdmin) {
    redirect(303, "/dashboard");
  }
};
