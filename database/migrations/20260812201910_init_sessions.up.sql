create table sessions (
  session_id integer primary key,
  uuid blob unique not null,
  user_id integer not null references users(user_id) on delete cascade,
  created_at integer not null default (unixepoch()),
  updated_at integer not null default(unixepoch()),
  expires_at integer not null
);
