# -*- coding: utf-8 -*-
import json
from datetime import datetime, timezone

from loguru import logger

from config.base import settings
from service import BaseSupabaseRepository
from dto.group import GroupDTO, UpdateGroupDTO
from util.helper import supabase_query_builder, get_md5


class Group(BaseSupabaseRepository):
    def __init__(self):
        super().__init__()
        self.table_name = settings.SUPABASE_TABLE_GROUP

    def _table(self):
        return self.table(self.table_name)

    def add(self, dto: GroupDTO):
        _id = get_md5(json.dumps(dto.dict()))
        if self.get_by_id(_id):
            logger.info("Group already exists")
            raise Exception("data already exist!")

        data = dto.dict()
        data["id"] = _id
        data["createdAt"] = datetime.now(timezone.utc).isoformat()
        return self._upsert(data)

    def update(self, dto: UpdateGroupDTO):
        if not self.get_by_id(dto.id):
            return f"There is no data with id: {dto.id}"
        return self._upsert({**dto.dict(), "id": dto.id})

    def get_by_id(self, _id: str):
        resp = self._table().select("*").eq("id", _id).limit(1).execute()
        rows = resp.data or []
        return rows[0] if rows else {}

    def _upsert(self, data: dict) -> dict:
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
