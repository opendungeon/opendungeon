delete from players
where player_id not in (
  select min(player_id) from players group by game_id, user_id
);

create unique index idx_players_game_user on players(game_id, user_id);