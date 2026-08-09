"""Shared fixtures for the Siaga Padi backend tests.

IMPORTANT: never import `api.py` here — it parses CLI args at import time.
A minimal FastAPI app is assembled from the new routers instead, and the
service repo seams are replaced with in-memory fakes (no Supabase access).
Real JWTs are signed with the project's own `auth/` helpers (.env secrets).
"""
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_ROOT))
os.chdir(BACKEND_ROOT)

from config.base import Setting  # noqa: E402

Setting(file=".env")

import pytest  # noqa: E402
from fastapi import FastAPI  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from auth.auth_handler import sign_jwt  # noqa: E402
from util.helper import encrypt  # noqa: E402

PETANI_USER_ID = "user-petani-1"
OTHER_PETANI_USER_ID = "user-petani-2"
PENYULUH_USER_ID = "user-penyuluh-1"
OTHER_PENYULUH_USER_ID = "user-penyuluh-2"
ADMIN_USER_ID = "user-admin-1"
PETANI_EMAIL = "ani.petani@example.com"
PENYULUH_EMAIL = "dewi.penyuluh@example.com"
CORRECT_PASSWORD = "correct-horse-battery"
WRONG_PASSWORD = "wrong-password"
PENYULUH_AREAS = ["Ciparay", "Baleendah"]

# Sprint 02 fixture ids (cases & farmer profile)
REVIEWER_USER_ID = "user-reviewer-1"

PETANI_PROFILE_ID = "profile-petani-1"
REVIEWER_PROFILE_ID = "profile-reviewer-1"
OTHER_PETANI_PROFILE_ID = "profile-petani-2"
PENYULUH_PROFILE_ID = "profile-penyuluh-1"
OTHER_PENYULUH_PROFILE_ID = "profile-penyuluh-2"
ADMIN_PROFILE_ID = "profile-admin-1"
SUBJECT_PROFILE_ID = "profile-didampingi-1"
OPEN_SESSION_ID = "session-open-1"
FOREIGN_SESSION_ID = "session-open-foreign"
ENDED_SESSION_ID = "session-ended-1"
ANI_FIELD_ID = "field-ani-1"
ANI_FIELD_NO_AREA_ID = "field-ani-noarea"
BUDI_FIELD_ID = "field-budi-1"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def make_user(user_id: str, email: str, password_hash: str) -> dict:
    return {
        "id": user_id,
        "email": email,
        "username": email.split("@")[0],
        "fullname": "Synthetic User",
        "password": password_hash,
        "status": "active",
        "multiLogin": True,
    }


def make_profile(
    profile_id: str,
    user_id: str | None,
    role: str,
    display_name: str = "Synthetic User",
    kecamatan: str | None = "Ciparay",
    kabupaten: str | None = "Kab. Bandung",
    account_status: str = "mandiri",
) -> dict:
    return {
        "id": profile_id,
        "user_id": user_id,
        "display_name": display_name,
        "role": role,
        "area_kabupaten": kabupaten,
        "area_kecamatan": kecamatan,
        "account_status": account_status,
        "research_consent": False,
        "location_consent": False,
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
    }


def bearer_headers(user_id: str) -> dict:
    auth = sign_jwt(user_id, None, None, True)
    return {"Authorization": f"Bearer {auth['token']}"}


class FakeAuthRepo:
    """In-memory implementation of SiagaAuthRepositoryProtocol."""

    def __init__(self, users=(), profiles=(), assignments=None) -> None:
        self.users_by_email = {u["email"]: dict(u) for u in users}
        self.profiles_by_user_id = {
            p["user_id"]: dict(p) for p in profiles if p.get("user_id")
        }
        self.assignments = dict(assignments or {})
        self.lockouts: dict[str, dict] = {}

    def find_user_by_email(self, email: str):
        return self.users_by_email.get(email)

    def get_profile_by_user_id(self, user_id: str):
        return self.profiles_by_user_id.get(user_id)

    def get_assignment_areas(self, user_id: str) -> list[str]:
        return list(self.assignments.get(user_id, []))

    def get_lockout(self, email: str):
        return self.lockouts.get(email)

    def upsert_lockout(self, row: dict) -> None:
        self.lockouts[row["email"]] = dict(row)

    def clear_lockout(self, email: str) -> None:
        self.lockouts.pop(email, None)


