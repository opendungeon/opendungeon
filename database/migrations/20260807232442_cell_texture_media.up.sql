-- existing cell textures will be permanently lost
drop table cell_textures;

create table cell_textures (
  cell_texture_id integer primary key,
  'key' text not null unique check (2 <= length(key) and length(key) <= 64),
  display_name text not null check (2 <= length(display_name) and length(display_name) <= 64),
  media_id integer not null references media(media_id) on delete cascade,
  created_at integer not null default (unixepoch()),
  updated_at integer not null default (unixepoch()),
  is_deleted boolean not null default false
);
