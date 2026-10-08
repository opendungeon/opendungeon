import { getConfiguration, updateConfiguration } from "#lib/server/database/configuration.js";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  const configuration = await getConfiguration();

  return {
    configuration,
  };
};

export const actions = {
  toggleusercreation: async ({ request }) => {
    const data = await request.formData();
    const enableUserCreation = data.get("enable-user-creation") === "on";
    await updateConfiguration({ is_user_creation_enabled: enableUserCreation });
    return { success: true };
  },
} satisfies Actions;
