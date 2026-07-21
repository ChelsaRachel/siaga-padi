-- 0005_role.sql

create table if not exists "role" (
  id              text primary key,
  name            text,
  description     text,
  privileges      jsonb,
  "workspaceId"   text,
  "createdBy"     text,
  "createdAt"     timestamptz default now(),
  "updatedAt"     timestamptz default now()
);

create index if not exists ix_role_workspace on "role" ("workspaceId");
