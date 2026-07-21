-- name: CreateGame :one
insert into games (uuid, name, is_active, user_id, level_id, game_data_uuid)
select 
  sqlc.arg(uuid), 
  sqlc.arg(name), 
  sqlc.arg(is_active), 
  u.user_id, 
  l.level_id, 
  sqlc.arg(game_data_uuid) 
from users u
join levels l on l.uuid = sqlc.arg(level_uuid)
where u.uuid = sqlc.arg(user_uuid)
returning 
  uuid, 
  name, 
  created_at,
  updated_at,
  is_active;

-- name: GetGame :one
select
  g.uuid,
  g.name,
  g.created_at,
  g.updated_at,
  g.is_active
from games g
join players p on g.game_id = p.game_id
join users u on u.uuid = sqlc.arg(user_uuid)
where g.uuid = sqlc.arg(uuid);
