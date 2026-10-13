alter table players
add column created_at timestamptz not null default current_timestamp,
add column updated_at timestamptz not null default current_timestamp;