class FakeAssistedRepo:
    """In-memory implementation of AssistedRepositoryProtocol."""

    def __init__(self, assignments=None, profiles=()) -> None:
        self.assignments = dict(assignments or {})
        self.profiles = {p["id"]: dict(p) for p in profiles}
        self.sessions: dict[str, dict] = {}

    def get_assignment_areas(self, user_id: str) -> list[str]:
        return list(self.assignments.get(user_id, []))

    def search_profiles(self, query: str, areas: list[str]) -> list[dict]:
        needle = query.lower()
        return [
            dict(p)
            for p in self.profiles.values()
            if p["role"] == "petani"
            and p.get("area_kecamatan") in areas
            and needle in p["display_name"].lower()
        ]

    def get_profile_by_id(self, profile_id: str):
        return self.profiles.get(profile_id)

    def insert_profile(self, row: dict) -> dict:
        self.profiles[row["id"]] = dict(row)
        return row

    def insert_session(self, row: dict) -> dict:
        self.sessions[row["id"]] = dict(row)
        return row

    def get_session(self, session_id: str):
        return self.sessions.get(session_id)

    def end_session(self, session_id: str, fields: dict) -> None:
        self.sessions[session_id] = {**self.sessions[session_id], **fields}


class FakeCaseRepo:
    """In-memory implementation of the case + farmer-profile repo seams."""

    def __init__(
        self, profiles=(), assignments=None, sessions=(), fields=()
    ) -> None:
        self.profiles = {p["id"]: dict(p) for p in profiles}
        self.assignments = dict(assignments or {})
        self.sessions = {s["id"]: dict(s) for s in sessions}
        self.fields = {f["id"]: dict(f) for f in fields}
        self.cases: dict[str, dict] = {}
        self.events: list[dict] = []
        self.deletion_requests: list[dict] = []
        self._code_counter = 0

    # ---- shared lookups ---------------------------------------------------

    def get_profile_by_user_id(self, user_id: str):
        return next(
            (
                dict(p)
                for p in self.profiles.values()
                if p.get("user_id") == user_id
            ),
            None,
        )

    def get_profile_by_id(self, profile_id: str):
        profile = self.profiles.get(profile_id)
        return dict(profile) if profile else None

    def get_profiles_by_ids(self, profile_ids):
        return {
            pid: dict(self.profiles[pid])
            for pid in profile_ids
            if pid in self.profiles
        }

    def get_session(self, session_id: str):
        session = self.sessions.get(session_id)
        return dict(session) if session else None

    def get_assignment_areas(self, user_id: str) -> list[str]:
        return list(self.assignments.get(user_id, []))

    def get_field_by_id(self, field_id: str):
        field = self.fields.get(field_id)
        return dict(field) if field else None

    def get_fields_by_ids(self, field_ids):
        return {
            fid: dict(self.fields[fid]) for fid in field_ids if fid in self.fields
        }

    def insert_field(self, row: dict) -> dict:
        self.fields[row["id"]] = dict(row)
        return row

    # ---- cases ----------------------------------------------------------------

    def next_case_code(self) -> str:
        self._code_counter += 1
        return f"KS-{datetime.now(timezone.utc).year}-{self._code_counter:06d}"

    def get_case_by_idempotency_key(self, key: str):
        return next(
            (
                dict(c)
                for c in self.cases.values()
                if c["idempotency_key"] == key
            ),
            None,
        )

    def get_case_by_id(self, case_id: str):
        case = self.cases.get(case_id)
        return dict(case) if case else None

    def insert_case(self, row: dict) -> dict:
        if self.get_case_by_idempotency_key(row["idempotency_key"]) is not None:
            raise Exception("unique violation: cases.idempotency_key")
        self.cases[row["id"]] = dict(row)
        return row

    def insert_event(self, row: dict) -> dict:
        self.events.append(dict(row))
        return row

    def list_events(self, case_id: str) -> list[dict]:
        rows = [dict(e) for e in self.events if e["case_id"] == case_id]
        return sorted(rows, key=lambda e: e["created_at"])

    def find_cases(
        self, filters, page, limit, owner_profile_id=None, areas=None
    ):
        rows = [dict(c) for c in self.cases.values()]
        if owner_profile_id is not None:
            rows = [r for r in rows if r["owner_profile_id"] == owner_profile_id]
        elif areas is not None:
            rows = [r for r in rows if self._case_in_areas(r, areas)]
        rows = [r for r in rows if self._case_matches(r, filters)]
        rows.sort(key=lambda r: r["created_at"], reverse=True)
        start = (page - 1) * limit
        return rows[start : start + limit], len(rows)

    def _case_in_areas(self, row: dict, areas: list[str]) -> bool:
        if not areas:
            return False
        if row.get("area_kecamatan") in areas:
            return True
        field = self.fields.get(row.get("field_id") or "")
        return bool(field) and field.get("area_kecamatan") in areas

    @staticmethod
    def _case_matches(row: dict, filters: dict) -> bool:
        if filters.get("field_id") and row.get("field_id") != filters["field_id"]:
            return False
        statuses = filters.get("statuses")
        if statuses is not None and row["status"] not in statuses:
            return False
        if filters.get("date_from") and row["created_at"] < filters["date_from"]:
            return False
        if filters.get("date_to") and row["created_at"] > filters["date_to"]:
            return False
        return True

    # ---- farmer profile ---------------------------------------------------------

    def update_profile(self, profile_id: str, fields: dict) -> dict:
        self.profiles[profile_id] = {**self.profiles[profile_id], **fields}
        return dict(self.profiles[profile_id])

    def update_field(self, field_id: str, fields: dict) -> dict:
        self.fields[field_id] = {**self.fields[field_id], **fields}
        return dict(self.fields[field_id])

    def find_fields(self, owner_profile_id: str, page: int, limit: int):
        rows = [
            dict(f)
            for f in self.fields.values()
            if f["owner_profile_id"] == owner_profile_id
        ]
        rows.sort(key=lambda r: r.get("created_at") or "", reverse=True)
        start = (page - 1) * limit
        return rows[start : start + limit], len(rows)

    def get_field_case_stats(self, owner_profile_id, field_ids):
        rows = sorted(
            (
                c
                for c in self.cases.values()
                if c["owner_profile_id"] == owner_profile_id
                and c.get("field_id") in field_ids
            ),
            key=lambda c: c["created_at"],
        )
        stats: dict[str, dict] = {}
        for row in rows:
            current = stats.get(
                row["field_id"], {"case_count": 0, "last_growth_stage": None}
            )
            stats[row["field_id"]] = {
                "case_count": current["case_count"] + 1,
                "last_growth_stage": row.get("growth_stage"),
            }
        return stats

    # ---- deletion requests ----------------------------------------------------

    def insert_deletion_request(self, row: dict) -> dict:
        self.deletion_requests.append(dict(row))
        return row

    def get_latest_deletion_request(self, profile_id: str):
        rows = sorted(
            (r for r in self.deletion_requests if r["profile_id"] == profile_id),
            key=lambda r: r["requested_at"],
        )
        return dict(rows[-1]) if rows else None


