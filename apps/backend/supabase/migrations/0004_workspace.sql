-- 0004_workspace.sql

create table if not exists "workspace" (
  id                text primary key,
  name              text,
  description       text,
  image             text,
  color             text,
  status            text,
  settings          jsonb,
  "createdBy"       text,
  "updatedBy"       text,
  "organizationId"  text,
  url               text,
  personal          boolean default false,
  private           boolean default false,
  "dashboardId"     text,
  "createdAt"       timestamptz default now(),
  "updatedAt"       timestamptz default now()
);

create index if not exists ix_workspace_organization on "workspace" ("organizationId");
create index if not exists ix_workspace_createdBy    on "workspace" ("createdBy");
create index if not exists ix_workspace_createdAt    on "workspace" ("createdAt" desc);

create table if not exists "workspace_integration" (
  id              text primary key,
  "workspaceId"   text not null,
  "userId"        text,
  permission      text,
  "invitedBy"     text,
  metadata        jsonb,
  "createdAt"     timestamptz default now(),
  "updatedAt"     timestamptz default now()
);

create index if not exists ix_workspace_integration_workspace
  on "workspace_integration" ("workspaceId");

create table if not exists "workspace_feature_sharing" (
  id              text primary key,
  "workspaceId"   text not null,
  "featureType"   text,
  "referenceId"   text,
  "sharedBy"      text,
  metadata        jsonb,
  "createdAt"     timestamptz default now(),
  "updatedAt"     timestamptz default now()
);
