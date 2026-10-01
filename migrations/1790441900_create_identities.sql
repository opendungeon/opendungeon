create table identities (
  identity_id uuid primary key default uuidv7(),
  user_id uuid not null,
  password_digest varchar(255) check(password_digest is null or length(password_digest) >= 1),
  provider_uid varchar(255),
  provider_id uuid not null,

  constraint fk_identities_user
    foreign key (user_id)
    references users(user_id)
    on delete cascade,
  constraint fk_identities_provider
    foreign key (provider_id)
    references providers (provider_id)
    on delete cascade,
  constraint chk_identities_valid_provider check(
    (password_digest is not null and provider_uid is null) or
    (password_digest is null and provider_uid is not null)
  )
);