class FakePhotoRepo(FakeCaseRepo):
    """In-memory implementation of the photo repo seam (Sprint 03) —
    extends the case fake with photo rows and a dict-backed object store."""

    def __init__(self, **kwargs) -> None:
        super().__init__(**kwargs)
        self.photos: dict[str, dict] = {}
        self.storage: dict[str, bytes] = {}

    def update_case(self, case_id: str, fields: dict) -> dict:
        self.cases[case_id] = {**self.cases[case_id], **fields}
        return dict(self.cases[case_id])

    def list_photos(self, case_id: str) -> list[dict]:
        rows = [dict(p) for p in self.photos.values() if p["case_id"] == case_id]
        return sorted(rows, key=lambda r: r["created_at"])

    def get_photo_by_fingerprint(self, case_id: str, fingerprint: str):
        return next(
            (
                dict(p)
                for p in self.photos.values()
                if p["case_id"] == case_id and p["fingerprint"] == fingerprint
            ),
            None,
        )

    def insert_photo(self, row: dict) -> dict:
        if self.get_photo_by_fingerprint(row["case_id"], row["fingerprint"]):
            raise Exception("unique violation: case_photos(case_id, fingerprint)")
        self.photos[row["id"]] = dict(row)
        return row

    def upload_object(self, path: str, data: bytes, content_type: str) -> None:
        self.storage[path] = data

    def create_signed_url(self, path: str, expires_in: int) -> str:
        return f"https://fake.signed/{path}?exp={expires_in}"


