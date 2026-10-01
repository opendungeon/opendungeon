import { isEmailIdentity, listIdentitiesByEmail } from "$lib/server/database/identities";
import { listProviders } from "$lib/server/database/providers";
import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { createSession } from "$lib/server/database/sessions";
// import { DISCORD_CLIENT_ID } from "$env/static/private";
// const discordAuthUrl = "https://discord.com/oauth2/authorize";

export const load: PageServerLoad = async () => {
  const providers = await listProviders();
  return {
    providers,
    /* TODO: discord auth
    providers: providers.map<{ isThirdParty: true; authUri: string } | { isThirdParty: false }>(
      (provider) => {
        if (provider.name === "discord" && hasDiscordClient) {
          const authUri = new URL(discordAuthUrl);
          authUri.searchParams.append("response_type", "code");
          authUri.searchParams.append("client_id", DISCORD_CLIENT_ID);
          authUri.searchParams.append("redirect_url", "TODO");
          authUri.searchParams.append("scope", "email identity");
          authUri.searchParams.append("state", "TODO");
          return { isThirdParty: true, authUri: authUri.toString(), ...provider };
        }

        return { isThirdParty: false, ...provider };
      },
    ),
    */
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

    const identities = await listIdentitiesByEmail(email.toString());
    const emailIdentity = identities.find(isEmailIdentity);
    if (!emailIdentity) {
      return fail(404, { email, notFound: true });
    }

    const passwordMatches = await Bun.password.verify(
      password.toString(),
      emailIdentity.password_digest,
    );
    if (!passwordMatches) {
      return fail(404, { email, notFound: true });
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14); // set expiration two weeks out
    const session = await createSession(emailIdentity.user_id, expiresAt);
    cookies.set("session_id", session.session_id, { path: "/", expires: expiresAt });

    return { success: true, redirect: redirect(303, "/dashboard") };
  },
} satisfies Actions;
