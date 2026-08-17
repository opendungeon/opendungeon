-- name: UpsertLevel :one
insert into levels (uuid, name, user_id, media_id)
select 
  sqlc.arg(uuid),
  sqlc.arg(name),
  u.user_id,
  m.media_id
from users u
join media m
  on m.uuid = sqlc.arg(media_uuid)
where u.uuid = sqlc.arg(user_uuid)
on conflict (uuid)
do update set name = excluded.name,
  media_id = excluded.media_id,
  updated_at = unixepoch()
returning *;

-- name: ListLevels :many
select sqlc.embed(l),
  sqlc.embed(m)
from levels l
join users u
  on l.user_id = u.user_id
join media m
  on l.media_id = m.media_id
where u.uuid = sqlc.arg(user_uuid)
  and l.is_deleted = false;

-- name: GetLevel :one
select sqlc.embed(l),
  sqlc.embed(m)
from levels l
join users u
  on l.user_id = u.user_id
join media m
  on l.media_id = m.media_id
where u.uuid = sqlc.arg(user_uuid)
  and l.uuid = sqlc.arg(level_uuid)
  and l.is_deleted = false;