def seed_case(
    repo: FakeCaseRepo,
    case_id: str,
    owner_profile_id: str,
    created_by_profile_id: str | None = None,
    status: str = "DRAFT",
    field_id: str | None = None,
    area_kecamatan: str | None = None,
    growth_stage: str = "VEGETATIVE",
    created_at: str | None = None,
) -> dict:
    """Insert a case row directly (bypasses service validation on purpose)."""
    now = created_at or _now_iso()
    row = {
        "id": case_id,
        "case_code": repo.next_case_code(),
        "owner_profile_id": owner_profile_id,
        "created_by_profile_id": created_by_profile_id or owner_profile_id,
        "assisted_session_id": None,
        "field_id": field_id,
        "growth_stage": growth_stage,
        "location_mode": "AREA_ONLY" if area_kecamatan else "NONE",
        "coords": None,
        "area_kabupaten": "Kab. Bandung" if area_kecamatan else None,
        "area_kecamatan": area_kecamatan,
        "status": status,
        "notes": None,
        "observed_at": now,
        "idempotency_key": f"seed-{case_id}",
        "config_version_id": None,
        "created_at": now,
        "updated_at": now,
    }
    repo.cases[case_id] = dict(row)
    return row


def make_field(
    field_id: str,
    owner_profile_id: str,
    name: str,
    kecamatan: str | None = None,
    kabupaten: str | None = None,
) -> dict:
    return {
        "id": field_id,
        "owner_profile_id": owner_profile_id,
        "name": name,
        "area_kabupaten": kabupaten,
        "area_kecamatan": kecamatan,
        "coords": None,
        "created_at": _now_iso(),
        "updated_at": _now_iso(),
    }


@pytest.fixture(scope="session")
def password_hash() -> str:
    return encrypt(CORRECT_PASSWORD)


@pytest.fixture()
def app() -> FastAPI:
    from router import assisted as assisted_router
    from router import cases as cases_router
    from router import farmer_profile as farmer_profile_router
    from router import kb_governance as kb_governance_router
    from router import kb_retrieval as kb_retrieval_router
    from router import photos as photos_router
    from router import siaga_auth as siaga_auth_router
    from util.siaga_response import register_siaga_exception_handlers

    test_app = FastAPI()
    test_app.include_router(siaga_auth_router.router)
    test_app.include_router(assisted_router.router)
    test_app.include_router(cases_router.router)
    test_app.include_router(farmer_profile_router.router)
    test_app.include_router(photos_router.router)
    test_app.include_router(kb_governance_router.router)
    test_app.include_router(kb_retrieval_router.router)
    # Same handler api.py registers — guard rejections render the top-level envelope.
    register_siaga_exception_handlers(test_app)
    return test_app


@pytest.fixture()
def client(app) -> TestClient:
    return TestClient(app)


@pytest.fixture()
def auth_repo(monkeypatch, password_hash) -> FakeAuthRepo:
    """Wire the siaga_auth router to a fake repo with two known accounts."""
    from router import siaga_auth as siaga_auth_router
    from service.siaga_auth import SiagaAuthService

    repo = FakeAuthRepo(
        users=[
            make_user(PETANI_USER_ID, PETANI_EMAIL, password_hash),
            make_user(PENYULUH_USER_ID, PENYULUH_EMAIL, password_hash),
        ],
        profiles=[
            make_profile("profile-petani-1", PETANI_USER_ID, "petani", "Ani Petani"),
            make_profile(
                "profile-penyuluh-1", PENYULUH_USER_ID, "penyuluh", "Dewi Penyuluh"
            ),
        ],
        assignments={PENYULUH_USER_ID: PENYULUH_AREAS},
    )
    monkeypatch.setattr(siaga_auth_router, "obj", SiagaAuthService(repo=repo))
    return repo


