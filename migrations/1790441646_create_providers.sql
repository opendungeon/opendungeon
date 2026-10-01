CREATE TABLE providers (
  provider_id uuid primary key default uuidv7(),
  name varchar(64) unique not null
);
