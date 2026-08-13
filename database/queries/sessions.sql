-- name: CreateSession :one
insert into sessions (uuid, user_id, expires_at)
select sqlc.arg(uuid),
  u.user_id,
  sqlc.arg(expires_at)
from users u
where u.uuid = sqlc.arg(user_uuid)
returning *;

-- name: GetSession :one
select s.*,
  sqlc.embed(u)
from sessions s
join users u
  on s.user_id = u.user_id
where s.uuid = sqlc.arg(uuid);

-- name: ExtendSession :exec
update sessions
set expires_at = sqlc.arg(expires_at),
  updated_at = unixepoch()
where sessions.uuid = sqlc.arg(uuid)
  and exists (
    select 1
    from users u
    where u.uuid = sqlc.arg(user_uuid)
      and u.user_id = sessions.user_id
  );

-- name: DeleteSession :exec
delete from sessions
where sessions.uuid = sqlc.arg(uuid)
  and exists (
    select 1
    from users u
    where u.uuid = sqlc.arg(user_uuid)
      and u.user_id = sessions.user_id
  );
