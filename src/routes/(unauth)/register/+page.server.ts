import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { createSession } from "#lib/server/database/sessions.js";
import { createUser } from "#lib/server/database/users.js";
import { createEmailIdentity } from "#lib/server/database/identities.js";
import { getDiscordAuthUrl, isDiscordConfigured } from "#lib/server/auth.js";
import { configuration } from "#lib/server/configuration.js";

export const load: PageServerLoad = async ({ url }) => {
  if (!configuration.isUserCreationEnabled) {
    redirect(303, "/sign-in");
  }

  const redirectUrl = new URL(url);
  redirectUrl.pathname = "/oauth/callback";
  return {
    discordAuthUrl: !isDiscordConfigured ? null : getDiscordAuthUrl(redirectUrl.toString()),
  };
};

export const actions = {
  register: async ({ cookies, request }) => {
    const data = await request.formData();
    const email = data.get("email");
    if (!email) {
      return fail(400, { success: false, message: "Email is required." });
    }

    const password = data.get("password");
    if (!password) {
      return fail(400, { success: false, message: "Password is required." });
    }

    const confirmPassword = data.get("confirmPassword");
    if (!confirmPassword || password !== confirmPassword) {
      return fail(400, { success: false, message: "Passwords do not match." });
    }

    if (!configuration.isUserCreationEnabled) {
      return fail(403, { success: false, message: "User registration is disabled." });
    }

    const user = await createUser(email.toString(), false);

    const passwordDigest = await Bun.password.hash(password.toString());
    const identity = await createEmailIdentity(user.user_id, passwordDigest);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14); // set expiration two weeks out
    const session = await createSession(identity.user_id, expiresAt);
    cookies.set("session_id", session.session_id, { path: "/", expires: expiresAt });

    return { success: true, redirect: redirect(303, "/profile/new") };
  },
} satisfies Actions;
