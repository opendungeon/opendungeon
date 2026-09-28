import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ cookies }) => {
  const sessionId = cookies.get("session_id");
  if (sessionId) {
    redirect(303, "/dashboard");
  }
};
