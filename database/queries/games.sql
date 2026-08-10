-- name: CreateGame :one
insert into games (uuid, name, is_active, user_id, media_id)
select 
  sqlc.arg(uuid), 
  sqlc.arg(name), 
  sqlc.arg(is_active), 
  u.user_id,
  m.media_id
from users u
join media m
  on m.uuid = sqlc.arg(media_uuid)
where u.uuid = sqlc.arg(user_uuid)
returning *;

-- name: GetGame :one
select g.*
from games g
join players p on g.game_id = p.game_id
join users u on u.uuid = sqlc.arg(user_uuid)
where g.uuid = sqlc.arg(uuid);

-- name: ListGames :many
select sqlc.embed(g)
from games g
join players p on g.game_id = p.game_id
join users u on u.user_id = p.user_id
where u.uuid = sqlc.arg(user_uuid);
