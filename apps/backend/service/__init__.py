from loguru import logger
from supabase import Client
from config.base import settings as settings_conf
from util.supabase import SupabaseService, NewSupabaseService
from util.redis import (
    RedisService,
    AsyncRedisService,
    NewRedisService,
)


def change_fields(
    datum: dict, replace_fields: dict = {}, add_fields: dict = {}
) -> dict:
    for new_field, old_field in replace_fields.items():
        if old_field in datum:
            datum[new_field] = datum.pop(old_field)

    for new_field, value in add_fields.items():
        if isinstance(value, str) and str(value).startswith("$$"):
            value = datum.get(str(value).removeprefix("$$"), None)
        datum[new_field] = value

    return datum


class BaseSupabaseRepository:
    """Repository base for Supabase-backed services.

    Methods mirror the historical BaseMongoRepository shape so router-level
    code (`service.add(dto)`, `service.find(dto)`, etc.) keeps the same surface.
    """

    def __init__(self):
        self.supabase: Client = Services.supabase()

    def table(self, table_name: str):
        """Returns a PostgREST query builder for `table_name` in the configured schema."""
        return self.supabase.schema(settings_conf.SUPABASE_SCHEMA).table(table_name)

    def get_collection(self, table_name: str):
        """Backwards-compatible alias for `table(table_name)`.

        Old service code calls `self.get_collection(...)`. Keep this name so
        per-module rewrites can swap query bodies without renaming references.
        """
        return self.table(table_name)


class Services:

    @staticmethod
    def supabase() -> Client:
        return SupabaseService()

    @staticmethod
    def new_supabase(url: str = None, key: str = None) -> Client:
        return NewSupabaseService(url=url, key=key).get_client()

    @staticmethod
    def redis():
        return RedisService()

    @staticmethod
    def new_redis(db: int = None):
        return NewRedisService(db=db)

    @staticmethod
    def a_redis():
        return AsyncRedisService()
