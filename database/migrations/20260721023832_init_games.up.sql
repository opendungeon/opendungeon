create table games(
  game_id integer primary key,
  uuid blob unique not null,
  created_at integer not null default (unixepoch()),
  updated_at integer not null default (unixepoch()),
  is_active boolean not null default false,
  name text not null check(length(name) >= 3 and length(name) <= 64),
  user_id integer not null references users(user_id) on delete cascade,
  level_id integer not null references levels(level_id) on delete cascade,
  game_data_uuid blob not null
);
