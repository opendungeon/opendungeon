create table cell_textures (
  cell_texture_id integer primary key, -- this is purely internal to the database for more efficient indexing
  key text not null unique check (2 <= length(key) and length(key) <= 64),
  display_name text not null check (2 <= length(display_name) and length(display_name) <= 64),
  created_at integer not null default (unixepoch()),
  updated_at integer not null default (unixepoch()),
  is_deleted boolean not null default false -- soft delete so users can undo, will hard delete during a clean up cycle
);
