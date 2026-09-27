create table identities (
  identity_id serial primary key,
  user_id integer not null,
  password_digest varchar(60) check(password_digest is null or length(password_digest) = 60),
  provider_uid varchar(255),
  provider_id integer not null,

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
