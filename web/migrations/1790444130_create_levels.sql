create table levels (
  level_id serial primary key,
  name varchar(64) not null check(3 <= length(name)),
  user_id integer,
  media_id integer not null,
  created_at timestamptz not null default current_timestamp,
  updated_at timestamptz not null default current_timestamp,

  constraint fk_levels_user
    foreign key (user_id)
    references users(user_id)
    on delete set null,
  constraint fk_levels_media
    foreign key (media_id)
    references media(media_id)
    on delete cascade
);
