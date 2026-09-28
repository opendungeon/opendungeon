create table players(
  player_id uuid primary key default uuidv7(),
  game_id uuid not null,
  user_id uuid not null,
  permission_level varchar(255) not null check(permission_level in ('game_master', 'player')),

  constraint fk_players_game
    foreign key (game_id)
    references games(game_id)
    on delete cascade,
  constraint fk_players_user
    foreign key (user_id)
    references users(user_id)
    on delete cascade,
  constraint uq_players_game_user unique (game_id, user_id)
);
