create table sessions (
  session_id serial primary key,
  user_id integer not null,
  created_at timestamptz not null default current_timestamp,
  updated_at timestamptz not null default current_timestamp,
  expires_at timestamptz not null,

  constraint fk_sessions_user
    foreign key (user_id)
    references users(user_id)
    on delete cascade
);
