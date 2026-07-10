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
        select u.uuid from users u where u.user_id = user_id
    ) as user_uuid,
    (
        select name from providers p where p.provider_id = provider_id
    ) as provider,
    provider_uid,
    password_digest;

-- name: GetIdentityByEmail :one
select 
    u.uuid as user_uuid,
    p.name as provider,
    i.provider_uid,
    i.password_digest
from identities i
join users u on u.user_id = i.user_id
join providers p on p.provider_id = i.provider_id
where lower(u.email) = lower(sqlc.arg(email));