@pytest.fixture()
def assisted_repo(monkeypatch) -> FakeAssistedRepo:
    """Wire the assisted router + role guard to fakes (penyuluh & petani known)."""
    from middleware import role_guard
    from router import assisted as assisted_router
    from service.assisted import AssistedService

    repo = FakeAssistedRepo(
        assignments={
            PENYULUH_USER_ID: PENYULUH_AREAS,
            OTHER_PENYULUH_USER_ID: ["Soreang"],
        },
        profiles=[
            make_profile(
                "profile-ani", None, "petani", "Ani Petani", kecamatan="Ciparay"
            ),
            make_profile(
                "profile-budi", None, "petani", "Budi Tani", kecamatan="Baleendah"
            ),
            make_profile(
                "profile-cici", None, "petani", "Cici Tani", kecamatan="Soreang"
            ),
        ],
    )
    guard_profiles = {
        PENYULUH_USER_ID: make_profile(
            "profile-penyuluh-1", PENYULUH_USER_ID, "penyuluh", "Dewi Penyuluh"
        ),
        OTHER_PENYULUH_USER_ID: make_profile(
            "profile-penyuluh-2", OTHER_PENYULUH_USER_ID, "penyuluh", "Eko Penyuluh"
        ),
        PETANI_USER_ID: make_profile(
            "profile-petani-1", PETANI_USER_ID, "petani", "Ani Petani"
        ),
    }
    monkeypatch.setattr(role_guard, "_load_profile", guard_profiles.get)
    monkeypatch.setattr(assisted_router, "obj", AssistedService(repo=repo))
    return repo


@pytest.fixture()
def case_repo(monkeypatch) -> FakeCaseRepo:
    """Wire cases + farmer_profile routers to ONE shared in-memory fake.

    Known world: two independent petani (Ani in Ciparay, Budi in Soreang),
    one penyuluh whose binaan covers Ciparay+Baleendah, one admin, and one
    'didampingi' subject petani reachable through an OPEN assisted session.
    """
    from router import cases as cases_router
    from router import farmer_profile as farmer_profile_router
    from service.cases import CaseService
    from service.farmer_profile import FarmerProfileService

    now = _now_iso()
    repo = FakeCaseRepo(
        profiles=[
            make_profile(
                PETANI_PROFILE_ID, PETANI_USER_ID, "petani", "Ani Petani",
                kecamatan="Ciparay",
            ),
            make_profile(
                OTHER_PETANI_PROFILE_ID, OTHER_PETANI_USER_ID, "petani",
                "Budi Tani", kecamatan="Soreang",
            ),
            make_profile(
                PENYULUH_PROFILE_ID, PENYULUH_USER_ID, "penyuluh",
                "Dewi Penyuluh",
            ),
            make_profile(
                OTHER_PENYULUH_PROFILE_ID, OTHER_PENYULUH_USER_ID, "penyuluh",
                "Eko Penyuluh", kecamatan="Soreang",
            ),
            make_profile(ADMIN_PROFILE_ID, ADMIN_USER_ID, "admin", "Sari Admin"),
            make_profile(
                SUBJECT_PROFILE_ID, None, "petani", "Titi Didampingi",
                kecamatan="Ciparay", account_status="didampingi",
            ),
        ],
        assignments={
            PENYULUH_USER_ID: PENYULUH_AREAS,
            OTHER_PENYULUH_USER_ID: ["Soreang"],
        },
        sessions=[
            {
                "id": OPEN_SESSION_ID,
                "actor_user_id": PENYULUH_USER_ID,
                "subject_profile_id": SUBJECT_PROFILE_ID,
                "consent_method": "lisan",
                "started_at": now,
                "ended_at": None,
            },
            {
                "id": FOREIGN_SESSION_ID,
                "actor_user_id": OTHER_PENYULUH_USER_ID,
                "subject_profile_id": SUBJECT_PROFILE_ID,
                "consent_method": "lisan",
                "started_at": now,
                "ended_at": None,
            },
            {
                "id": ENDED_SESSION_ID,
                "actor_user_id": PENYULUH_USER_ID,
                "subject_profile_id": SUBJECT_PROFILE_ID,
                "consent_method": "lisan",
                "started_at": now,
                "ended_at": now,
            },
        ],
        fields=[
            make_field(
                ANI_FIELD_ID, PETANI_PROFILE_ID, "Sawah Utara",
                kecamatan="Ciparay", kabupaten="Kab. Bandung",
            ),
            make_field(ANI_FIELD_NO_AREA_ID, PETANI_PROFILE_ID, "Sawah Tanpa Area"),
            make_field(
                BUDI_FIELD_ID, OTHER_PETANI_PROFILE_ID, "Sawah Selatan",
                kecamatan="Soreang", kabupaten="Kab. Bandung",
            ),
        ],
    )
    monkeypatch.setattr(cases_router, "obj", CaseService(repo=repo))
    monkeypatch.setattr(
        farmer_profile_router, "obj", FarmerProfileService(repo=repo)
    )
    return repo


