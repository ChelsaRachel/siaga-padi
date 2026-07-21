-- 0006_connection.sql

create table if not exists "connection_group" (
  id              text primary key,
  name            text,
  description     text,
  "workspaceId"   text,
  "createdBy"     text,
  metadata        jsonb,
  "createdAt"     timestamptz default now(),
  "updatedAt"     timestamptz default now()
);

create index if not exists ix_connection_group_workspace on "connection_group" ("workspaceId");

create table if not exists "connection" (
  id                    text primary key,
  name                  text,
  description           text,
  type                  text,
  config                jsonb,
  "connectionGroupId"   text,
  "workspaceId"         text,
  "createdBy"           text,
  "createdAt"           timestamptz default now(),
  "updatedAt"           timestamptz default now()
);

create index if not exists ix_connection_group     on "connection" ("connectionGroupId");
create index if not exists ix_connection_workspace on "connection" ("workspaceId");
