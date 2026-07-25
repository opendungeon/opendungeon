-- name: CreateLevel :one
insert into levels (uuid, name, user_id)
select 
  sqlc.arg(uuid),
  sqlc.arg(name),
  u.user_id
from users u
where u.uuid = sqlc.arg(user_uuid)
returning
  uuid,
  name,
  created_at,
  updated_at;

-- name: ListLevels :many
select
  l.uuid,
  l.name,
  l.created_at,
  l.updated_at
from levels l
join users u
  on l.user_id = u.user_id
where u.uuid = sqlc.arg(user_uuid)
  and l.is_deleted = false;

-- name: GetLevel :one
select
  l.uuid,
  l.name,
  l.created_at,
  l.updated_at
from levels l
join users u
  on l.user_id = u.user_id
where u.uuid = sqlc.arg(user_uuid)
  and l.uuid = sqlc.arg(level_uuid)
  and l.is_deleted = false;

-- name: UpdateLevel :one
update levels
set name = sqlc.arg(name),
  updated_at = unixepoch()
where levels.uuid = sqlc.arg(level_uuid)
  and exists (
    select 1
    from users u
    where levels.user_id = u.user_id
      and u.uuid = sqlc.arg(user_uuid)
  )
returning
  uuid,
  name,
  created_at,
  updated_at;
