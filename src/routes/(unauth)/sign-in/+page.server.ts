import { getEmailIdentity } from "#lib/server/database/identities.js";
import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { createSession } from "#lib/server/database/sessions.js";
import { getDiscordAuthUrl, isDiscordConfigured } from "#lib/server/auth.js";
import { configuration } from "#lib/server/configuration.js";

export const load: PageServerLoad = async ({ url }) => {
  const redirectUrl = new URL(url);
  redirectUrl.pathname = "/oauth/callback";
  return {
    discordAuthUrl: !isDiscordConfigured ? null : getDiscordAuthUrl(redirectUrl.toString()),
    registrationAllowed: configuration.isUserCreationEnabled,
    error: url.searchParams.get("error"),
  };
};

export const actions = {
  signin: async ({ cookies, request }) => {
    const data = await request.formData();
    const email = data.get("email");
    if (!email) {
      return fail(400, { success: false, message: "Email is required." });
    }
    const password = data.get("password");
    if (!password) {
      return fail(400, { success: false, message: "Password is required." });
    }

    const identity = await getEmailIdentity(email.toString());
    if (!identity) {
      return fail(404, { success: false, message: "Account not found." });
    }

    const passwordMatches = await Bun.password.verify(
      password.toString(),
      identity.password_digest,
    );
    if (!passwordMatches) {
      return fail(404, { success: false, message: "Account not found." });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14); // set expiration two weeks out
    const session = await createSession(identity.user_id, expiresAt);
    cookies.set("session_id", session.session_id, { path: "/", expires: expiresAt });

    return { success: true, redirect: redirect(303, "/dashboard") };
  },
} satisfies Actions;