class FakeKbRepo:
    """In-memory implementation of `KbRepositoryProtocol` (Sprint 04).

    Mirrors the two guarantees migration 0012 enforces in SQL, so a service bug
    fails here as loudly as it would against Postgres:
    - `insert_chunks` rejects a duplicate (ref_code, version) and a second
      current row for one ref_code (unique index `ux_kb_chunks_ref_current`).
    - `update_chunk` refuses to rewrite content/ref_code/version (trigger
      `trg_kb_chunks_no_rewrite`).
    - `list_active_chunks` reproduces the `kb_active_chunks` view exactly.
    """

    def __init__(self, profiles=()) -> None:
        self.profiles = {p["id"]: dict(p) for p in profiles}
        self.sources: dict[str, dict] = {}
        self.chunks: dict[str, dict] = {}
        self.audit: list[dict] = []
        self.retrieval_logs: list[dict] = []

    # ---- profiles ---------------------------------------------------------

    def get_profile_by_user_id(self, user_id: str):
        return next(
            (dict(p) for p in self.profiles.values() if p.get("user_id") == user_id),
            None,
        )

    # ---- sources ----------------------------------------------------------

    def get_source(self, source_id: str):
        source = self.sources.get(source_id)
        return dict(source) if source else None

    def insert_source(self, row: dict) -> dict:
        self.sources[row["id"]] = dict(row)
        return row

    def update_source(self, source_id: str, fields: dict) -> dict:
        self.sources[source_id] = {**self.sources[source_id], **fields}
        return dict(self.sources[source_id])

    def find_sources(self, filters: dict, page: int, limit: int):
        rows = [dict(s) for s in self.sources.values()]
        if filters.get("status"):
            rows = [r for r in rows if r["status"] == filters["status"]]
        if filters.get("publisher"):
            needle = filters["publisher"].lower()
            rows = [r for r in rows if needle in r["publisher"].lower()]
        if filters.get("availability_status"):
            rows = [
                r
                for r in rows
                if r.get("availability_status") == filters["availability_status"]
            ]
        if filters.get("query"):
            needle = filters["query"].lower()
            rows = [r for r in rows if needle in r["title"].lower()]
        rows.sort(key=lambda r: r["created_at"], reverse=True)
        start = (page - 1) * limit
        return rows[start : start + limit], len(rows)

    # ---- chunks -----------------------------------------------------------

    def get_chunk(self, chunk_id: str):
        chunk = self.chunks.get(chunk_id)
        return dict(chunk) if chunk else None

    def get_chunks_by_ref(self, ref_code: str):
        rows = [dict(c) for c in self.chunks.values() if c["ref_code"] == ref_code]
        return sorted(rows, key=lambda r: r.get("version") or 1)

    def find_chunks(self, filters: dict, page: int, limit: int):
        rows = [dict(c) for c in self.chunks.values()]
        rows = [r for r in rows if self._chunk_matches(r, filters)]
        rows.sort(key=lambda r: (r.get("ordinal") or 0, r.get("version") or 1))
        start = (page - 1) * limit
        return rows[start : start + limit], len(rows)

    @staticmethod
    def _chunk_matches(row: dict, filters: dict) -> bool:
        simple = (
            ("source_id", "source_id"),
            ("approval_status", "approval_status"),
            ("ref_code", "ref_code"),
            ("audience", "audience"),
        )
        for filter_key, column in simple:
            if filters.get(filter_key) and row.get(column) != filters[filter_key]:
                return False
        if filters.get("disease") and filters["disease"] not in (
            row.get("disease_tags") or []
        ):
            return False
        if filters.get("phase") and filters["phase"] not in (
            row.get("phase_tags") or []
        ):
            return False
        if filters.get("is_current") is not None and bool(
            row.get("is_current", True)
        ) != bool(filters["is_current"]):
            return False
        if filters.get("policy_flagged") is True and not row.get("policy_flag"):
            return False
        if filters.get("policy_flagged") is False and row.get("policy_flag"):
            return False
        return True

    def insert_chunks(self, rows: list[dict]) -> list[dict]:
        for row in rows:
            for existing in self.chunks.values():
                if (
                    existing["ref_code"] == row["ref_code"]
                    and existing.get("version") == row.get("version")
                ):
                    raise Exception(
                        "unique violation: kb_chunks(ref_code, version)"
                    )
                if (
                    existing["ref_code"] == row["ref_code"]
                    and existing.get("is_current")
                    and row.get("is_current")
                ):
                    raise Exception("unique violation: ux_kb_chunks_ref_current")
            self.chunks[row["id"]] = dict(row)
        return rows

    def update_chunk(self, chunk_id: str, fields: dict) -> dict:
        current = self.chunks[chunk_id]
        for immutable in ("content", "ref_code", "version"):
            if immutable in fields and fields[immutable] != current[immutable]:
                raise Exception("kb_chunks content is versioned")
        self.chunks[chunk_id] = {**current, **fields}
        return dict(self.chunks[chunk_id])

    def count_chunks_by_source(self, source_ids: list[str]) -> dict:
        from service.kb_support import tally_chunk_counts

        return tally_chunk_counts(
            [c for c in self.chunks.values() if c["source_id"] in set(source_ids)]
        )

    def max_ref_sequence(self, token: str) -> int:
        from service.kb_support import parse_ref_sequence

        sequences = [
            parse_ref_sequence(c["ref_code"])
            for c in self.chunks.values()
            if c["ref_code"].startswith(f"RUJ-{token}-")
        ]
        return max(sequences) if sequences else 0

    def list_active_chunks(self) -> list[dict]:
        """Same predicate as the `kb_active_chunks` view (migration 0012)."""
        now = _now_iso()
        rows = []
        for chunk in self.chunks.values():
            source = self.sources.get(chunk["source_id"]) or {}
            is_active = (
                chunk["approval_status"] == "disetujui"
                and chunk.get("is_current", True)
                and (not chunk.get("valid_until") or chunk["valid_until"] > now)
                and source.get("status") != "dipensiunkan"
                and not source.get("retired_at")
            )
            if is_active:
                rows.append(dict(chunk))
        return sorted(rows, key=lambda r: r["ref_code"])

    # ---- audit & logs -----------------------------------------------------

    def insert_audit(self, row: dict) -> dict:
        self.audit.append(dict(row))
        return row

    def insert_retrieval_log(self, row: dict) -> dict:
        self.retrieval_logs.append(dict(row))
        return row


