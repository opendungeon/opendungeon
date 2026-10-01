export type Player = {
  player_id: string;
  game_id: string;
  user_id: string;
  permission_level: "game_master" | "player";
};
