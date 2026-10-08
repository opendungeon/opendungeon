import { configuration } from "#lib/server/configuration.js";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  return {
    configuration: configuration.serialize(),
  };
};

export const actions = {
  toggleusercreation: async ({ request }) => {
    const data = await request.formData();
    const enableUserCreation = data.get("enable-user-creation") === "on";
    configuration.isUserCreationEnabled = enableUserCreation;
    return { success: true, isUserCreationEnabled: enableUserCreation };
  },
} satisfies Actions;