@pytest.fixture()
def kb_repo(monkeypatch) -> FakeKbRepo:
    """Wire both KB routers to ONE in-memory fake.

    Known world: admin Sari (curates), domain reviewer Rudi (decides), and
    petani Ani — who must never reach a curation endpoint.
    """
    from middleware import role_guard
    from router import kb_governance as kb_governance_router
    from router import kb_retrieval as kb_retrieval_router
    from service.kb_governance import KbGovernanceService
    from service.kb_retrieval import KbRetrievalService

    repo = FakeKbRepo(
        profiles=[
            make_profile(ADMIN_PROFILE_ID, ADMIN_USER_ID, "admin", "Sari Admin"),
            make_profile(
                REVIEWER_PROFILE_ID, REVIEWER_USER_ID, "domain_reviewer",
                "Rudi Reviewer",
            ),
            make_profile(
                PETANI_PROFILE_ID, PETANI_USER_ID, "petani", "Ani Petani"
            ),
        ]
    )
    guard_profiles = {
        profile["user_id"]: dict(profile) for profile in repo.profiles.values()
    }
    monkeypatch.setattr(role_guard, "_load_profile", guard_profiles.get)
    monkeypatch.setattr(
        kb_governance_router, "obj", KbGovernanceService(repo=repo)
    )
    monkeypatch.setattr(kb_retrieval_router, "obj", KbRetrievalService(repo=repo))
    return repo


