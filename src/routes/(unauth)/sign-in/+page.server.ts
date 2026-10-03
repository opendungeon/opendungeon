import { getEmailIdentity } from "#lib/server/database/identities.js";
import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { createSession } from "#lib/server/database/sessions.js";
import { getDiscordAuthUrl, isDiscordConfigured } from "#lib/server/auth.js";

export const load: PageServerLoad = async ({ url }) => {
  const redirectUrl = new URL(url);
  redirectUrl.pathname = "/oauth/callback";
  return {
    discordAuthUrl: !isDiscordConfigured ? null : getDiscordAuthUrl(redirectUrl.toString()),
  };
};

export const actions = {
  signin: async ({ cookies, request }) => {
    const data = await request.formData();
    const email = data.get("email");
    if (!email) {
      return fail(400, { email, missing: true });
    }
    const password = data.get("password");
    if (!password) {
      return fail(400, { password, missing: true });
    }

    const identity = await getEmailIdentity(email.toString());
    if (!identity) {
      return fail(404, { email, notFound: true });
    }

    const passwordMatches = await Bun.password.verify(
      password.toString(),
      identity.password_digest,
    );
    if (!passwordMatches) {
      return fail(404, { email, notFound: true });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14); // set expiration two weeks out
    const session = await createSession(identity.user_id, expiresAt);
    cookies.set("session_id", session.session_id, { path: "/", expires: expiresAt });

    return { success: true, redirect: redirect(303, "/dashboard") };
  },
} satisfies Actions;
