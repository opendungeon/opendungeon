create table users (
  user_id serial primary key,
  email varchar(255) unique not null check(5 <= length(email) and email = lower(email)),
  is_admin boolean not null default false
);
