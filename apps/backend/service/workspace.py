# -*- coding: utf-8 -*-
from datetime import datetime, timezone

from loguru import logger

from config.base import settings
from service import BaseSupabaseRepository
from dto.workspace import WorkspaceIntegrationDTO
from util.helper import get_md5


class Workspace(BaseSupabaseRepository):
    def __init__(self):
        super().__init__()
        self.user_table = settings.SUPABASE_TABLE_USER
        self.integration_table = settings.SUPABASE_TABLE_WORKSPACE_INTEGRATION
        self.user_integration_table = settings.SUPABASE_TABLE_USER_INTEGRATION

    def add_integration(self, dto: WorkspaceIntegrationDTO):
        list_user_ids = set(dto.listUserId or [])

        if dto.listUserEmail:
            resp = (
                self.table(self.user_table)
                .select("id")
                .in_("email", dto.listUserEmail)
                .execute()
            )
            users_by_email = resp.data or []
            if not users_by_email:
                raise Exception("There is no match in the email list")
            list_user_ids.update(item["id"] for item in users_by_email)

        dto.listUserId = list(list_user_ids)

        rows = []
        for user_id in dto.listUserId:
            _id = get_md5(f"{user_id}_{dto.workspaceId}")
            rows.append(
                {
                    "id": _id,
                    "userId": user_id,
                    "workspaceId": dto.workspaceId,
                    "permission": dto.permission,
                    "invitedBy": dto.invitedBy,
                    "invitedAt": datetime.now(timezone.utc).isoformat(),
                }
            )

        for chunk in _chunked(rows, 10):
            self._bulk_integration_upsert(chunk)

        return rows

    def _bulk_integration_upsert(self, rows: list):
        try:
            resp = self.table(self.integration_table).upsert(rows).execute()
            logger.info(f"success integrating {len(resp.data or [])} documents")
        except Exception as e:
            logger.error(
                f"failed integrating {len(rows)} documents. \nerror: {e} \nrows: \n{rows}"
            )


def _chunked(seq: list, size: int):
    for i in range(0, len(seq), size):
        yield seq[i : i + size]
