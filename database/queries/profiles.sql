-- name: UpsertProfile :one
insert into profiles (user_id, username, avatar)
select u.user_id, sqlc.arg(username), sqlc.arg(avatar)
from users u
where u.uuid = sqlc.arg(user_uuid)
on conflict (user_id)
  do update set username = excluded.username, avatar = excluded.avatar
returning
  username,
  avatar,
  created_at,
  updated_at;

-- name: GetProfile :one
select p.username,
  p.avatar,
  p.created_at,
  p.updated_at
from users u
join profiles p
  on u.user_id = p.user_id
where u.uuid = sqlc.arg(user_uuid);
