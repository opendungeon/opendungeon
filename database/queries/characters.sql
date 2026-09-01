-- name: UpsertCharacter :one
insert into characters (uuid, user_id, media_id, name)
select 
  sqlc.arg(uuid),
  u.user_id,
  m.media_id,
  sqlc.arg(name)
from users u
join media m
  on m.uuid = sqlc.arg(media_uuid)
where u.uuid = sqlc.arg(user_uuid)
on conflict (uuid)
do update set name = excluded.name,
  media_id = excluded.media_id,
  updated_at = unixepoch()
returning *;

-- name: ListCharacters :many
select sqlc.embed(c),
  sqlc.embed(m)
from characters c
join users u
  on c.user_id = u.user_id
join media m
  on c.media_id = m.media_id
where u.uuid = sqlc.arg(user_uuid);
