-- 0001_user.sql
-- Tables: user, user_status, user_workspace, user_integration, user_external
-- Columns are quoted to preserve camelCase, mirroring DTO field names.

create table if not exists "user" (
  id              text primary key,
  "createdBy"     text,
  username        text,
  fullname        text,
  password        text,
  email           text unique,
  "permissionId"  text,
  "workspaceId"   text,
  about           text,
  "dateOfBirth"   bigint,
  gender          text,
  "lastActive"    bigint,
  "expiredDate"   bigint,
  phone           text not null,
  "groupId"       text,
  status          text,
  image           text,
  "multiLogin"    boolean,
  "emailVerified" boolean,
  address         jsonb,
  tags            jsonb,
  additional      jsonb,
  "createdAt"     timestamptz default now(),
  "updatedAt"     timestamptz default now()
);

create index if not exists ix_user_email      on "user" (email);
create index if not exists ix_user_workspace  on "user" ("workspaceId");
create index if not exists ix_user_createdAt  on "user" ("createdAt" desc);

create table if not exists "user_status" (
  id          text primary key,
  "userId"    text not null,
  status      text,
  "lastSeen"  bigint,
  "createdAt" timestamptz default now(),
  "updatedAt" timestamptz default now()
);

create index if not exists ix_user_status_user on "user_status" ("userId");

create table if not exists "user_workspace" (
  id              text primary key,
  "userId"        text not null,
  "workspaceId"   text not null,
  "permissionId"  text,
  "invitedBy"     text,
  "createdAt"     timestamptz default now(),
  "updatedAt"     timestamptz default now()
);

create unique index if not exists ix_user_workspace_pair
  on "user_workspace" ("userId", "workspaceId");

create table if not exists "user_integration" (
  id            text primary key,
  "userId"      text,
  provider      text,
  "providerId"  text,
  metadata      jsonb,
  "createdAt"   timestamptz default now(),
  "updatedAt"   timestamptz default now()
);

create table if not exists "user_external" (
  id          text primary key,
  email       text,
  source      text,
  metadata    jsonb,
  "createdAt" timestamptz default now(),
  "updatedAt" timestamptz default now()
);
