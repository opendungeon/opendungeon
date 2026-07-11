alter table identities
add column provider_id integer not null
  references providers(provider_id) on delete cascade;
