"""Questionnaire engine — ≤5 approved questions, answers, urgency.

Implements the Sprint 05 contract (`apps/web/docs/api-spec-triage.md`) for the
context step:

- Questions come from the APPROVED bank only and are selected from the analysis
  candidates plus the growth phase. Selection is deterministic, so re-opening
  the questionnaire shows the same questions in the same order.
- Answering is never forced. The client submits whatever it holds; an
  unanswered question is simply absent, and "tidak_tahu" is a first-class
  answer that adds an uncertainty note rather than a risk signal.
- A risky answer COMBINATION raises `cases.urgency_flag`. It never touches the
  analysis label — that row is immutable and lives in a different table, which
  is the structural reason an answer cannot rewrite a diagnosis.

In assisted mode the FILLER (the penyuluh) is recorded on every answer, not the
case owner: "who answered this" is an audit question, not a courtesy.
"""
from typing import Optional

from loguru import logger

from dto.siaga_triage import QuestionSetOut, question_from_row
from exceptions.siaga_exceptions import SiagaNotFoundError, SiagaValidationError
from models.siaga_case import (
    STATUS_GENERATING_RECOMMENDATION,
    STATUS_NEEDS_CONTEXT,
    display_stage_for,
)
from models.siaga_triage import (
    QUESTION_BANK_VERSION,
    disease_tags_for,
    is_urgent,
    select_questions,
    urgency_score,
)
from service.siaga_case_support import (
    new_id,
    now_iso,
    resolve_actor_context,
    resolve_caller_profile,
)
from service.triage_support import (
    ANALYSIS_NOT_FOUND_MESSAGE,
    UNKNOWN_QUESTION_MESSAGE,
    TriageRepository,
    TriageRepositoryProtocol,
    advance_case,
    get_actionable_case,
    get_visible_case,
    validate_answer,
)

ANSWERS_EMPTY_MESSAGE = "Tidak ada jawaban yang dikirim."
ANSWERED_EVENT_NOTE = "Kuesioner konteks selesai — menyusun rekomendasi"


class QuestionnaireService:
    """Selects the case's questions and records its answers."""

    def __init__(self, repo: Optional[TriageRepositoryProtocol] = None) -> None:
        self._repo = repo

    @property
    def repo(self) -> TriageRepositoryProtocol:
        if self._repo is None:
            self._repo = TriageRepository()
        return self._repo

    # ---- read -----------------------------------------------------------------

    def get_questions(self, user_id: str, case_id: str) -> dict:
        """The ≤5 questions for this case, with any answers already given."""
        caller = resolve_caller_profile(self.repo, user_id)
        case = get_visible_case(self.repo, caller, case_id)
        selected = self._select_for_case(case)
        answers_by_question = {
            row["question_id"]: row["answer"] for row in self.repo.list_answers(case_id)
        }
        return self._question_set_out(case, selected, answers_by_question)

    def _select_for_case(self, case: dict) -> list[dict]:
        """Selection is keyed off the FROZEN analysis result, never re-derived."""
        analysis = self.repo.get_analysis_by_case(case["id"])
        if analysis is None:
            raise SiagaNotFoundError(ANALYSIS_NOT_FOUND_MESSAGE)
        tags = disease_tags_for(list(analysis.get("candidates") or []))
        return select_questions(
            self.repo.list_approved_questions(), tags, case.get("growth_stage")
        )

    def _question_set_out(
        self, case: dict, selected: list[dict], answers_by_question: dict
    ) -> dict:
        questions = [
            question_from_row(row, answers_by_question.get(row["id"]))
            for row in selected
        ]
        return QuestionSetOut(
            caseId=case["id"],
            questions=questions,
            totalCount=len(questions),
            answeredCount=sum(1 for item in questions if item.answer),
            questionBankVersion=QUESTION_BANK_VERSION,
            caseStatus=case["status"],
            caseDisplayStage=display_stage_for(case["status"]),
        ).model_dump()

    # ---- write ----------------------------------------------------------------

    def submit_answers(self, user_id: str, case_id: str, dto) -> dict:
        """Record the answers, evaluate urgency, move on to the recommendation."""
        caller = resolve_caller_profile(self.repo, user_id)
        case = get_actionable_case(self.repo, caller, case_id)
        # Validates the assisted session (open, owned by this penyuluh) and
        # tells us who is actually filling the form.
        _, filler = resolve_actor_context(
            self.repo, caller, getattr(dto, "assistedSessionId", None)
        )

        selected = self._select_for_case(case)
        selected_by_id = {row["id"]: row for row in selected}
        submitted = [item for item in (dto.answers or []) if item.questionId]
        if not submitted:
            raise SiagaValidationError(ANSWERS_EMPTY_MESSAGE)

        for item in submitted:
            if item.questionId not in selected_by_id:
                raise SiagaValidationError(UNKNOWN_QUESTION_MESSAGE)
            answer = validate_answer(item.answer)
            self.repo.upsert_answer(
                {
                    "id": new_id(),
                    "case_id": case_id,
                    "question_id": item.questionId,
                    "answer": answer,
                    "answered_by_profile_id": filler["id"],
                    "created_at": now_iso(),
                    "updated_at": now_iso(),
                }
            )

        stored = self.repo.list_answers(case_id)
        case = self._apply_urgency(case, stored, selected_by_id)

        case = advance_case(
            self.repo,
            case,
            STATUS_GENERATING_RECOMMENDATION,
            filler["id"],
            ANSWERED_EVENT_NOTE,
        )

        answers_by_question = {row["question_id"]: row["answer"] for row in stored}
        return self._question_set_out(case, selected, answers_by_question)

    def _apply_urgency(
        self, case: dict, answers: list[dict], questions_by_id: dict
    ) -> dict:
        """Set `urgency_flag` from the answer combination — label untouched."""
        urgent = is_urgent(answers, questions_by_id)
        logger.info(
            f"questionnaire urgency: case={case['id']} "
            f"score={urgency_score(answers, questions_by_id)} urgent={urgent}"
        )
        if bool(case.get("urgency_flag")) == urgent:
            return case
        updated = self.repo.update_case(
            case["id"], {"urgency_flag": urgent, "updated_at": now_iso()}
        )
        return {**case, **updated, "urgency_flag": urgent}


def is_questionnaire_stage(status: str) -> bool:
    """Whether the case is at (or past) the point where questions are asked."""
    return status in (STATUS_NEEDS_CONTEXT, STATUS_GENERATING_RECOMMENDATION)
