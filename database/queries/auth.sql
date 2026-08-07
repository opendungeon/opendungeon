-- name: CreateUser :one
insert into users (email, uuid, is_admin)
values (lower(sqlc.arg(email)), sqlc.arg(uuid), sqlc.arg(is_admin))
returning *;

-- name: GetUser :one
select *
from users
where uuid = sqlc.arg(uuid);

-- name: GetUserByEmail :one
select *
from users
where email = lower(sqlc.arg(email));

-- name: CreateIdentity :one
insert into identities (user_id, provider_id, provider_uid, password_digest)
select 
  u.user_id,
  p.provider_id,
  sqlc.arg(provider_uid),
  sqlc.arg(password_digest)
from users u
join providers p on lower(sqlc.arg(provider)) = p.name
where u.uuid = sqlc.arg(user_uuid)
returning *;

-- name: GetIdentityByEmail :one
select i.*,
  sqlc.embed(u),
  sqlc.embed(p)
from identities i
join users u on u.user_id = i.user_id
join providers p on p.provider_id = i.provider_id
where u.email = lower(sqlc.arg(email))
  and p.name = sqlc.arg(provider);

-- name: GetAdminCount :one
select count(1)
from users
where is_admin = true;
