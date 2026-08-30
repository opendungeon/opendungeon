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
select sqlc.embed(g), sqlc.embed(gmu)
from games g
join players gm on g.game_id = gm.game_id and gm.permission_level = 'game_master'
join users gmu on gm.user_id = gmu.user_id
join players p on g.game_id = p.game_id
join users u on u.uuid = sqlc.arg(user_uuid)
where g.uuid = sqlc.arg(uuid);

-- name: ListGames :many
select sqlc.embed(g), gmu.uuid as game_master_uuid
from games g
join players p on g.game_id = p.game_id
join users u on u.user_id = p.user_id
join players gm on g.game_id = gm.game_id and gm.permission_level = 'game_master'
join users gmu on gm.user_id = gmu.user_id
where u.uuid = sqlc.arg(user_uuid);

-- name: ListGameProfiles :many
select sqlc.embed(p), u.uuid as user_uuid, m.uuid as avatar_uuid
from players pl
join games g
  on pl.game_id = g.game_id
join users u
  on pl.user_id = u.user_id
join profiles p
  on p.user_id = u.user_id
left join media m
  on p.avatar_id = m.media_id
where g.uuid = sqlc.arg(game_uuid);

-- name: DeleteGame :exec
delete from games
where games.uuid = sqlc.arg(uuid)
and exists (
    select 1
    from users u
    join players p
    on p.user_id = u.user_id
    where u.uuid = sqlc.arg(user_uuid)
      and u.user_id = games.user_id
      and p.permission_level = 'game_master'
  );
