-- name: UpsertProfile :one
insert into profiles (user_id, username, avatar_id)
select u.user_id,
  sqlc.arg(username),
  m.media_id
from users u
left join media m
  on m.uuid = sqlc.arg(avatar_uuid)
where u.uuid = sqlc.arg(user_uuid)
on conflict (user_id)
  do update set username = excluded.username, avatar_id = excluded.avatar_id
returning *;

-- name: GetProfile :one
select sqlc.embed(p),
  m.uuid as avatar_uuid
from users u
join profiles p
  on u.user_id = p.user_id
left join media m
  on p.avatar_id = m.media_id
where u.uuid = sqlc.arg(user_uuid);

-- name: ListGameProfiles :many
select sqlc.embed(p), u.uuid as user_uuid, m.uuid as avatar_uuid
from profiles p
join players pl
  on p.user_id = pl.user_id
join games g
  on pl.game_id = g.game_id
join users u
  on pl.user_id = u.user_id
left join media m
  on p.avatar_id = m.media_id
where g.uuid = sqlc.arg(game_uuid);