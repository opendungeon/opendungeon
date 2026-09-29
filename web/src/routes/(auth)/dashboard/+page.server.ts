import type { PageServerLoad } from "./$types";
import { listUserGames } from "$lib/server/database/games";
import { listUserLevels } from "$lib/server/database/levels";
import { getProfile } from "$lib/server/database/profiles";

export const load: PageServerLoad = async ({ parent }) => {
  const { session } = await parent();

  const [profile, games, levels] = await Promise.all([
    getProfile(session.user_id),
    listUserGames(session.user_id),
    listUserLevels(session.user_id),
  ]);

  return { profile, levels, games };
};
