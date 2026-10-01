create table profiles (
  profile_id uuid primary key default uuidv7(),
  user_id uuid unique not null,
  username varchar(64) unique not null check(3 <= length(username)),
  avatar_uri varchar(255),
  created_at timestamptz not null default current_timestamp,
  updated_at timestamptz not null default current_timestamp,

  constraint fk_profiles_user
    foreign key (user_id)
    references users(user_id)
    on delete cascade
);
