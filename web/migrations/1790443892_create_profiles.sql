create table profiles (
  profile_id serial primary key,
  user_id integer unique not null,
  username varchar(64) unique not null check(3 <= length(username)),
  avatar_id integer references media(media_id) on delete set null,
  created_at timestamptz not null default current_timestamp,
  updated_at timestamptz not null default current_timestamp,

  constraint fk_profiles_user
    foreign key (user_id)
    references users(user_id)
    on delete cascade
);
