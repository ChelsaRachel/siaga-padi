"""Request DTOs for the triage routes (`router/triage.py`,
`router/questionnaire.py`, `router/recommendation.py`).

camelCase JSON per the pinned Sprint 05 contract
(`apps/web/docs/api-spec-triage.md`). Semantic rules (answer vocabulary,
question membership in the case's selected set, assisted-session ownership) are
enforced in the SERVICE layer so violations return the contract's 400 envelope
with an Indonesian message — a Pydantic validator would surface as 422 instead.
Response DTOs live in `dto/siaga_triage.py`.
"""
from typing import Optional

from pydantic import BaseModel


class SubmitAnswerDTO(BaseModel):
    """One answered question.

    `answer` is intentionally an unvalidated string here: the service rejects
    anything outside ya/tidak/tidak_tahu with a readable Indonesian 400.
    """

    questionId: Optional[str] = None
    answer: Optional[str] = None


class SubmitAnswersDTO(BaseModel):
    """Body of `POST /cases/{caseId}/answers` — the whole questionnaire.

    The client submits every answer it holds, so a partially filled form the
    farmer returns to later re-submits cleanly (the service upserts by
    `(case_id, question_id)`). Answering is never forced: an unanswered
    question is simply absent from the list.
    """

    answers: list[SubmitAnswerDTO] = []
    """Assisted mode: the penyuluh's open session, so the FILLER is recorded."""
    assistedSessionId: Optional[str] = None


class RunAnalysisDTO(BaseModel):
    """Body of `POST /cases/{caseId}/analysis` — idempotent trigger.

    No analysis inputs today; the pipeline reads everything it needs from the
    case and its photos. It exists so the contract has a stable body shape when
    Sprint 08 adds an explicit config-version override.
    """

    assistedSessionId: Optional[str] = None


class ComposeRecommendationDTO(BaseModel):
    """Body of `POST /cases/{caseId}/recommendation` — idempotent compose."""

    assistedSessionId: Optional[str] = None
