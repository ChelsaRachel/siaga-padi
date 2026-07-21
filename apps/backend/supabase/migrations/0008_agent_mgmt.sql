-- agent_mgmt — agent management plane integrated into be-python.
--
-- be-python serves dual role: app-domain thin glue + agent management plane (registry,
-- runs, schedules, webhooks, DLQ). Routes mounted under /agent-mgmt/*. Scheduler tick
-- loop runs in be-python's FastAPI lifespan.
--
-- Apply once per project: psql $SUPABASE_DB_URL -f 0008_agent_mgmt.sql
-- (idempotent — uses `create table if not exists`)

-- agents: registry of all agents in the project (PM, ops triple, domain specialists).
create table if not exists agents (
    id                    uuid primary key default gen_random_uuid(),
    slug                  text not null unique,                 -- e.g. dashboard_kemendagri_crawler
    description           text,
    mcp_url               text,                                 -- the agent's MCP endpoint (registered with MCPHub)
    trigger_types         text[] not null default '{}',         -- subset of {'manual','scheduled','webhook','orchestrated'}
    status                text not null default 'active',       -- active | disabled
    -- Autonomy / ops-layer config:
    max_retries           int not null default 0,               -- transient-failure retries (timeout, 5xx). 0 = no retry.
    retry_backoff_seconds int not null default 5,               -- exponential base; effective = base * 2^attempt
    escalation_agent_id   uuid references agents(id) on delete set null,
                                                                -- agent fired pada non-recoverable failure (typically: notifier).
    metadata              jsonb not null default '{}'::jsonb,
    created_at            timestamptz not null default now(),
    updated_at            timestamptz not null default now()
);

-- agent_runs: one row per invocation.
create table if not exists agent_runs (
    id              uuid primary key default gen_random_uuid(),
    agent_id        uuid not null references agents(id) on delete cascade,
    started_at      timestamptz not null default now(),
    finished_at     timestamptz,
    status          text not null default 'running',      -- queued | running | success | failed | retrying
    input           jsonb,
    output          jsonb,
    error           text,
    metrics         jsonb,                                -- business-level metrics: latency_ms, tool_calls, error_class, item_count, dst.
    attempt         int not null default 1,               -- retry attempt number (1-based).
    parent_run_id   uuid references agent_runs(id) on delete set null,
                                                          -- for retries: link ke run sebelumnya. NULL = first attempt.
    escalated_at    timestamptz,                          -- timestamp ketika notifier/escalation_agent fired untuk run ini.
    triggered_by    text not null,                        -- manual | scheduled | webhook | orchestrated | retry | escalation
    trigger_meta    jsonb not null default '{}'::jsonb
);
create index if not exists agent_runs_by_agent_started
    on agent_runs (agent_id, started_at desc);
create index if not exists agent_runs_failed_unescalated
    on agent_runs (agent_id, status) where status = 'failed' and escalated_at is null;

-- agent_schedules: cron-style entries for time-based agents.
create table if not exists agent_schedules (
    id            uuid primary key default gen_random_uuid(),
    agent_id      uuid not null references agents(id) on delete cascade,
    cron_expr     text not null,                        -- e.g. "*/15 * * * *"
    timezone      text not null default 'UTC',
    enabled       boolean not null default true,
    last_run_at   timestamptz,
    next_run_at   timestamptz not null,                 -- maintained by the scheduler tick
    payload       jsonb not null default '{}'::jsonb,   -- input passed to the agent on each tick
    created_at    timestamptz not null default now()
);
create index if not exists agent_schedules_due
    on agent_schedules (next_run_at) where enabled = true;

-- agent_webhooks: event-driven configs.
create table if not exists agent_webhooks (
    id            uuid primary key default gen_random_uuid(),
    agent_id      uuid not null references agents(id) on delete cascade,
    path          text not null unique,                 -- e.g. "lpse-update" -> POST /agent-mgmt/webhooks/lpse-update
    secret_hash   text not null,                        -- sha256(secret); raw secret returned once at creation
    enabled       boolean not null default true,
    last_fired_at timestamptz,
    created_at    timestamptz not null default now()
);

-- agent_dlq: dead-letter queue for failed webhook deliveries / non-recoverable invocations.
-- Monitor agent polls this table and decides escalation; learning agent reads patterns over time.
create table if not exists agent_dlq (
    id              uuid primary key default gen_random_uuid(),
    agent_id        uuid references agents(id) on delete cascade,
    run_id          uuid references agent_runs(id) on delete set null,
    source          text not null,                        -- webhook | scheduler | orchestrator | retry-exhausted
    payload         jsonb,                                -- original input that failed
    error           text,
    error_class     text,                                 -- normalized error type for grouping
    attempts        int not null default 1,
    handled_at      timestamptz,                          -- NULL = un-handled. Set by escalation/learning agent when reviewed.
    handled_by      text,                                 -- agent slug yang handle (typically: monitor / learning)
    created_at      timestamptz not null default now()
);
create index if not exists agent_dlq_unhandled
    on agent_dlq (created_at desc) where handled_at is null;

-- updated_at trigger on agents (reuse if already defined by other migration; else create).
create or replace function set_updated_at() returns trigger as $$
begin
    new.updated_at := now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists agents_set_updated_at on agents;
create trigger agents_set_updated_at
    before update on agents
    for each row execute function set_updated_at();
