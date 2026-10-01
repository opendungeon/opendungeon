create table cell_textures (
  cell_texture_id uuid primary key default uuidv7(),
  "key" varchar(64) not null unique check (2 <= length(key)),
  display_name varchar(64) not null check (2 <= length(display_name)),
  uri varchar(255) not null,
  created_at timestamptz not null default current_timestamp,
  updated_at timestamptz not null default current_timestamp
);
