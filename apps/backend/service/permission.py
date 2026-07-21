# -*- coding: utf-8 -*-
import json
from datetime import datetime, timezone

from loguru import logger

from config.base import settings
from service import BaseSupabaseRepository
from dto.permission import PermissionDTO, UpdatePermissionDTO
from util.helper import supabase_query_builder, get_md5


class Permission(BaseSupabaseRepository):
    def __init__(self):
        super().__init__()
        self.table_name = settings.SUPABASE_TABLE_PERMISSION

    def _table(self):
        return self.table(self.table_name)

    def add(self, dto: PermissionDTO):
        _id = get_md5(json.dumps(dto.dict()))
        if self.get_by_id(_id):
            logger.info("Permission already exists")
            raise Exception("data permission already exist!")

        data = dto.dict()
        data["id"] = _id
        data["createdAt"] = datetime.now(timezone.utc).isoformat()
        return self._upsert(data)

    def update(self, dto: UpdatePermissionDTO):
        if not self.get_by_id(dto.id):
            return f"There is no data with id: {dto.id}"
        return self._upsert({**dto.dict(), "id": dto.id})

    def update_partial(self, dto: UpdatePermissionDTO):
        existing = self.get_by_id(dto.id)
        if not existing:
            return f"There is no data with id: {dto.id}"

        dto_dump = dto.model_dump(exclude_defaults=True)
        update_privileges = dto_dump.pop("privileges", None)
        existing.update(dto_dump)

        privileges = existing.get("privileges")
        if privileges is not None and update_privileges is not None:
            for item in update_privileges:
                if item.get("id") is None:
                    continue
                idx = next(
                    (i for i, d in enumerate(privileges) if d.get("id") == item["id"]),
                    None,
                )
                if idx is not None:
                    privileges[idx] = item
                else:
                    privileges.append(item)
            existing["privileges"] = privileges

        return self._upsert({**existing, "id": dto.id})

    def get_by_id(self, _id: str):
        resp = self._table().select("*").eq("id", _id).limit(1).execute()
        rows = resp.data or []
        return rows[0] if rows else {}

    def _upsert(self, data: dict) -> dict:
        data.pop("id", None) if "id" not in data else None  # keep id key only when present
        if "id" not in data:
            raise ValueError("upsert requires id")

        data["updatedAt"] = datetime.now(timezone.utc).isoformat()
        self._table().upsert(data).execute()
        logger.success(f"{data['id']} has been upserted.")
        return data

    def delete(self, _id: str):
        self._table().delete().eq("id", _id).execute()
        return f"{_id} has been deleted."

    def get_all(self, dto):
        builder = self._table().select("*", count="exact")
        builder = supabase_query_builder(builder, dto, text_type="name,description")

        order_desc = dto.order.lower() == "desc"
        builder = builder.order(dto.orderBy, desc=order_desc)

        start = (dto.page - 1) * dto.size
        end = start + dto.size - 1
        resp = builder.range(start, end).execute()

        return resp.data or [], (resp.count or 0)
