import { createProfile } from "$lib/server/database/profiles";
import { files } from "$lib/server/files";
import { fail, redirect, type Actions } from "@sveltejs/kit";

const AVATAR_WIDTH = 128;
const AVATAR_HEIGHT = 128;

export const actions = {
  createprofile: async ({ locals, request }) => {
    const session = locals.session;
    if (!session) {
      redirect(303, "/sign-in");
    }

    const data = await request.formData();

    const username = data.get("username") as string;
    if (!username) {
      return fail(400, { username, missing: true });
    }

    const avatar = data.get("file") as File | null;
    const avatarUri = !avatar
      ? null
      : await (async () => {
          const image = new Bun.Image(avatar);
          image.resize(AVATAR_WIDTH, AVATAR_HEIGHT, { filter: "linear" });
          const converted = await image.png().blob();

          const ext = avatar.name.split(".").at(-1) ?? "";
          const uri = `avatar/${crypto.randomUUID()}${!ext ? "" : "." + ext}`;
          await files.write(uri, converted);
          return uri;
        })();

    console.log({ userId: session.user_id, username, avatarUri });

    await createProfile(session.user_id, username, avatarUri);

    return { success: true, redirect: redirect(303, "/dashboard") };
  },
} satisfies Actions;
