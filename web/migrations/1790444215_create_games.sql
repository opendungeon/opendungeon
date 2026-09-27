create table games(
  game_id serial primary key,
  name varchar(64) not null check(length(name) >= 3),
  user_id integer not null,
  media_id integer not null,
  is_active boolean not null default false,
  created_at timestamptz not null default current_timestamp,
  updated_at timestamptz not null default current_timestamp,

  constraint fk_games_user
    foreign key (user_id)
    references users(user_id)
    on delete cascade,
  constraint fk_games_media
    foreign key (media_id)
    references media(media_id)
    on delete cascade
);
