import { redirect } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ parent }) => {
  const { status } = await parent();

  if (!status.needsSetup) {
    redirect(303, "/dashboard");
  }
};
