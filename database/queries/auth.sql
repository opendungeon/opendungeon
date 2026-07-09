-- name: CreateUser :one
insert into users (email, uuid) 
values (lower(sqlc.arg(email)), sqlc.arg(uuid))
returning user_id,
  uuid,
  email;

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
returning
    (
        select name from providers p where p.provider_id = provider_id
    ) as provider,
    provider_uid,
    password_digest;