# -*- coding: utf-8 -*-
import json
import requests
from typing import Dict, Any, Optional

from config.base import settings
from loguru import logger


class ExternalAuth:
    def __init__(self):
        self.api_url = settings.LOGIN_API_URL
        self.timeout = 30

    def get_external_user(self, username: str, password: str) -> Optional[Dict[str, Any]]:

        if not self._is_configured():
            return None

        try:
            response = self._make_api_request(username, password)
            return self._process_api_response(response, username)
        except Exception as e:
            logger.error(f"Unexpected error in external authentication: {str(e)}")
            return None

    def _is_configured(self) -> bool:
        if not self.api_url:
            logger.error("LOGIN_API_URL not configured")
            return False
        return True

    def _make_api_request(self, username: str, password: str) -> requests.Response:
        payload = {"username": username, "password": password}
        headers = {"Content-Type": "application/json"}

        return requests.post(
            self.api_url,
            json=payload,
            headers=headers,
            timeout=self.timeout
        )

    def _process_api_response(self, response: requests.Response, username: str) -> Optional[Dict[str, Any]]:
        try:
            if response.status_code == 200:
                # ? Added Authentication
                result = response.json()

                # user_info = result.get("data", {}).get("user_info", {})
                # if user_info:
                #     kode_jabatan: str = user_info.get("s_kd_jabdetail", "")
                #     if not kode_jabatan.startswith("2"):
                #         raise Exception(
                #             "Validation Valiled s_kd_jabdetail is not valid"
                #         )

                logger.info(f"External API login successful for user: {username}")
                return result
            else:
                logger.warning(f"External API login failed for user: {username}, status: {response.status_code}")
                return None

        except requests.exceptions.RequestException as e:
            logger.error(f"External API request failed: {str(e)}")
            return None
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse external API response: {str(e)}")
            return None

    def transform_external_user(self, external_data: Dict[str, Any]) -> Dict[str, Any]:
        if not self._is_valid_external_data(external_data):
            return {}

        user_info = self._extract_user_info(external_data)
        if not user_info:
            return {}

        transformed_data = self._map_user_fields(user_info)

        self._log_transformation(transformed_data)
        return transformed_data

    def _is_valid_external_data(self, external_data: Dict[str, Any]) -> bool:
        return external_data and external_data.get("status") == "Success"

    def _extract_user_info(self, external_data: Dict[str, Any]) -> Dict[str, Any]:
        return external_data.get("data", {}).get("user_info", {})

    def _map_user_fields(self, user_info: Dict[str, Any]) -> Dict[str, Any]:
        username = (
            user_info.get("username")
            or user_info.get("user_nip")
            or user_info.get("nip")
            or ""
        )
        email = user_info.get("email") or user_info.get("user_email") or ""
        fullname = (
            user_info.get("nama_gelar")
            or user_info.get("s_nama_lengkap")
            or user_info.get("nama_lengkap")
            or user_info.get("name")
            or ""
        )
        phone = (
            user_info.get("nomorhp")
            or user_info.get("nohp")
            or user_info.get("phone")
            or ""
        )
        nik = (
            user_info.get("nik")
            or user_info.get("nikbaru")
            or user_info.get("user_nik")
            or ""
        )
        is_active_value = str(user_info.get("aktif", "")).lower()
        status = "active" if is_active_value in {"1", "true", "aktif", "active"} else "inactive"

        tags = user_info.get("tags")
        if not isinstance(tags, list):
            tags = []
        if "external" not in tags:
            tags.append("external")

        mapped_data = {
            "username": username,
            "email": email,
            "fullname": fullname,
            "phone": phone,
            "nik": nik,
            "tags": tags,
            "status": status,
            "jabatan": user_info.get("jabatan") or "",
            "namaunit": user_info.get("namaunit") or user_info.get("nama_unit") or "",
            "nip": user_info.get("user_nip") or user_info.get("nip") or "",
            "s_nama_lengkap": user_info.get("s_nama_lengkap") or fullname,
            "kd_jabdetail": user_info.get("s_kd_jabdetail") or user_info.get("kd_jabdetail") or "",
            "s_nama_strata_skt": user_info.get("s_nama_strata_skt") or "",
            "golruang": user_info.get("golruang") or user_info.get("nama_golruang") or "",
            "nama_pangkat": user_info.get("nama_pangkat") or user_info.get("pangkat") or "",
            "nama_unit": user_info.get("nama_unit") or user_info.get("namaunit") or "",
        }

        external_data = dict(user_info)
        if username:
            external_data.setdefault("username", username)
        if email:
            external_data.setdefault("email", email)
        if phone:
            external_data.setdefault("nomorhp", phone)
        if nik:
            external_data.setdefault("nik", nik)

        mapped_data["external_data"] = external_data

        return mapped_data

    def _log_transformation(self, data: Dict[str, Any]) -> None:
        logger.debug(f"Transformed external user data: {json.dumps(data, indent=2)}")

    def validate_external_user(self, external_data: Dict[str, Any]) -> bool:
        if not self._is_valid_external_data(external_data):
            return False

        user_info = self._extract_user_info(external_data)
        if not user_info:
            return False

        return self._validate_required_fields(user_info)

    def _validate_required_fields(self, user_info: Dict[str, Any]) -> bool:
        required_fields = ["username", "nik"]  # Customize sesuai kebutuhan

        for field in required_fields:
            if not user_info.get(field):
                logger.warning(f"External user validation failed: missing {field}")
                return False

        return True
