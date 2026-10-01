import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ locals }) => {
  const session = locals.session;
  if (!session) {
    redirect(303, "/sign-in");
  }

  return { session };
};
