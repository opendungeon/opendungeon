create table characters (
  character_id integer primary key,
  uuid blob unique not null,
  user_id integer not null references users(user_id) on delete cascade,
  media_id integer not null references media(media_id) on delete cascade,
  created_at integer not null default (unixepoch()),
  updated_at integer not null default (unixepoch()),
  name text not null check(length(name) >= 3 and length(name) <= 64)
);
