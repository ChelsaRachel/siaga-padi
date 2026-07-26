"""Row-shape models and domain constants for the Siaga Padi auth schema.

Mirrors `supabase/migrations/0009_siaga_auth.sql` (snake_case columns).
FE-facing camelCase DTOs live in `dto/siaga_profile.py`.
"""
from typing import Optional

from pydantic import BaseModel

ROLE_PETANI = "petani"
ROLE_PENYULUH = "penyuluh"
ROLE_ADMIN = "admin"
ROLE_DOMAIN_REVIEWER = "domain_reviewer"
SIAGA_ROLES = (ROLE_PETANI, ROLE_PENYULUH, ROLE_ADMIN, ROLE_DOMAIN_REVIEWER)

ACCOUNT_STATUS_MANDIRI = "mandiri"
ACCOUNT_STATUS_DIDAMPINGI = "didampingi"
ACCOUNT_STATUS_LOCKED = "locked"
ACCOUNT_STATUS_INACTIVE = "inactive"
ACCOUNT_STATUSES = (
    ACCOUNT_STATUS_MANDIRI,
    ACCOUNT_STATUS_DIDAMPINGI,
    ACCOUNT_STATUS_LOCKED,
    ACCOUNT_STATUS_INACTIVE,
)

CONSENT_METHODS = ("lisan", "tertulis", "in_app")


class SiagaProfileModel(BaseModel):
    """One row of `siaga_profiles`."""

    id: str
    user_id: Optional[str] = None
    display_name: str
    role: str
    area_kabupaten: Optional[str] = None
    area_kecamatan: Optional[str] = None
    account_status: str = ACCOUNT_STATUS_MANDIRI
    research_consent: Optional[bool] = False
    location_consent: Optional[bool] = False
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class PenyuluhAssignmentModel(BaseModel):
    """One row of `penyuluh_assignments`."""

    id: str
    user_id: str
    area_kecamatan: list[str] = []
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class AssistedSessionModel(BaseModel):
    """One row of `assisted_sessions` — the audit stamp itself."""

    id: str
    actor_user_id: str
    subject_profile_id: str
    consent_method: str
    started_at: str
    ended_at: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class LoginLockoutModel(BaseModel):
    """One row of `login_lockouts`, keyed by lowercased submitted email."""

    email: str
    failed_count: int = 0
    window_started_at: Optional[str] = None
    locked_until: Optional[str] = None
    updated_at: Optional[str] = None
