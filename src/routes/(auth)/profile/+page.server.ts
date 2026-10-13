import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import {
  createFriend,
  deleteFriend,
  getFriend,
  listFriendProfiles,
  updateFriend,
} from "#lib/server/database/friends.js";
import { getProfile, getProfileByUsername, upsertProfile } from "#lib/server/database/profiles.js";
import { files } from "#lib/server/files/index.js";

const AVATAR_WIDTH = 128;
const AVATAR_HEIGHT = 128;

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
    const userId = String(data.get("user-id")).trim();
    if (!userId) {
      return fail(400, { userId, missing: true });
    }

    const friend = await getFriend(session.user_id, userId);

    await deleteFriend(session.user_id, friend.friend_id);
    return { success: true };
  },
  acceptfriend: async ({ locals, request }) => {
    const { session } = locals;
    if (!session) {
      redirect(303, "/sign-in");
    }

    const data = await request.formData();
    const userId = String(data.get("user-id")).trim();
    if (!userId) {
      return fail(400, { friendId: userId, missing: true });
    }

    const friend = await getFriend(session.user_id, userId);

    await updateFriend(session.user_id, friend.friend_id, true);
    return { success: true };
  },
  editprofile: async ({ locals, request }) => {
    const { session } = locals;
    if (!session) {
      redirect(303, "/sign-in");
    }

    const data = await request.formData();
    const username = data.get("username") as string;
    if (!username) {
      return fail(400, { success: false, message: "Username is required." });
    }

    const avatar = data.get("file") as File | null;
    const avatarUri =
      !avatar || avatar.size === 0
        ? ((await getProfile(session.user_id))?.avatar_uri ?? null)
        : await (async () => {
            const image = new Bun.Image(avatar);
            image.resize(AVATAR_WIDTH, AVATAR_HEIGHT, { filter: "linear" });

            const converted = await image.webp().blob();
            const uri = `avatar/${crypto.randomUUID()}.webp`;
            await files.write(uri, converted);
            return uri;
          })();

    await upsertProfile(session.user_id, username.trim(), avatarUri);

    return { success: true };
  },
} satisfies Actions;
