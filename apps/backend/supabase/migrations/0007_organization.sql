-- 0007_organization.sql

create table if not exists "organization" (
  id              text primary key,
  name            text,
  description     text,
  image           text,
  domain          text,
  settings        jsonb,
  "createdBy"     text,
  "createdAt"     timestamptz default now(),
  "updatedAt"     timestamptz default now()
);

create index if not exists ix_organization_domain    on "organization" (domain);
create index if not exists ix_organization_createdBy on "organization" ("createdBy");
