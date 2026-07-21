from config.base import settings
from supabase import create_client, Client


class SupabaseService:
    """Singleton wrapper around the supabase-py client.

    Hits PostgREST. Use `Services.supabase()` to access from service code.
    Service-role key — server-side only; never expose to a browser.
    """

    instance: Client = None

    def __new__(cls, *args, **kwargs) -> Client:
        if cls.instance is None:
            cls.instance = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        return cls.instance


class NewSupabaseService:
    """Use when a non-shared client is required (different schema, alt URL, RLS context)."""

    def __init__(self, url: str = None, key: str = None):
        self.client: Client = create_client(
            url or settings.SUPABASE_URL,
            key or settings.SUPABASE_KEY,
        )

    def get_client(self) -> Client:
        return self.client
