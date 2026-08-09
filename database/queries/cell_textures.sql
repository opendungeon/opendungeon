-- name: CreateCellTexture :one
insert into cell_textures (key, display_name, media_id)
select lower(sqlc.arg(key)),
  sqlc.arg(display_name),
  m.media_id
from media m
where m.uuid = sqlc.arg(media_uuid)
returning *;

-- name: ListCellTextures :many
select sqlc.embed(ct),
  sqlc.embed(m)
from cell_textures ct
join media m
  on ct.media_id = m.media_id
where ct.is_deleted = false
order by ct.created_at desc;
