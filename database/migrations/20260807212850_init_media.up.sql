create table media (
  media_id integer primary key,
  user_id integer references users(user_id) on delete set null,
  uuid blob unique not null,
  content_type text not null check (3 <= length(content_type) and length(content_type) <= 255),
  size integer not null check (size >= 0),
  created_at integer not null default (unixepoch()),
  is_deleted boolean not null default false
);
