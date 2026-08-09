pragma foreign_keys=off;

begin transaction;

alter table profiles rename to profiles_old;

create table profiles (
  profile_id integer primary key,
  user_id integer unique not null references users(user_id) on delete cascade,
  username text unique not null check(3 <= length(username) and length(username) <= 64),
  avatar_id integer references media(media_id) on delete set null,
  created_at integer not null default (unixepoch()),
  updated_at integer not null default (unixepoch())
);

insert into profiles (user_id, username, avatar_id, created_at, updated_at)
select po.user_id,
  po.username,
  null,
  po.created_at,
  po.updated_at
from profiles_old po;

drop table profiles_old;

commit transaction;

pragma foreign_keys=on;
