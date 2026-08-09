-- name: CreateMedia :one
insert into media (uuid, content_type, size, user_id)
select sqlc.arg(uuid),
    sqlc.arg(content_type),
    sqlc.arg(size),
    u.user_id
from users u
where u.uuid = sqlc.arg(user_uuid)
returning *;

-- name: GetMedia :one
select *
from media
where uuid = ?;
