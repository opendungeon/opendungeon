import { DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET } from "$app/env/private";

const discordAuthUrl = "https://discord.com/oauth2/authorize";
const discordTokenUrl = "https://discord.com/api/oauth2/token";
const discordApiUrl = "https://discord.com/api";

export const isDiscordConfigured = !!DISCORD_CLIENT_ID && !!DISCORD_CLIENT_SECRET;

type ThirdPartyUser = {
  id: string;
  username: string;
  avatar: string | null;
  email: string;
};

export function getDiscordAuthUrl(redirectUrl: string): URL {
  const authUrl = new URL(discordAuthUrl);
  authUrl.searchParams.append("response_type", "code");
  authUrl.searchParams.append("client_id", DISCORD_CLIENT_ID);
  authUrl.searchParams.append("redirect_url", redirectUrl);
  authUrl.searchParams.append("scope", "email identify");
  authUrl.searchParams.append("state", "TODO");
  return authUrl;
}

export async function exchangeDiscordAuthCode(
  code: string,
  redirectUrl: string,
): Promise<ThirdPartyUser> {
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    client_secret: DISCORD_CLIENT_SECRET,
    grant_type: "authorization_code",
    redirect_uri: redirectUrl,
    code,
  });

  const tokenRes = await fetch(discordTokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!tokenRes.ok) {
    const data = await tokenRes.text();
    throw new Error(`Failed to exchange code: ${data}`);
  }

  const { access_token }: { access_token: string } = await tokenRes.json();

  const userRes = await fetch(discordApiUrl + "/users/@me", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!userRes.ok) {
    const data = await tokenRes.text();
    throw new Error(`Failed to get user: ${data}`);
  }

  const user: ThirdPartyUser = await userRes.json();
  return user;
}
