pragma foreign_keys=off;

begin transaction;

alter table players rename to players_old;

create table players(
  player_id integer primary key,
  game_id integer not null references games(game_id) on delete cascade,
  user_id integer not null references users(user_id) on delete cascade,
  permission_level text not null check(permission_level in ('game_master', 'player'))
);

insert into players (player_id, game_id, user_id, permission_level)
select p.player_id,
  p.game_id,
  p.user_id,
  p.permission_level
from players_old p;

drop table players_old;

commit transaction;

pragma foreign_keys=on;
