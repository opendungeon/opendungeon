-- name: CreatePlayer :one
insert into players (game_id, user_id, permission_level)
select
  g.game_id,
  u.user_id,
  sqlc.arg(permission_level)
from games g
join users u on u.uuid = sqlc.arg(user_uuid)
where g.uuid = sqlc.arg(game_uuid)
and exists (
  select 1 
  from players p 
  join users gm on p.user_id = gm.user_id 
  where gm.uuid = sqlc.arg(creator_uuid) 
  and p.permission_level = 'game_master'
)
returning *;

-- name: GetPlayer :one
select p.*
from players p
join users u on p.user_id = u.user_id
join games g on p.game_id = g.game_id
where u.uuid = sqlc.arg(user_uuid)
  and g.uuid = sqlc.arg(game_uuid);

-- name: CreateGameMaster :one
insert into players (game_id, user_id, permission_level)
select
  g.game_id,
  u.user_id,
  'game_master'
from games g
join users u on u.uuid = sqlc.arg(user_uuid)
where g.uuid = sqlc.arg(game_uuid)
returning *;
