import { error, fail, redirect, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getUserLevel, upsertLevel, type LevelData } from "#lib/server/database/levels.js";
import { listCellTextures } from "#lib/server/database/celltextures.js";
import { files } from "#lib/server/files/index.js";

export const load: PageServerLoad = async ({ locals, params }) => {
  const { session } = locals;
  if (!session) {
    redirect(303, "/sign-in");
  }

  const { id: levelId } = params;

  const [cellTextures, level] = await Promise.all([
    listCellTextures(),
    getUserLevel(session.user_id, levelId),
  ]);

  try {
    const levelData = !level
      ? null
      : await (async () => {
          const file = files.file(level.uri);
          const exists = await file.exists();
          if (!exists) {
            throw new Error("Level data not found.");
          }

          const data: LevelData = await file.json();
          return data;
        })();

    return {
      level: !level
        ? { level_id: levelId, name: null, data: null }
        : { ...level, data: levelData! },
      cellTextures,
    };
  } catch (e) {
    if (e instanceof Error) {
      error(404, e.message);
    }

    console.error(e);
    error(500, "Internal server error.");
  }
};

export const actions = {
  savelevel: async ({ locals, params, request }) => {
    const { session } = locals;
    if (!session) {
      redirect(303, "/sign-in");
    }

    const { id: levelId } = params;
    if (!levelId) {
      return fail(404, "Level not found.");
    }

    const form = await request.formData();
    const name = form.get("name") as string;
    if (!name) {
      return fail(400, { name, missing: true });
    }

    const data = form.get("level-data") as File;
    // TODO: validate data is actual level data

    const uri = `levels/${crypto.randomUUID()}.json`;
    await files.write(uri, data);

    // TODO: delete any existing level data
    await upsertLevel(session.user_id, levelId, name, uri);

    return { success: true };
  },
} satisfies Actions;
