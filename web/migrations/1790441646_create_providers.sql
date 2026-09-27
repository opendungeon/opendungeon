CREATE TABLE providers (
  provider_id serial primary key,
  name varchar(64) unique not null
);
