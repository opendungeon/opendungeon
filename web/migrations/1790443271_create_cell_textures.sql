create table cell_textures (
  cell_texture_id serial primary key,
  "key" varchar(64) not null unique check (2 <= length(key)),
  display_name varchar(64) not null check (2 <= length(display_name)),
  media_id integer not null,
  created_at timestamptz not null default current_timestamp,
  updated_at timestamptz not null default current_timestamp,

  constraint fk_cell_textures_media
    foreign key (media_id)
    references media(media_id)
    on delete cascade
);
