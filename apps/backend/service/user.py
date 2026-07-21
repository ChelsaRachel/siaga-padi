# -*- coding: utf-8 -*-
import json
import bcrypt
import jmespath
import os
import pandas as pd

import concurrent.futures
import pydash as py_
import math
import time

from io import BytesIO
from datetime import datetime, timedelta, timezone
from typing import Literal

from loguru import logger

from config.base import settings
from service import BaseSupabaseRepository
from dto.user import (
    UserDTO,
    UpdateUserDTO,
    ResetPasswordDTO,
    ChangePasswordDTO,
    FindUserDTO,
)
from dto.workspace import WorkspaceDTO, WorkspaceIntegrationDTO
from dto import FindDTO
from util.helper import (
    encrypt,
    censor_email,
    supabase_query_builder,
    get_md5,
)


listPermissionID = [
    "32ef01739d5ce9e755cb3760386fa414",
    "4769c325adee75fd120907b344865d93",
]
ADMIN_AND_OWNER_PERMISSIONS = ["admin", "owner"]


class User(BaseSupabaseRepository):
    def __init__(self):
        super().__init__()
        self.user_table = settings.SUPABASE_TABLE_USER
        self.role_table = settings.SUPABASE_TABLE_ROLE
        self.group_table = settings.SUPABASE_TABLE_GROUP
        self.workspace_table = settings.SUPABASE_TABLE_WORKSPACE
        self.connection_table = settings.SUPABASE_TABLE_CONNECTION
        self.connection_group_table = settings.SUPABASE_TABLE_CONNECTION_GROUP
        self.user_status_table = settings.SUPABASE_TABLE_USER_STATUS
        self.organization_table = settings.SUPABASE_TABLE_ORGANIZATION
        self.user_workspace_table = settings.SUPABASE_TABLE_USER_WORKSPACE
        self.workspace_integration_table = settings.SUPABASE_TABLE_WORKSPACE_INTEGRATION

    # ----- helpers ----------------------------------------------------------

    def _users(self):
        return self.table(self.user_table)

    def _now(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    def _first(self, query):
        resp = query.limit(1).execute()
        rows = resp.data or []
        return rows[0] if rows else None

    # ----- public CRUD ------------------------------------------------------

    def add(self, dto: UserDTO):
        _id = get_md5(f"{dto.email}-{dto.phone}")
        if self.get_by_id(_id):
            logger.info("User already exists")
            raise Exception("User already exist!")

        data = dto.dict()
        data["id"] = _id
        data["createdAt"] = self._now()
        data["workspaceId"] = _id
        logger.debug("Auto-creating personal workspace")
        self.auto_add_workspace(_id)
        return self._upsert_user(data)

    def update(self, dto: UpdateUserDTO):
        existing = self.get_by_id(dto.id)
        if not existing:
            return f"There is no data with id: {dto.id}"

        param_update = UpdateUserDTO(**existing).dict()
        dto_dict = {k: v for k, v in dto.dict().items() if v is not None}
        param_update.update(dto_dict)

        if dto_dict.get("password") is None:
            param_update["password"] = None
        if dto_dict.get("email") is None:
            param_update["email"] = None

        return self._upsert_user(param_update)

    # The historical update_profile() body matched update() exactly.
    update_profile = update

    def get_by_id(self, _id: str):
        data = self._first(self._users().select("*").eq("id", _id))
        if not data:
            return {}

        group_id = data.get("groupId")
        group_ids = [group_id] if group_id else []
        workspaces, groups = self.get_lookup_data(
            [data.get("workspaceId")] if data.get("workspaceId") else [],
            group_ids,
        )

        if data.get("email"):
            data["email"] = censor_email(data["email"])
        data["password"] = "##########"
        data["workspaceDetail"] = workspaces.get(data.get("workspaceId"))
        data["groupDetail"] = groups.get(data.get("groupId", "None"))
        return data

    def get_one(self, id: str):
        data = self._first(self._users().select("*").eq("id", id))
        return data or {}

    def get_one_by_username(self, username: str):
        data = self._first(self._users().select("*").eq("username", username))
        return data or {}

    def get_user_filter(
        self,
        user_id: str = "",
        user_email: str = "",
        username: str = "",
        widget_id: str = "",
    ):
        clauses = []
        if user_id:
            clauses.append(f"id.eq.{user_id}")
        if user_email:
            clauses.append(f"email.eq.{user_email}")
        if username:
            clauses.append(f"username.eq.{username}")

        if not clauses:
            raise Exception(
                "atleast this value must be filled : user_id , user_email , username"
            )

        user = self._first(self._users().select("*").or_(",".join(clauses)))
        if not user:
            raise Exception("User is not exist")

        filters = []
        group_id = user.get("groupId")
        if group_id:
            group = self._first(
                self.table(self.group_table).select("filters").eq("id", group_id)
            )
            if group and group.get("filters"):
                filters = group["filters"]

        return {"filters": filters}

    def check_unique(self, check_field: Literal["email", "username", "phone"], value):
        data = self._first(self._users().select("id").eq(check_field, value))
        return {"status": bool(data)}

    def reset_password(self, dto: ResetPasswordDTO):
        existing = self._first(self._users().select("*").eq("id", dto.id))
        if not existing:
            raise Exception("Account is not found!")
        self._users().update({"password": encrypt(dto.password)}).eq("id", dto.id).execute()
        return existing

    def change_password(self, dto: ChangePasswordDTO):
        account = self._first(self._users().select("*").eq("id", dto.id))
        if not account:
            raise Exception("Account is not found!")
        if not bcrypt.checkpw(
            dto.oldPassword.encode("utf-8"), account["password"].encode("utf-8")
        ):
            raise Exception("Old password is wrong!")
        self._users().update({"password": encrypt(dto.newPassword)}).eq("id", dto.id).execute()
        return f"Password for id {dto.id} has been changed"

    def _upsert_user(self, data: dict) -> dict:
        _id = data["id"]
        existing = self._first(self._users().select("*").eq("id", _id))

        if existing:
            data.pop("password", None)
            if not data.get("email"):
                data["email"] = existing.get("email")
            else:
                clauses = [f"email.eq.{data['email']}", f"username.eq.{data.get('username','')}"]
                if data.get("phone"):
                    clauses.append(f"phone.eq.{data['phone']}")
                conflict = self._first(
                    self._users()
                    .select("id")
                    .or_(",".join(clauses))
                    .neq("id", _id)
                )
                if conflict:
                    raise Exception("Email, Username or Phone already exists!")
        else:
            if data.get("password"):
                data["password"] = encrypt(data["password"])

        data["updatedAt"] = self._now()
        # Strip None-valued keys so we don't overwrite columns with NULL on update.
        clean = {k: v for k, v in data.items() if v is not None}
        self._users().upsert(clean).execute()
        logger.success(f"{_id} has been upserted.")

        if clean.get("email"):
            clean["email"] = censor_email(clean["email"])
        clean["password"] = "##########"
        return clean

    def delete(self, _id: str):
        self._users().delete().eq("id", _id).execute()
        return f"{_id} has been deleted."

    def change_status(self, _id: str, old_password: str, status: str = "deleted"):
        data = self._first(self._users().select("*").eq("id", _id))
        if not data:
            raise Exception(f"User id {_id} is doesn't exists")

        if data.get("status") == "deleted":
            raise Exception("User has been deleted")

        if not bcrypt.checkpw(
            old_password.encode("utf-8"), data["password"].encode("utf-8")
        ):
            raise Exception("Old password is wrong!")

        self._users().update({"status": status}).eq("id", _id).execute()
        return self._first(self._users().select("*").eq("id", _id))

    def get_all(self, dto: FindUserDTO):
        builder = self._users().select("*", count="exact")
        builder = supabase_query_builder(
            builder,
            dto,
            text_type="username,fullname,email",
            additional_ignore="online",
        )
        if dto.online:
            cutoff = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
            builder = builder.gte("userStatus.lastActive", cutoff)

        order_desc = dto.order.lower() == "desc"
        builder = builder.order(dto.orderBy, desc=order_desc)

        start = (dto.page - 1) * dto.size
        end = start + dto.size - 1
        resp = builder.range(start, end).execute()
        return resp.data or [], (resp.count or 0)

    def get_lookup_data(self, all_workspace_id, all_group_id):
        workspaces_resp = (
            self.table(self.workspace_table).select("*").in_("id", all_workspace_id).execute()
            if all_workspace_id
            else None
        )
        workspaces = {w["id"]: w for w in (workspaces_resp.data or [])} if workspaces_resp else {}

        groups_resp = (
            self.table(self.group_table).select("*").in_("id", all_group_id).execute()
            if all_group_id
            else None
        )
        groups = list(groups_resp.data or []) if groups_resp else []

        all_connection_group_ids = list(
            {g.get("connectionGroupId") for g in groups if g.get("connectionGroupId")}
        )

        connection_groups = []
        if all_connection_group_ids:
            connection_groups = (
                self.table(self.connection_group_table)
                .select("*")
                .in_("id", all_connection_group_ids)
                .execute()
                .data
                or []
            )

        all_connection_ids = jmespath.search("[*].connections | []", connection_groups) or []
        connection_groups_map = {c["id"]: c for c in connection_groups}

        connections_map = {}
        if all_connection_ids:
            connections_map = {
                c["id"]: c
                for c in (
                    self.table(self.connection_table)
                    .select("*")
                    .in_("id", all_connection_ids)
                    .execute()
                    .data
                    or []
                )
            }

        for group in groups:
            cg = connection_groups_map.get(group.get("connectionGroupId"))
            if cg:
                resolved = []
                for conn_id in cg.get("connections", []) or []:
                    resolved_conn = connections_map.get(conn_id)
                    if resolved_conn:
                        resolved.append(resolved_conn)
                cg = {**cg, "connections": resolved}
            group["collection"] = cg

        groups_map = {g["id"]: g for g in groups}
        return workspaces, groups_map

    def import_file(self, contents, created_by, dashboardId):
        df = pd.read_excel(BytesIO(contents))
        df = df.fillna("")
        data = df.to_dict(orient="records")

        all_users = self._users().select("email,username,phone").execute().data or []
        df_user = pd.DataFrame.from_records(all_users) if all_users else pd.DataFrame(
            columns=["email", "username", "phone"]
        )

        status: dict = {}
        inserted_user = []
        for datum in data:
            if datum.get("phone"):
                datum["phone"] = str(datum["phone"])
            if datum.get("username"):
                datum["username"] = str(datum["username"])

            additional = datum.get("additional")
            if additional and not isinstance(additional, dict) and isinstance(additional, str):
                try:
                    datum["additional"] = json.loads(additional)
                except Exception:
                    datum["additional"] = additional

            user_dto = UserDTO(**datum)
            user_validation = True

            if datum.get("organizationId") in ["", None] and os.getenv("IS_FUSION_APP") in [
                "",
                None,
                "false",
                "False",
            ]:
                user_validation = "organizationId is required"

            user_dto.createdBy = created_by

            if dashboardId:
                user_dto.dashboardId = dashboardId

            for field in ["email", "username", "phone"]:
                if not df_user.empty and datum.get(field) in df_user[field].values:
                    user_validation = f"{field} already exists"
                    break

            if user_validation is True:
                inserted_user.append(user_dto)
            status[user_dto.username] = user_validation

        if inserted_user:
            chunks = py_.arrays.chunk(
                inserted_user, int(math.ceil(len(inserted_user) / 10))
            )
            for idx, chunk in enumerate(chunks):
                start_time = time.perf_counter()
                with concurrent.futures.ThreadPoolExecutor() as executor:
                    future_map = {}
                    for user in chunk:
                        future = executor.submit(lambda u=user: self.add(u))
                        future_map[future] = user.username

                    for future in concurrent.futures.as_completed(future_map):
                        var_name = future_map[future]
                        try:
                            value = future.result()
                            logger.info(f"Username {var_name} Success To Insert")
                            status[var_name] = value
                        except Exception as e:
                            status[var_name] = str(e)
                end_time = time.perf_counter()
                logger.info(f"Chunk {idx + 1} Complete In {end_time - start_time:.2f} s")

        return status

    # ----- user_status ------------------------------------------------------

    def set_user_status(self, dto):
        if dto.id is None:
            raise Exception("id cannot be null !")

        data = dto.dict()
        data["id"] = dto.id
        data["createdAt"] = self._now()
        data["lastActive"] = self._now()
        return self._upsert_user_status(data)

    def get_user_status_by_id(self, id: str):
        data = self._first(self.table(self.user_status_table).select("*").eq("id", id))
        return data or {}

    def _upsert_user_status(self, data: dict) -> dict:
        if "id" not in data:
            raise ValueError("upsert requires id")
        data["updatedAt"] = self._now()
        self.table(self.user_status_table).upsert(data).execute()
        logger.success(f"{data['id']} has been upserted.")
        return data

    # ----- workspace lookups ------------------------------------------------

    def my_workspace(self, dto: FindDTO, payload):
        permission_id = payload.get("permission_id")
        user_id = payload.get("user_id")

        wi_resp = (
            self.table(self.workspace_integration_table)
            .select("workspaceId")
            .eq("userId", user_id)
            .execute()
        )
        workspace_ids = [w["workspaceId"] for w in (wi_resp.data or [])]

        builder = self.table(self.workspace_table).select("*", count="exact")
        builder = supabase_query_builder(builder, dto, text_type="name,description")

        if permission_id in listPermissionID:
            builder = builder.or_(
                f"personal.neq.true,and(personal.eq.true,createdBy.eq.{user_id})"
            )
        elif permission_id in ADMIN_AND_OWNER_PERMISSIONS:
            # Admin/owner sees their integration list OR any non-personal OR own personal.
            id_clause = ""
            if workspace_ids:
                joined = ",".join(workspace_ids)
                id_clause = f"id.in.({joined}),"
            builder = builder.or_(
                f"{id_clause}personal.neq.true,and(personal.eq.true,createdBy.eq.{user_id})"
            )
        else:
            if workspace_ids:
                builder = builder.in_("id", workspace_ids)
            else:
                # No memberships → empty result early.
                return [], 0

        order_desc = dto.order.lower() == "desc"
        builder = builder.order("personal", desc=True).order(dto.orderBy, desc=order_desc)

        start = (dto.page - 1) * dto.size
        end = start + dto.size - 1
        resp = builder.range(start, end).execute()
        rows = resp.data or []

        result = []
        for datum in rows:
            members = (
                self.table(self.workspace_integration_table)
                .select("permission,userId", count="exact")
                .eq("workspaceId", datum["id"])
                .execute()
            )
            permission = next(
                (m for m in (members.data or []) if m["userId"] == user_id), None
            )
            id_permission = permission["permission"] if permission else None
            if permission_id in listPermissionID:
                id_permission = permission_id

            datum["member"] = members.count or len(members.data or [])
            datum["permissionId"] = id_permission
            result.append(datum)

        return result, (resp.count or 0)

    def auto_add_workspace(self, userId: str):
        existing = self._first(
            self.table(self.workspace_table).select("*").eq("id", userId)
        )
        if existing:
            logger.info("workspace already exists")
            raise Exception("data workspace already exist!")

        dto = WorkspaceDTO(
            name="Personal Workspace",
            createdBy=userId,
            personal=True,
            description="",
            image="",
            color="",
            status="",
            organizationId="",
            url="",
        )
        data = dto.dict(exclude_unset=True)
        data["id"] = userId
        data["createdAt"] = self._now()
        logger.debug(f"workspace data: {data}")

        param_member = WorkspaceIntegrationDTO(
            listUserId=[userId],
            workspaceId=userId,
            permission="22298735ce6088c172e8c24dc70c838e",
            invitedBy=userId,
        )
        self.auto_add_workspace_integration(param_member)
        return self._upsert_workspace(data)

    def auto_add_workspace_integration(self, dto: WorkspaceIntegrationDTO):
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
                    "invitedAt": self._now(),
                }
            )

        for chunk in _chunked(rows, 10):
            self._bulk_integration_upsert(chunk)
        return rows

    def _bulk_integration_upsert(self, rows: list):
        try:
            self.table(self.workspace_integration_table).upsert(rows).execute()
            logger.info(f"success integrating {len(rows)} documents")
        except Exception as e:
            logger.error(
                f"failed integrating {len(rows)} documents. \nerror: {e} \nrows: \n{rows}"
            )

    def _upsert_workspace(self, data: dict) -> dict:
        if "id" not in data:
            raise ValueError("upsert requires id")
        data["updatedAt"] = self._now()
        self.table(self.workspace_table).upsert(data).execute()
        logger.success(f"{data['id']} has been upserted.")
        return data


def _chunked(seq: list, size: int):
    for i in range(0, len(seq), size):
        yield seq[i : i + size]
