create table levels (
  level_id uuid primary key default uuidv7(),
  name varchar(64) not null check(3 <= length(name)),
  user_id uuid,
  uri varchar(255) not null,
  created_at timestamptz not null default current_timestamp,
  updated_at timestamptz not null default current_timestamp,

  constraint fk_levels_user
    foreign key (user_id)
    references users(user_id)
    on delete set null
);
