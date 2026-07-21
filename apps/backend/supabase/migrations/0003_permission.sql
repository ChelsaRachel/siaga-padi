-- 0003_permission.sql

create table if not exists "permission" (
  id                    text primary key,
  "createdBy"           text,
  "dashboardId"         text,
  name                  text,
  description           text,
  privileges            jsonb,
  type                  text,
  alias                 text,
  "parentId"            text,
  image                 text,
  change_application    boolean,
  main_page             text,
  "rolePosition"        text,
  "workspaceId"         text,
  "createdAt"           timestamptz default now(),
  "updatedAt"           timestamptz default now()
);

create index if not exists ix_permission_workspace  on "permission" ("workspaceId");
create index if not exists ix_permission_alias      on "permission" (alias);
create index if not exists ix_permission_createdAt  on "permission" ("createdAt" desc);
