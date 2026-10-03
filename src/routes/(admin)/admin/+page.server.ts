import { fail } from "@sveltejs/kit";
import type { Actions } from "./$types";
import { files } from "#lib/server/files/index.js";
import { createCellTexture } from "#lib/server/database/celltextures.js";

const CELL_TEXTURE_WIDTH = 64;
const CELL_TEXTURE_HEIGHT = 64;

export const actions = {
  createcelltexture: async ({ request }) => {
    const data = await request.formData();

    const key = data.get("key") as string;
    if (!key) {
      return fail(400, { key, missing: true });
    }

    const displayName = data.get("display-name") as string;
    if (!displayName) {
      return fail(400, { displayName, missing: true });
    }

    const texture = data.get("file") as File;
    if (texture.size === 0) {
      return fail(400, { texture: "texture", missing: true });
    }

    const image = new Bun.Image(texture);
    const { width, height } = await image.metadata();
    if (width !== CELL_TEXTURE_WIDTH) {
      return fail(400, { texture: "texture", invalid: true });
    }

    if (height !== CELL_TEXTURE_HEIGHT) {
      return fail(400, { texture: "texture", invalid: true });
    }

    const cellTextureUri = `celltexture/${crypto.randomUUID()}.png`;
    const blob = await image.png().blob();

    await files.write(cellTextureUri, blob);
    await createCellTexture(key, displayName, cellTextureUri);

    return { success: true };
  },
} satisfies Actions;
