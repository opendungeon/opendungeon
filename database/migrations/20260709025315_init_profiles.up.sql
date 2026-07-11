create table profiles (
  profile_id integer primary key,
  user_id integer not null references users(user_id) on delete cascade,
  username text unique not null check(3 <= length(username) and length(username) <= 64),
  avatar text check(length(avatar) = 36),
  created_at integer not null default (unixepoch()),
  updated_at integer not null default (unixepoch())
);
