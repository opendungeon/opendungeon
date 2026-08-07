-- name: CreateGame :one
insert into games (uuid, name, is_active, user_id, game_data_uuid)
select 
  sqlc.arg(uuid), 
  sqlc.arg(name), 
  sqlc.arg(is_active), 
  u.user_id, 
  sqlc.arg(game_data_uuid) 
from users u
where u.uuid = sqlc.arg(user_uuid)
returning *;

-- name: GetGame :one
select g.*
from games g
join players p on g.game_id = p.game_id
join users u on u.uuid = sqlc.arg(user_uuid)
where g.uuid = sqlc.arg(uuid);
