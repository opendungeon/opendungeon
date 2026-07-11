create table users (
  user_id integer primary key,
  uuid blob unique not null,
  email text unique not null check(5 <= length(email) and length(email) <= 255),
  is_admin boolean not null default false
)
