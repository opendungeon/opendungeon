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