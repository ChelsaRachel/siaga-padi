"""FE-facing camelCase DTOs for cases, lahan, timeline, deletion requests.

Field names follow the pinned Sprint 02 contract in
`apps/web/docs/api-spec-case.md`. DB rows are snake_case — use the builders
below to convert. `status` carries the canonical FRD value; `displayStage`
carries the petani-facing Indonesian stage (see models/siaga_case.py).
"""
from typing import Optional

from pydantic import BaseModel

from models.siaga_case import display_stage_for


class FieldOut(BaseModel):
    """Contract type `FieldOut` — one lahan card."""

    fieldId: str
    ownerProfileId: str
    name: str
    areaKabupaten: Optional[str] = None
    areaKecamatan: Optional[str] = None
    coords: Optional[dict] = None
    lastGrowthStage: Optional[str] = None
    caseCount: Optional[int] = None
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


class CaseOut(BaseModel):
    """Contract type `CaseOut` — one case."""

    caseId: str
    caseCode: str
    ownerProfileId: str
    ownerDisplayName: Optional[str] = None
    createdByProfileId: str
    createdByDisplayName: Optional[str] = None
    assistedSessionId: Optional[str] = None
    fieldId: Optional[str] = None
    fieldName: Optional[str] = None
    growthStage: str
    locationMode: str
    areaKabupaten: Optional[str] = None
    areaKecamatan: Optional[str] = None
    status: str
    displayStage: str
    notes: Optional[str] = None
    observedAt: str
    createdAt: Optional[str] = None
    updatedAt: Optional[str] = None


class CaseEventOut(BaseModel):
    """Contract type `CaseEventOut` — one linimasa entry."""

    eventId: str
    caseId: str
    fromStatus: Optional[str] = None
    toStatus: str
    toDisplayStage: str
    actorProfileId: Optional[str] = None
    actorDisplayName: Optional[str] = None
    note: Optional[str] = None
    createdAt: Optional[str] = None


class DeletionRequestOut(BaseModel):
    """Contract type `DeletionRequestOut` — recorded, not an instant wipe."""

    requestId: str
    profileId: str
    reason: Optional[str] = None
    status: str
    requestedAt: Optional[str] = None
    processedAt: Optional[str] = None


def field_from_row(
    row: dict,
    last_growth_stage: Optional[str] = None,
    case_count: Optional[int] = None,
) -> FieldOut:
    """Build the camelCase lahan DTO from a snake_case `fields` row."""
    return FieldOut(
        fieldId=row["id"],
        ownerProfileId=row["owner_profile_id"],
        name=row["name"],
        areaKabupaten=row.get("area_kabupaten"),
        areaKecamatan=row.get("area_kecamatan"),
        coords=row.get("coords"),
        lastGrowthStage=last_growth_stage,
        caseCount=case_count,
        createdAt=row.get("created_at"),
        updatedAt=row.get("updated_at"),
    )


def case_from_row(
    row: dict,
    owner_display_name: Optional[str] = None,
    created_by_display_name: Optional[str] = None,
    field_name: Optional[str] = None,
) -> CaseOut:
    """Build the camelCase case DTO from a snake_case `cases` row."""
    return CaseOut(
        caseId=row["id"],
        caseCode=row["case_code"],
        ownerProfileId=row["owner_profile_id"],
        ownerDisplayName=owner_display_name,
        createdByProfileId=row["created_by_profile_id"],
        createdByDisplayName=created_by_display_name,
        assistedSessionId=row.get("assisted_session_id"),
        fieldId=row.get("field_id"),
        fieldName=field_name,
        growthStage=row["growth_stage"],
        locationMode=row["location_mode"],
        areaKabupaten=row.get("area_kabupaten"),
        areaKecamatan=row.get("area_kecamatan"),
        status=row["status"],
        displayStage=display_stage_for(row["status"]),
        notes=row.get("notes"),
        observedAt=row["observed_at"],
        createdAt=row.get("created_at"),
        updatedAt=row.get("updated_at"),
    )


def case_event_from_row(
    row: dict, actor_display_name: Optional[str] = None
) -> CaseEventOut:
    """Build the camelCase timeline DTO from a snake_case `case_events` row."""
    return CaseEventOut(
        eventId=row["id"],
        caseId=row["case_id"],
        fromStatus=row.get("from_status"),
        toStatus=row["to_status"],
        toDisplayStage=display_stage_for(row["to_status"]),
        actorProfileId=row.get("actor_profile_id"),
        actorDisplayName=actor_display_name,
        note=row.get("note"),
        createdAt=row.get("created_at"),
    )


def deletion_request_from_row(row: dict) -> DeletionRequestOut:
    """Build the camelCase DTO from a snake_case `data_deletion_requests` row."""
    return DeletionRequestOut(
        requestId=row["id"],
        profileId=row["profile_id"],
        reason=row.get("reason"),
        status=row["status"],
        requestedAt=row.get("requested_at"),
        processedAt=row.get("processed_at"),
    )
