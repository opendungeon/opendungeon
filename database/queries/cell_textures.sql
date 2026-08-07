-- name: CreateCellTexture :one
insert into cell_textures (key, display_name)
values (lower(sqlc.arg(key)), sqlc.arg(display_name))
returning *;

-- name: SoftDeleteCellTexture :one
update cell_textures
set updated_at = unixepoch(),
  is_deleted = true
where key = ?
returning *;

-- name: HardDeleteCellTexture :one
delete from cell_textures
where key = ?
returning *;

-- name: GetCellTexture :one
select *
from cell_textures
where key = ? and is_deleted = false;

-- name: ListCellTextures :many
select *
from cell_textures
where is_deleted = false
order by created_at desc;
