"""Seed synthetic Siaga Padi pilot accounts (Sprint 01 — Auth & Roles).

Creates 1 admin, 1 penyuluh (with binaan assignment areas), 1 domain reviewer
and 2 petani — SYNTHETIC data only, no real farmer information.

Run after the local Supabase stack is up and `0009_siaga_auth.sql` is applied:

    cd apps/backend && ./venv/bin/python scripts/seed_siaga_pilot.py

Idempotent: rows are upserted with deterministic ids derived from the email,
so re-running refreshes the same accounts. Passwords are randomly generated
per run (never hardcoded) and printed ONCE at the end — store them safely.
Exits with a clear error if Supabase is unreachable.
"""
import os
import secrets
import sys
from datetime import datetime, timezone
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_ROOT))
os.chdir(BACKEND_ROOT)

from loguru import logger  # noqa: E402

from config.base import Setting  # noqa: E402

settings = Setting(file=".env")

from service import BaseSupabaseRepository  # noqa: E402
from util.helper import encrypt, get_md5  # noqa: E402

PASSWORD_ENTROPY_BYTES = 9

PILOT_ACCOUNTS: tuple[dict, ...] = (
    {
        "fullname": "Admin Pilot Siaga",
        "email": "admin.pilot@siaga-padi.local",
        "role": "admin",
        "area_kabupaten": None,
        "area_kecamatan": None,
    },
    {
        "fullname": "Dewi Lestari",
        "email": "penyuluh.pilot@siaga-padi.local",
        "role": "penyuluh",
        "area_kabupaten": "Kab. Bandung",
        "area_kecamatan": "Ciparay",
        "assignment_areas": ["Ciparay", "Baleendah"],
    },
    {
        "fullname": "Rizky Pratama",
        "email": "reviewer.pilot@siaga-padi.local",
        "role": "domain_reviewer",
        "area_kabupaten": None,
        "area_kecamatan": None,
    },
    {
        "fullname": "Budi Santoso",
        "email": "petani1.pilot@siaga-padi.local",
        "role": "petani",
        "area_kabupaten": "Kab. Bandung",
        "area_kecamatan": "Ciparay",
    },
    {
        "fullname": "Siti Aminah",
        "email": "petani2.pilot@siaga-padi.local",
        "role": "petani",
        "area_kabupaten": "Kab. Bandung",
        "area_kecamatan": "Baleendah",
    },
)


class SeedRepository(BaseSupabaseRepository):
    """Writes pilot rows via the boilerplate Supabase repo layer."""

    def ensure_reachable(self) -> None:
        try:
            self.table(settings.SUPABASE_TABLE_USER).select("id").limit(1).execute()
        except Exception as error:
            logger.error(
                "Supabase is unreachable at "
                f"{settings.SUPABASE_URL} — start the local stack and apply "
                f"migrations first (0001..0009). Underlying error: {error}"
            )
            raise SystemExit(1)

    def upsert_user(self, row: dict) -> None:
        self.table(settings.SUPABASE_TABLE_USER).upsert(row).execute()

    def upsert_profile(self, row: dict) -> None:
        self.table(settings.SUPABASE_TABLE_SIAGA_PROFILE).upsert(row).execute()

    def upsert_assignment(self, row: dict) -> None:
        self.table(settings.SUPABASE_TABLE_PENYULUH_ASSIGNMENT).upsert(row).execute()


def _build_user_row(
    account: dict, user_id: str, password_hash: str, index: int, now: str
) -> dict:
    return {
        "id": user_id,
        "username": account["email"].split("@")[0],
        "fullname": account["fullname"],
        "email": account["email"],
        "password": password_hash,
        "phone": f"+62800000000{index}",  # synthetic
        "status": "active",
        "multiLogin": True,
        "emailVerified": True,
        "createdAt": now,
        "updatedAt": now,
    }


def _build_profile_row(account: dict, user_id: str, now: str) -> dict:
    return {
        "id": get_md5(f"siaga-profile:{account['email']}"),
        "user_id": user_id,
        "display_name": account["fullname"],
        "role": account["role"],
        "area_kabupaten": account.get("area_kabupaten"),
        "area_kecamatan": account.get("area_kecamatan"),
        "account_status": "mandiri",
        "research_consent": False,
        "location_consent": False,
        "created_at": now,
        "updated_at": now,
    }


def _build_assignment_row(account: dict, user_id: str, now: str) -> dict:
    return {
        "id": get_md5(f"penyuluh-assignment:{account['email']}"),
        "user_id": user_id,
        "area_kecamatan": account["assignment_areas"],
        "created_at": now,
        "updated_at": now,
    }


def seed() -> None:
    repo = SeedRepository()
    repo.ensure_reachable()
    now = datetime.now(timezone.utc).isoformat()
    credentials: list[tuple[str, str, str]] = []
    for index, account in enumerate(PILOT_ACCOUNTS, start=1):
        password = secrets.token_urlsafe(PASSWORD_ENTROPY_BYTES)
        user_id = get_md5(account["email"])
        repo.upsert_user(
            _build_user_row(account, user_id, encrypt(password), index, now)
        )
        repo.upsert_profile(_build_profile_row(account, user_id, now))
        if account.get("assignment_areas"):
            repo.upsert_assignment(_build_assignment_row(account, user_id, now))
        credentials.append((account["email"], account["role"], password))
        logger.info(f"seeded pilot account: role={account['role']}")
    logger.warning(
        "Synthetic pilot credentials (shown once — store them safely):\n"
        + "\n".join(
            f"  {role:<16} {email:<36} {password}"
            for email, role, password in credentials
        )
    )


if __name__ == "__main__":
    seed()
