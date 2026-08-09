"""KB retrieval — the ranked read over the ACTIVE index.

Two callers, one implementation:
- `runtime`  — Sprint 05's recommendation engine (service-to-service).
- `uji`      — the admin/reviewer retrieval-test panel, run BEFORE a version is
               activated ("Blas Daun fase anakan → rujukan apa yang terambil?").

Guarantees:
- Only `kb_active_chunks` is read, so a draft or rejected chunk can never be
  returned — the exclusion lives in the view (migration 0012), once.
- `policyFlag` travels with every hit and `narratable` is derived from it:
  dosage/brand chunks stay linkable as penyuluh reading but are never narrated
  to petani (brief 06 §10.2).
- Ranking is DETERMINISTIC: equal scores break on ref code, so the same query
  always returns the same order — a retrieval test is reproducible evidence.
- The log stores REF CODES and the coarse facets only (brief 06 §5.3).
"""
from typing import Optional

from loguru import logger

from dto.siaga_kb import KbRetrievalOut, kb_retrieval_hit_from_row
from models.siaga_kb import AUDIENCE_PETANI
from service.kb_support import KbRepositoryProtocol
from service.siaga_case_support import new_id, now_iso

CHANNEL_RUNTIME = "runtime"
CHANNEL_TEST = "uji"

# Scoring weights — disease dominates, phase refines, action type and audience
# nudge. Values are spread so no combination of weaker signals outranks a
# disease match.
SCORE_DISEASE_MATCH = 100
SCORE_PHASE_MATCH = 30
SCORE_ACTION_MATCH = 20
SCORE_AUDIENCE_MATCH = 10
# An untagged (general) chunk stays eligible but always ranks below a specific
# one — "RUJ-UMUM-001" is a fallback, not an answer.
SCORE_GENERAL_CHUNK = 5


def score_chunk(
    row: dict,
    disease: Optional[str],
    phase: Optional[str],
    audience: Optional[str],
    action_type: Optional[str],
) -> Optional[int]:
    """Relevance score, or None when the chunk does not qualify at all.

    A query naming a disease admits chunks tagged with that disease and general
    (untagged) chunks — nothing tagged for a DIFFERENT disease.
    """
    disease_tags = list(row.get("disease_tags") or [])
    score = 0

    if disease:
        if disease in disease_tags:
            score += SCORE_DISEASE_MATCH
        elif disease_tags:
            return None
        else:
            score += SCORE_GENERAL_CHUNK

    phase_tags = list(row.get("phase_tags") or [])
    if phase and phase in phase_tags:
        score += SCORE_PHASE_MATCH

    if action_type:
        if row.get("action_type") != action_type:
            return None
        score += SCORE_ACTION_MATCH

    if audience:
        if row.get("audience") == audience:
            score += SCORE_AUDIENCE_MATCH
        elif audience == AUDIENCE_PETANI:
            # A petani-facing query must never surface penyuluh-only material.
            return None

    return score


class KbRetrievalService:
    """Ranked retrieval over the active index, with the ref-code-only log."""

    def __init__(self, repo: Optional[KbRepositoryProtocol] = None) -> None:
        self._repo = repo

    @property
    def repo(self) -> KbRepositoryProtocol:
        if self._repo is None:
            from service.kb_support import KbRepository

            self._repo = KbRepository()
        return self._repo

    def retrieve(
        self,
        dto,
        channel: str = CHANNEL_RUNTIME,
        actor_profile: Optional[dict] = None,
    ) -> dict:
        """Rank the active index for the query; returns `KbRetrievalOut`."""
        scored: list[tuple[int, dict]] = []
        for row in self.repo.list_active_chunks():
            score = score_chunk(
                row, dto.disease, dto.phase, dto.audience, dto.actionType
            )
            if score is not None:
                scored.append((score, row))
        # Highest score first; ref code ascending as the deterministic tiebreak.
        scored.sort(key=lambda pair: (-pair[0], pair[1]["ref_code"]))
        hits = [
            kb_retrieval_hit_from_row(row, score)
            for score, row in scored[: dto.limit]
        ]
        self._log_retrieval(dto, channel, actor_profile, hits)
        return KbRetrievalOut(
            disease=dto.disease,
            phase=dto.phase,
            audience=dto.audience,
            actionType=dto.actionType,
            hits=hits,
            totalCount=len(scored),
        ).model_dump()

    def _log_retrieval(
        self, dto, channel: str, actor_profile: Optional[dict], hits: list
    ) -> None:
        """Record ref codes + facets. A logging failure never fails retrieval."""
        ref_codes = [hit.refCode for hit in hits]
        try:
            self.repo.insert_retrieval_log(
                {
                    "id": new_id(),
                    "channel": channel,
                    "actor_profile_id": (actor_profile or {}).get("id"),
                    "disease": dto.disease,
                    "phase": dto.phase,
                    "audience": dto.audience,
                    "action_type": dto.actionType,
                    "ref_codes": ref_codes,
                    "result_count": len(ref_codes),
                    "created_at": now_iso(),
                }
            )
        except Exception as error:
            logger.warning(f"kb retrieval log failed: {error}")
        logger.info(
            f"kb retrieval: channel={channel} disease={dto.disease} "
            f"phase={dto.phase} refs={ref_codes}"
        )
