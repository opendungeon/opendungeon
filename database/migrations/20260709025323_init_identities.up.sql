create table identities (
    identity_id integer primary key,
    user_id integer not null references users(user_id) on delete cascade,
    password_digest text check(password_digest is null or length(password_digest) = 60),
    provider_uid text check(provider_uid is null or length(provider_uid) <= 255),

    check(
        (password_digest is not null and provider_uid is null) or
        (password_digest is null and provider_uid is not null)
    )
);