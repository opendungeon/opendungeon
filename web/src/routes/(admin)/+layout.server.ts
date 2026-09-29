import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";
import { getUser } from "$lib/server/database/users";

export const load: LayoutServerLoad = async ({ locals }) => {
  const session = locals.session;
  if (!session) {
    redirect(303, "/sign-in");
  }

  const user = await getUser(session.user_id);
  if (!user || !user.is_admin) {
    redirect(303, "/dashboard");
  }
};
