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
PENYULUH_USER_ID = "user-penyuluh-1"
OTHER_PENYULUH_USER_ID = "user-penyuluh-2"
PETANI_EMAIL = "ani.petani@example.com"
PENYULUH_EMAIL = "dewi.penyuluh@example.com"
CORRECT_PASSWORD = "correct-horse-battery"
WRONG_PASSWORD = "wrong-password"
PENYULUH_AREAS = ["Ciparay", "Baleendah"]


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


@pytest.fixture(scope="session")
def password_hash() -> str:
    return encrypt(CORRECT_PASSWORD)


@pytest.fixture()
def app() -> FastAPI:
    from router import assisted as assisted_router
    from router import siaga_auth as siaga_auth_router
    from util.siaga_response import register_siaga_exception_handlers

    test_app = FastAPI()
    test_app.include_router(siaga_auth_router.router)
    test_app.include_router(assisted_router.router)
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
