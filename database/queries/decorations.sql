-- name: CreateDecoration :one
insert into decorations (key, display_name, media_id)
select lower(sqlc.arg(key)),
  sqlc.arg(display_name),
  m.media_id
from media m
where m.uuid = sqlc.arg(media_uuid)
returning *;

-- name: ListDecorations :many
select sqlc.embed(d),
  sqlc.embed(m)
from decorations d
join media m
  on d.media_id = m.media_id
where d.is_deleted = false
order by d.created_at desc;
