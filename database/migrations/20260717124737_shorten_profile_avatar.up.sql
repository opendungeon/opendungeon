begin transaction;

-- create new profiles table with updated constraints
create table profiles_new (
  profile_id integer primary key,
  user_id integer unique not null references users(user_id) on delete cascade,
  username text unique not null check(3 <= length(username) and length(username) <= 64),
  avatar text check(avatar is null or length(avatar) = 36),
  created_at integer not null default (unixepoch()),
  updated_at integer not null default (unixepoch())
);

-- copy over old profile data
insert into profiles_new (profile_id, user_id, username, avatar, created_at, updated_at)
select profile_id, user_id, username, avatar, created_at, updated_at
from profiles;

-- delete old profiles table
drop table profiles;

-- rename new table to replace old
alter table profiles_new rename to profiles;

commit;
