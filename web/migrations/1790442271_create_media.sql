create table media (
  media_id serial primary key,
  user_id integer,
  content_type varchar(255) not null check (3 <= length(content_type)),
  size integer not null check (size >= 0),
  created_at timestamptz not null default current_timestamp,

  constraint fk_media_user
    foreign key (user_id)
    references users(user_id)
    on delete set null
);
