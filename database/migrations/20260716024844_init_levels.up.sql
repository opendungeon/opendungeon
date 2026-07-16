create table levels (
  level_id integer primary key,
  uuid blob unique not null,
  name text not null check(3 <= length(name) and length(name) <= 64),
  user_id integer references users(user_id) on delete set null,
  created_at integer not null default (unixepoch()),
  updated_at integer not null default (unixepoch()),
  is_deleted boolean not null default false
);
