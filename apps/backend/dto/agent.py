from pydantic import Field, BaseModel
from typing import Optional, Any, Dict


class AgentInvokeDTO(BaseModel):
    """Request to invoke a workforce agent via the be-agent management plane."""

    agentSlug: str = Field(..., description="Registered slug at be-agent (matches `agents.slug`)")
    input: Dict[str, Any] = Field(default_factory=dict, description="Input payload passed to the agent's `run` tool")
    triggerType: str = Field(default="manual", description="manual | scheduler | event | orchestrated")
    triggeredBy: Optional[str] = Field(default=None, description="User id / event source / sibling agent slug")
    waitForResult: bool = Field(default=False, description="If true, BE polls until run completes (sync). If false, returns run_id (async).")
    waitMaxSeconds: int = Field(default=60, description="Polling cap when waitForResult=true")


class AgentRunResponse(BaseModel):
    """Shape of one run record served to FE."""

    runId: str
    agentSlug: str
    status: str  # queued | running | success | failed
    input: Dict[str, Any]
    output: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    metrics: Optional[Dict[str, Any]] = None
    triggerType: str
    triggeredBy: Optional[str] = None
    startedAt: Optional[str] = None
    finishedAt: Optional[str] = None


class AgentWebhookDTO(BaseModel):
    """Inbound webhook from be-agent when a run finishes (signed via HMAC)."""

    runId: str
    agentSlug: str
    status: str
    output: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    metrics: Optional[Dict[str, Any]] = None
    finishedAt: str
