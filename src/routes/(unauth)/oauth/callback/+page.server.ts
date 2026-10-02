import { createThirdPartyIdentity, getThirdPartyIdentity } from "$lib/server/database/identities";
import { createUser, getUserByEmail } from "$lib/server/database/users";
import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { createSession } from "$lib/server/database/sessions";
import { exchangeDiscordAuthCode } from "$lib/server/auth";

export const load: PageServerLoad = async ({ cookies, url }) => {
  const code = url.searchParams.get("code");
  if (!code) {
    const params = new URLSearchParams();
    params.append("error", "Missing auth code.");
    redirect(303, "/sign-in?" + params.toString());
  }

  const state = url.searchParams.get("state");
  // TODO: check state

  const authenticate = async (userId: string) => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14); // set expiration two weeks out
    const session = await createSession(userId, expiresAt);
    cookies.set("session_id", session.session_id, { path: "/", expires: expiresAt });
  };

  const redirectUrl = new URL(url);
  redirectUrl.pathname = "/oauth/callback";
  const discordUser = await exchangeDiscordAuthCode(code, redirectUrl.toString());

  const existingIdentity = await getThirdPartyIdentity(discordUser.email, "discord");
  if (existingIdentity) {
    if (discordUser.id === existingIdentity.provider_uid) {
      await authenticate(existingIdentity.user_id);
      redirect(303, "/dashboard");
    }

    const params = new URLSearchParams();
    params.append("error", "Email already in use.");
    redirect(303, "/sign-in?" + params.toString());
  }

  const user = await getUserByEmail(discordUser.email).then(async (existingUser) => {
    if (existingUser) {
      return existingUser;
    }

    return await createUser(discordUser.email, false);
  });

  const identity = await createThirdPartyIdentity(user.user_id, "discord", discordUser.id);
  if (!identity) {
    const params = new URLSearchParams();
    params.append("error", "Discord is not configured as an auth provider.");
    redirect(303, "/sign-in?" + params.toString());
  }

  await authenticate(identity.user_id);

  redirect(303, "/profile/new");
};
