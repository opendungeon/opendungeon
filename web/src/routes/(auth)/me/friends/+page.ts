import { callAPI, type APIFriend } from "$lib/api";
import { error } from "@sveltejs/kit";
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch, parent }) => {
  const friendsRes = await callAPI(fetch, "GET", "/friends");
  if (!friendsRes.ok) {
    error(500, friendsRes.error.message);
  }

  const friends: APIFriend[] = await friendsRes.data.json();

  const { profile } = await parent();

  return {
    profile,
    friends,
  };
};
