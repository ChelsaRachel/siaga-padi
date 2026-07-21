-- 0002_group.sql
-- "group" is a reserved word in SQL — quote everywhere.

create table if not exists "group" (
  id                    text primary key,
  "parentId"            text,
  settings              jsonb,
  filters               jsonb,
  "connectionGroupId"   text,
  description           text,
  name                  text,
  image                 text,
  "dashboardId"         text,
  personalization       jsonb,
  "createdAt"           timestamptz default now(),
  "updatedAt"           timestamptz default now()
);

create index if not exists ix_group_parent      on "group" ("parentId");
create index if not exists ix_group_dashboard   on "group" ("dashboardId");
create index if not exists ix_group_createdAt   on "group" ("createdAt" desc);
