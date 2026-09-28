import { getSession } from "$lib/server/database/sessions";
import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ cookies }) => {
  const sessionId = cookies.get("session_id");
  if (!sessionId) {
    redirect(303, "/sign-in");
  }

  const session = await getSession(sessionId);
  if (!session) {
    redirect(303, "/sign-in");
  }

  return { session };
};