def seed_kb_source(
    repo: FakeKbRepo,
    source_id: str = "src-bbpadi",
    title: str = "Pengendalian Penyakit Blas",
    publisher: str = "BB Padi",
    status: str = "draf",
    retired_at: str | None = None,
) -> dict:
    """Insert a source row directly (bypasses service validation on purpose)."""
    now = _now_iso()
    row = {
        "id": source_id,
        "title": title,
        "publisher": publisher,
        "published_date": "2024",
        "edition_version": "v2",
        "license_note": "Dokumen publik pemerintah",
        "category": "panduan",
        "source_url": None,
        "status": status,
        "availability_status": "tersedia",
        "registered_by_profile_id": ADMIN_PROFILE_ID,
        "retired_at": retired_at,
        "created_at": now,
        "updated_at": now,
    }
    repo.sources[source_id] = dict(row)
    return row


def seed_kb_chunk(
    repo: FakeKbRepo,
    chunk_id: str,
    ref_code: str,
    source_id: str = "src-bbpadi",
    content: str = "Gunakan varietas tahan blas pada fase anakan.",
    approval_status: str = "menunggu",
    disease_tags: list | None = None,
    phase_tags: list | None = None,
    audience: str = "penyuluh",
    policy_flag: str | None = None,
    version: int = 1,
    is_current: bool = True,
    valid_until: str | None = None,
    action_type: str | None = None,
) -> dict:
    """Insert a chunk row directly, with explicit tags (no auto-detection)."""
    now = _now_iso()
    row = {
        "id": chunk_id,
        "ref_code": ref_code,
        "source_id": source_id,
        "source_version": "v2",
        "location": "Hal. 12",
        "content": content,
        "disease_tags": list(disease_tags or []),
        "phase_tags": list(phase_tags or []),
        "action_type": action_type,
        "audience": audience,
        "risk": "dibatasi" if policy_flag else "aman",
        "policy_flag": policy_flag,
        "approval_status": approval_status,
        "reject_reason": None,
        "version": version,
        "is_current": is_current,
        "valid_until": valid_until,
        "ordinal": len(repo.chunks),
        "created_at": now,
        "updated_at": now,
    }
    repo.chunks[chunk_id] = dict(row)
    return row


@pytest.fixture()
def photo_repo(monkeypatch) -> FakePhotoRepo:
    """Wire the photos router to an in-memory fake sharing the Sprint 02
    world (Ani petani + penyuluh Dewi + admin + assisted subject)."""
    from router import photos as photos_router
    from service.photos import PhotoService

    repo = FakePhotoRepo(
        profiles=[
            make_profile(
                PETANI_PROFILE_ID, PETANI_USER_ID, "petani", "Ani Petani",
                kecamatan="Ciparay",
            ),
            make_profile(
                OTHER_PETANI_PROFILE_ID, OTHER_PETANI_USER_ID, "petani",
                "Budi Tani", kecamatan="Soreang",
            ),
            make_profile(
                PENYULUH_PROFILE_ID, PENYULUH_USER_ID, "penyuluh",
                "Dewi Penyuluh",
            ),
            make_profile(ADMIN_PROFILE_ID, ADMIN_USER_ID, "admin", "Sari Admin"),
        ],
        assignments={PENYULUH_USER_ID: PENYULUH_AREAS},
    )
    monkeypatch.setattr(photos_router, "obj", PhotoService(repo=repo))
    return repo
