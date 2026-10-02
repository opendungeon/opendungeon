-- name: CreateFriend :one
insert into friends (initiator_id, target_id)
select i.user_id, t.user_id
from users i
join profiles ip
  on ip.user_id = i.user_id
join profiles p
  on p.username = sqlc.arg(target_username)
join users t
  on t.user_id = p.user_id
where i.uuid = sqlc.arg(initiator_uuid)
returning
  (select u.uuid as target_uuid from users u where u.user_id = target_id),
  accepted,
  created_at;

-- name: AcceptFriend :one
update friends
set accepted = true, updated_at = unixepoch()
where exists (
  select 1
  from users u
  join users t
    on t.uuid = sqlc.arg(target_uuid)
  where u.uuid = sqlc.arg(user_uuid)
    and u.user_id in (friends.initiator_id, friends.target_id)
    and t.user_id in (friends.initiator_id, friends.target_id)
)
returning accepted;

-- name: DeleteFriend :one
delete from friends
where exists (
  select 1
  from users u
  join users t
    on t.uuid = sqlc.arg(target_uuid)
  where u.uuid = sqlc.arg(user_uuid)
    and u.user_id in (friends.initiator_id, friends.target_id)
    and t.user_id in (friends.initiator_id, friends.target_id)
)
returning accepted;

-- name: ListFriends :many
select f.friend_id,
  i.uuid as initiator_uuid,
  t.uuid as target_uuid,
  f.accepted,
  f.created_at,
  f.updated_at,
  sqlc.embed(p),
  m.uuid as avatar_uuid
from users u
join friends f
  on u.user_id in (f.initiator_id, f.target_id)
join users i
  on i.user_id = f.initiator_id
join users t
  on t.user_id = f.target_id
join profiles p
  on p.user_id = case u.user_id
    when f.initiator_id then f.target_id
    else f.initiator_id
  end
left join media m
  on p.avatar_id = m.media_id
where u.uuid = sqlc.arg(user_uuid);

