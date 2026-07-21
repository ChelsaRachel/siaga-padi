"""DTOs for the agent_mgmt router — agent management plane.

DTOs for the agent_mgmt plane (mounted at /agent-mgmt/*).
These DTOs are internal — consumed by callers with JWT admin / X-Internal-Token, NOT FE.
FE-facing DTOs live in dto/agent.py (camelCase) and are translated via service/agent.py.
"""
from pydantic import BaseModel, Field
from typing import Optional, Any, Dict, List


class AgentIn(BaseModel):
    """Register or upsert agent in registry."""
    slug: str
    description: Optional[str] = None
    mcp_url: Optional[str] = None
    trigger_types: List[str] = Field(default_factory=list)
    max_retries: int = 0
    retry_backoff_seconds: int = 5
    escalation_agent_id: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class RunIn(BaseModel):
    """Start an agent run."""
    agent_id: Optional[str] = None
    agent_slug: Optional[str] = None
    input: Optional[Dict[str, Any]] = None
    triggered_by: str = "manual"             # manual | scheduled | webhook | orchestrated | retry | escalation
    trigger_meta: Dict[str, Any] = Field(default_factory=dict)
    attempt: int = 1
    parent_run_id: Optional[str] = None


class RunPatch(BaseModel):
    """Finish an agent run."""
    status: str                              # success | failed
    output: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    metrics: Optional[Dict[str, Any]] = None


class ScheduleIn(BaseModel):
    """Create a cron-driven schedule."""
    agent_id: str
    cron_expr: str
    timezone: str = "UTC"
    payload: Dict[str, Any] = Field(default_factory=dict)


class WebhookIn(BaseModel):
    """Create a signed webhook intake."""
    agent_id: str
    path: str
