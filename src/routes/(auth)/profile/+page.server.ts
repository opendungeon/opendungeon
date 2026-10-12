import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import {
  createFriend,
  deleteFriend,
  listFriendProfiles,
  updateFriend,
} from "#lib/server/database/friends.js";
import { getProfile, getProfileByUsername } from "#lib/server/database/profiles.js";

export const load: PageServerLoad = async ({ locals }) => {
  const { session } = locals;
  if (!session) {
    redirect(303, "/sign-in");
  }

  const [profile, friends] = await Promise.all([
    getProfile(session.user_id),
    listFriendProfiles(session.user_id),
  ]);
  if (!profile) {
    redirect(303, "/profile/new");
  }

  return { friends, profile };
};

export const actions = {
  addfriend: async ({ locals, request }) => {
    const { session } = locals;
    if (!session) {
      redirect(303, "/sign-in");
    }

    const data = await request.formData();

    const username = String(data.get("username")).trim();
    if (!username) {
      return fail(400, { username, missing: true });
    }

    const profile = await getProfileByUsername(username);
    if (!profile) {
      return fail(404, { profile: "profile", notFound: true });
    }

    await createFriend(session.user_id, profile.user_id);

    return { success: true };
  },
  removefriend: async ({ locals, request }) => {
    const { session } = locals;
    if (!session) {
      redirect(303, "/sign-in");
    }

    const data = await request.formData();
    const friendId = String(data.get("friend-id")).trim();
    if (!friendId) {
      return fail(400, { friendId, missing: true });
    }

    await deleteFriend(session.user_id, friendId);
    return { success: true };
  },
  acceptfriend: async ({ locals, request }) => {
    const { session } = locals;
    if (!session) {
      redirect(303, "/sign-in");
    }

    const data = await request.formData();
    const friendId = String(data.get("friend-id")).trim();
    if (!friendId) {
      return fail(400, { friendId, missing: true });
    }

    await updateFriend(session.user_id, friendId, true);
    return { success: true };
  },
} satisfies Actions;
