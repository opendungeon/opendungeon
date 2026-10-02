create table friends (
  friend_id uuid primary key default uuidv7(),
  sender_id uuid not null,
  recipient_id uuid not null,
  accepted boolean not null default false,
  created_at timestamptz not null default current_timestamp,
  updated_at timestamptz not null default current_timestamp,

  constraint fk_friends_sender
    foreign key (sender_id)
    references users(user_id)
    on delete cascade,
  constraint fk_friends_recipient
    foreign key (recipient_id)
    references users(user_id)
    on delete cascade,
  constraint chk_friends_sender_recipient check(
    sender_id <> recipient_id
  )
);
