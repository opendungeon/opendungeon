import { db } from "$lib/server/database";

type CellTexture = {
  cell_texture_id: string;
  key: string;
  display_name: string;
  uri: string;
  created_at: Date;
  updated_at: Date;
};

export async function createCellTexture(
  key: string,
  displayName: string,
  uri: string,
): Promise<CellTexture> {
  const [cellTexture] = await db<[CellTexture]>`
    INSERT INTO cell_textures (key, display_name, uri)
    VALUES (lower(${key}), ${displayName}, ${uri})
    RETURNING cell_texture_id,
      key,
      display_name,
      uri,
      created_at,
      updated_at;
  `;

  return cellTexture;
}
