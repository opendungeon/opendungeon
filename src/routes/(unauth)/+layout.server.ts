import type { LayoutServerLoad } from "./$types";
import { redirect } from "@sveltejs/kit";

export const load: LayoutServerLoad = async ({ locals }) => {
  const session = locals.session;
  if (session) {
    redirect(303, "/dashboard");
  }
};
