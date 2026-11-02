import { deleteSession } from "#lib/server/database/sessions.ts";
import type { PageServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ cookies, locals }) => {
  cookies.delete("session_id", { path: "/" });

  const { session } = locals;
  if (session) {
    await deleteSession(session.session_id);
  }

  redirect(303, "/sign-in");
};
