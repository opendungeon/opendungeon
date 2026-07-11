alter table users
add column primary_identity_id integer
  references identities(identity_id) on delete set null;
