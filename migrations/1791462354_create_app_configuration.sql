create table app_configuration (
  id serial primary key,
  is_user_creation_enabled boolean not null default true,

  constraint chk_app_configuration_singleton check(id = 1)
);
