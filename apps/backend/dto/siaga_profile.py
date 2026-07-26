"""FE-facing camelCase DTOs for Siaga Padi profiles and assisted sessions.

Field names follow the pinned FE↔BE contract in `apps/web/docs/api-spec.md`
(`SiagaProfile`). DB rows are snake_case — use the builders below to convert.
"""
from typing import Optional

from pydantic import BaseModel


class SiagaProfile(BaseModel):
    """Contract type `SiagaProfile` — camelCase, FE-facing."""

    profileId: str
    userId: Optional[str] = None
    displayName: str
    role: str
    areaKabupaten: Optional[str] = None
    areaKecamatan: Optional[str] = None
    accountStatus: str
    researchConsent: bool = False
    locationConsent: bool = False
    assignmentAreas: Optional[list[str]] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


# Task-spec alias — same shape, both names are part of the sprint contract.
ProfileOut = SiagaProfile


class AssistedSessionOut(BaseModel):
    """Assisted-session payload returned by `POST /assisted/start`."""

    sessionId: str
    subjectProfileId: str
    subjectDisplayName: Optional[str] = None
    actorUserId: str
    consentMethod: str
    startedAt: str
    endedAt: Optional[str] = None


def profile_from_row(
    row: dict, assignment_areas: Optional[list[str]] = None
) -> SiagaProfile:
    """Build the camelCase contract DTO from a snake_case `siaga_profiles` row."""
    return SiagaProfile(
        profileId=row["id"],
        userId=row.get("user_id"),
        displayName=row["display_name"],
        role=row["role"],
        areaKabupaten=row.get("area_kabupaten"),
        areaKecamatan=row.get("area_kecamatan"),
        accountStatus=row["account_status"],
        researchConsent=bool(row.get("research_consent") or False),
        locationConsent=bool(row.get("location_consent") or False),
        assignmentAreas=assignment_areas,
        createdAt=row.get("created_at"),
        updatedAt=row.get("updated_at"),
    )


def assisted_session_from_row(
    row: dict, subject_display_name: Optional[str] = None
) -> AssistedSessionOut:
    """Build the camelCase session DTO from a snake_case `assisted_sessions` row."""
    return AssistedSessionOut(
        sessionId=row["id"],
        subjectProfileId=row["subject_profile_id"],
        subjectDisplayName=subject_display_name,
        actorUserId=row["actor_user_id"],
        consentMethod=row["consent_method"],
        startedAt=row["started_at"],
        endedAt=row.get("ended_at"),
    )
