pragma foreign_keys=off;

begin transaction;

alter table games rename to games_old;

create table games(
  game_id integer primary key,
  uuid blob unique not null,
  created_at integer not null default (unixepoch()),
  updated_at integer not null default (unixepoch()),
  is_active boolean not null default false,
  name text not null check(length(name) >= 3 and length(name) <= 64),
  user_id integer not null references users(user_id) on delete cascade,
  game_data_uuid blob not null
);

insert into games(game_id, uuid, created_at, updated_at, is_active, name, user_id, game_data_uuid)
select game_id, uuid, created_at, updated_at, is_active, name, user_id, game_data_uuid from games_old;

drop table games_old;

commit transaction;

pragma foreign_keys=on;
