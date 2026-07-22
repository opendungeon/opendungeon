-- name: CreatePlayer :one
insert into players (uuid, game_id, user_id, permission_level)
select 
  sqlc.arg(uuid),
  g.game_id,
  u.user_id,
  sqlc.arg(permission_level)
from games g
join users u on u.uuid = sqlc.arg(user_uuid)
where g.uuid = sqlc.arg(game_uuid)
returning
  uuid,
  permission_level;

-- name: GetPlayer :one
select
  p.uuid,
  permission_level
from players p
join users u on p.user_id = u.user_id
join games g on p.game_id = g.game_id
where u.uuid = sqlc.arg(user_uuid)
  and g.uuid = sqlc.arg(game_uuid);
