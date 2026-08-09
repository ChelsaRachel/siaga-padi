"""Safety checker — the gate every generated recommendation must pass.

FR-007 in four rules, enforced here and nowhere else so there is exactly one
place to audit:

1. **Shape.** The output must carry the five farmer sections and the technical
   view. A malformed answer is rejected, never patched into something plausible.
2. **Citation coverage.** Every actionable line cites at least one reference,
   and every cited code must be one that retrieval actually returned. A model
   inventing `RUJ-BLAS-999` fails here rather than reaching a farmer.
3. **Forbidden content.** No dosage, no brand, no final-diagnosis wording in
   the farmer-facing text.
4. **Narration policy.** A policy-flagged chunk (dosage/brand bearing) stays
   LINKABLE for a penyuluh but must never be narrated to a farmer, so its ref
   code may not appear in the farmer view.

The checker returns the violations it found rather than a bare bool: a blocked
card that cannot be explained is impossible to fix.
"""
from dataclasses import dataclass, field

from loguru import logger

from models.siaga_triage import find_forbidden_terms

# Farmer sections that carry ACTIONABLE advice — each line needs a citation.
ACTIONABLE_SECTIONS = ("lakukan", "pantau", "hindari")
# `indikasi` and `eskalasi` are framing, not instructions: they are scanned for
# forbidden terms but are not required to cite a reference.
NARRATIVE_FIELDS = ("indikasi", "eskalasi")

VIOLATION_MALFORMED = "format_tidak_valid"
VIOLATION_MISSING_CITATION = "saran_tanpa_rujukan"
VIOLATION_UNKNOWN_REF = "rujukan_tidak_dikenal"
VIOLATION_FORBIDDEN_TERM = "istilah_terlarang"
VIOLATION_NOT_NARRATABLE = "rujukan_tidak_boleh_dinarasikan"
VIOLATION_EMPTY_ADVICE = "tanpa_saran"


@dataclass
class SafetyVerdict:
    """Outcome of one safety pass."""

    violations: list[str] = field(default_factory=list)
    details: list[str] = field(default_factory=list)

    @property
    def is_safe(self) -> bool:
        return not self.violations

    def add(self, violation: str, detail: str) -> None:
        if violation not in self.violations:
            self.violations.append(violation)
        self.details.append(detail)


def _suggestion_entries(section: object) -> list[dict]:
    """Only well-formed `{text, refCodes}` entries survive."""
    if not isinstance(section, list):
        return []
    return [entry for entry in section if isinstance(entry, dict) and entry.get("text")]


def check_recommendation(
    payload: dict,
    allowed_ref_codes: set[str],
    narratable_ref_codes: set[str],
) -> SafetyVerdict:
    """Validate one generated recommendation against the four FR-007 rules."""
    verdict = SafetyVerdict()

    farmer = payload.get("farmerView")
    technical = payload.get("technicalView")
    if not isinstance(farmer, dict) or not isinstance(technical, dict):
        verdict.add(VIOLATION_MALFORMED, "farmerView/technicalView missing")
        return verdict

    for name in NARRATIVE_FIELDS:
        value = farmer.get(name)
        if not isinstance(value, str) or not value.strip():
            verdict.add(VIOLATION_MALFORMED, f"farmerView.{name} kosong")

    total_actions = 0
    for name in ACTIONABLE_SECTIONS:
        entries = _suggestion_entries(farmer.get(name))
        total_actions += len(entries)
        for entry in entries:
            _check_suggestion(
                verdict,
                f"farmerView.{name}",
                entry,
                allowed_ref_codes,
                narratable_ref_codes,
                must_be_narratable=True,
            )

    if total_actions == 0:
        # A card with no advice at all is not a safe card, it is an empty one —
        # the insufficient-evidence path exists for that case.
        verdict.add(VIOLATION_EMPTY_ADVICE, "tidak ada saran tindakan")

    for name in NARRATIVE_FIELDS:
        _check_forbidden(verdict, f"farmerView.{name}", farmer.get(name) or "")

    # The technical view may LINK policy-flagged material (a penyuluh is the
    # intended reader) but its citations must still be real.
    for entry in _suggestion_entries(technical.get("kutipan")):
        _check_suggestion(
            verdict,
            "technicalView.kutipan",
            entry,
            allowed_ref_codes,
            narratable_ref_codes,
            must_be_narratable=False,
        )

    if not verdict.is_safe:
        logger.warning(
            f"safety checker blocked output: violations={verdict.violations} "
            f"details={verdict.details}"
        )
    return verdict


def _check_suggestion(
    verdict: SafetyVerdict,
    location: str,
    entry: dict,
    allowed_ref_codes: set[str],
    narratable_ref_codes: set[str],
    must_be_narratable: bool,
) -> None:
    """One suggestion: cited, cited from the real set, and safe to narrate."""
    ref_codes = [code for code in (entry.get("refCodes") or []) if code]
    if not ref_codes:
        verdict.add(VIOLATION_MISSING_CITATION, f"{location}: '{entry['text'][:60]}'")

    for code in ref_codes:
        if code not in allowed_ref_codes:
            verdict.add(VIOLATION_UNKNOWN_REF, f"{location}: {code}")
        elif must_be_narratable and code not in narratable_ref_codes:
            verdict.add(VIOLATION_NOT_NARRATABLE, f"{location}: {code}")

    _check_forbidden(verdict, location, entry.get("text") or "")


def _check_forbidden(verdict: SafetyVerdict, location: str, text: str) -> None:
    found = find_forbidden_terms(text)
    if found:
        verdict.add(VIOLATION_FORBIDDEN_TERM, f"{location}: {','.join(found)}")


def collect_ref_codes(payload: dict) -> list[str]:
    """Every reference cited anywhere in the card, de-duplicated, in order."""
    codes: list[str] = []
    farmer = payload.get("farmerView") or {}
    technical = payload.get("technicalView") or {}
    sections = [farmer.get(name) for name in ACTIONABLE_SECTIONS]
    sections.append(technical.get("kutipan"))
    for section in sections:
        for entry in _suggestion_entries(section):
            for code in entry.get("refCodes") or []:
                if code and code not in codes:
                    codes.append(code)
    return codes
