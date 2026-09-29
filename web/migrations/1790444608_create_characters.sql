create table characters (
  character_id uuid primary key default uuidv7(),
  name varchar(64) not null check(length(name) >= 3),
  user_id uuid not null,
  uri varchar(255) not null,
  created_at timestamptz not null default current_timestamp,
  updated_at timestamptz not null default current_timestamp,

  constraint fk_characters_user
    foreign key (user_id)
    references users(user_id)
    on delete cascade
);
