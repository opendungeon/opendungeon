create table players(
  player_id integer primary key,
  uuid blob unique not null,
  game_id integer not null references games(game_id) on delete cascade,
  user_id integer not null references users(user_id) on delete cascade,
  permission_level text not null check(permission_level in ('game_master', 'player'))
)
