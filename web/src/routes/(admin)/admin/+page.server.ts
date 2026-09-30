import { fail } from "@sveltejs/kit";
import type { Actions } from "./$types";
import { files } from "$lib/server/files";
import { createCellTexture } from "$lib/server/database/celltextures";

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
    if (!texture) {
      return fail(400, { texture, missing: true });
    }

    const image = new Bun.Image(texture);
    if (image.width !== CELL_TEXTURE_WIDTH) {
      return fail(400, { texture, invalid: true });
    }

    if (image.height !== CELL_TEXTURE_HEIGHT) {
      return fail(400, { texture, invalid: true });
    }

    const cellTextureUri = `celltexture/${crypto.randomUUID()}.png`;
    const converted = await image.png().blob();

    await files.write(cellTextureUri, converted);
    await createCellTexture(key, displayName, cellTextureUri);

    return { success: true };
  },
} satisfies Actions;
