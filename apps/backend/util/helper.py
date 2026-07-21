import locale
from time import time
import dateparser
import pytz
from fastapi import Depends
from auth.auth_bearer import JWTBearer
from config.base import settings
import re
from Crypto.Cipher import AES
import base64
from loguru import logger
import jmespath
import hashlib
from datetime import datetime, timedelta, timezone
from bs4 import BeautifulSoup
import requests
import json
import bcrypt
import os, ast
import pandas as pd
import bs4, random, string
from util.supabase import SupabaseService
from config.base import settings
import copy
from exceptions.fusion_exceptions import ValidationException, ErrorSubCategory


_KEY_LOCATION = ["ibu_kota", "lahir", "kantor_pusat"]

_DEFAULT_IGNORE = "orderBy,order,page,size,search,search_by,operator,source,startDate,endDate,filters,timeframe,multiSearch,readWrite"


def supabase_query_builder(
    query,
    dto,
    text_type=None,
    multi_field=None,
    ignore=_DEFAULT_IGNORE,
    is_dict=False,
    additional_ignore=None,
    date_fields=None,
    ignore_field: list = None,
):
    """Apply DTO-derived filters to a PostgREST query builder.

    Equivalent of the legacy ``mongo_query_builder`` but for ``supabase-py``.
    Returns the (mutated) query builder so callers can keep chaining.

    Mapping from Mongo operators:
      ``$regex/$options:i`` → ``ilike("col", "%pattern%")``
      ``$in``               → ``in_("col", [...])``
      ``$ne``               → ``neq("col", value)``
      ``$gte/$lte``         → ``gte("col", v).lte("col", v)``
      ``$or`` (multi-field) → ``or_("a.eq.X,b.eq.X")``
    """
    if additional_ignore:
        ignore = f"{ignore},{additional_ignore}"

    if multi_field is None:
        multi_field = {"account_id": "shared"}

    dictionary = dto if is_dict else dto.dict()
    dictionary = ignore_empty_array(dictionary)

    ignore_set = set(ignore.split(","))

    # Date range on createdAt
    if dictionary.get("startDate") and dictionary.get("endDate"):
        gte = dateparser.parse(str(dictionary["startDate"]))
        lte = dateparser.parse(str(dictionary["endDate"]))
        if gte:
            query = query.gte("createdAt", gte.isoformat())
        if lte:
            query = query.lte("createdAt", lte.isoformat())

    # Timeframe — applied on the named field
    timeframe = dictionary.get("timeframe")
    if timeframe:
        field = timeframe.get("field") or "lastActive"
        if timeframe.get("start"):
            query = query.gte(field, _parse_or_pass(timeframe["start"]))
        if timeframe.get("end"):
            query = query.lte(field, _parse_or_pass(timeframe["end"]))

    if dictionary.get("searchIgnoreSpecial") and dictionary.get("search"):
        search = r"[\s\W_]*".join(map(re.escape, dictionary["search"].split()))
        dictionary["search"] = search

    # Multi-field text search via search + search_by
    search_by = dictionary.get("search_by") or []
    search_term = dictionary.get("search")
    if search_by and search_term:
        operator = dictionary.get("operator")
        terms = search_term.split(" ") if operator else [search_term]
        # PostgREST .or_ takes a comma-separated string of `<col>.<op>.<val>` pairs.
        clauses = []
        for col in search_by:
            for term in terms:
                clauses.append(f"{col}.ilike.%{_pgrst_escape(term)}%")
        if clauses:
            query = query.or_(",".join(clauses))

    # Multi-search variant (list of terms instead of a sentence)
    multi_search = dictionary.get("multiSearch")
    if search_by and multi_search:
        clauses = [
            f"{col}.ilike.%{_pgrst_escape(term)}%"
            for col in search_by
            for term in multi_search
        ]
        if clauses:
            query = query.or_(",".join(clauses))

    # Structured filter array (UI-builder style)
    filters_payload = dictionary.get("filters")
    if isinstance(filters_payload, list) and filters_payload:
        for f in filters_payload:
            if date_fields and f.get("field") in date_fields:
                if f["value"].get("gte"):
                    f["value"]["gte"] = dateparser.parse(str(f["value"]["gte"]))
                if f["value"].get("lte"):
                    f["value"]["lte"] = dateparser.parse(str(f["value"]["lte"]))
        query = supabase_filter_query_builder(query, filters_payload)

    # Field-level filters from the rest of the DTO
    for key, value in dictionary.items():
        if key in ignore_set or value is None:
            continue
        if isinstance(value, bool):
            continue
        if ignore_field and key in ignore_field:
            continue

        if text_type and key in text_type.split(","):
            query = query.ilike(key, f"%{_pgrst_escape(str(value))}%")
        elif key in multi_field:
            query = query.or_(
                f"{key}.eq.{_pgrst_escape(str(value))},"
                f"{multi_field[key]}.eq.{_pgrst_escape(str(value))}"
            )
        elif isinstance(value, list):
            query = query.in_(key, value)
        elif isinstance(value, str) and "!" in value:
            query = query.neq(key, value.replace("!", ""))
        else:
            query = query.eq(key, value)

    return query


def _pgrst_escape(text: str) -> str:
    """Escape commas/parens that would break PostgREST .or_/.and_ syntax."""
    return text.replace(",", "\\,").replace("(", "\\(").replace(")", "\\)")


def _parse_or_pass(value):
    parsed = dateparser.parse(str(value))
    return parsed.isoformat() if parsed else value


def snake_to_camel(snake_str):
    components = snake_str.split('_')
    return components[0] + ''.join(x.capitalize() for x in components[1:])


def snake_to_camel_case(data):
    if isinstance(data, dict):
        result = {}
        for _key, _value in data.items():
            result[snake_to_camel(_key)] = _value
        return result
    elif isinstance(data, str):
        return snake_to_camel(data)

    return data


def to_camel_case(data):
    if isinstance(data, list):
        result = []
        for datum in data:
            result.append(snake_to_camel_case(datum))
        return result
    return snake_to_camel_case(data)


def replace_query_alias(query_string, all_query_alias):
    query_string = query_string.replace('“', '"').replace("”", '"')
    matches = [word for word in query_string.split() if 'QUERY_' in word]
    if matches:
        for match in matches:
            match = match.replace("(", "").replace(")", "")
            if match in all_query_alias:
                query_string = query_string.replace(match, f"({all_query_alias[match]})")
            else:
                raise Exception(f"There is no alias with name {match}")
    return query_string


def ignore_empty_array(dictionary):
    result = {}
    for key, value in dictionary.items():
        if isinstance(value, list) and not value:
            pass
        else:
            result[key] = value
    return result


def censor_email(email):
    parts = email.split('.')
    username = parts[0]
    domain = parts[-1]

    return f"{username[:2]}***.{domain}"


def get_execution_time(start_time) -> int:
    execution_time = int((time() - start_time) * 1000)
    return execution_time


def get_md5(string: str) -> str:
    return hashlib.md5(string.encode("utf-8")).hexdigest()


def is_include_schema(tag, end_point):
    if tag in settings.ACTIVE_ROUTERS:
        if not settings.ACTIVE_ROUTERS[tag]:
            return True
        elif end_point in settings.ACTIVE_ROUTERS[tag]:
            return True
        return False
    return True

def mapper_user(users):
    map_user = {}
    for user in users:
        for _field in ["phone", "password", "email"]:
            if _field in user:
                user.pop(_field)
        map_user[user["id"]] = user

    return map_user

def router_param_builder(tag, jwt=True):
    result = {
        "prefix": f"/{tag.replace('_', '/').replace('-', '_')}",
        "tags": [tag.replace("_", " ")],
    }

    if jwt:
        result["dependencies"] = [Depends(JWTBearer())] if settings.JWT_ACTIVE else None

    return result


def custom_router_param_builder(tags: list, prefix: str, jwt=True):
    result = {
        "prefix": prefix,
        "tags": tags,
    }
    if jwt:
        result["dependencies"] = [Depends(JWTBearer())] if settings.JWT_ACTIVE else None

    return result


def encrypt(password):
    password = password.encode('utf-8')
    hashed = bcrypt.hashpw(password, bcrypt.gensalt(10))
    return bytes.decode(hashed)


def to_base64(text):
    text_bytes = text.encode("utf-8")

    base64_bytes = base64.b64encode(text_bytes)
    base64_string = base64_bytes.decode("utf-8")

    return base64_string


def encrypt_aes(key, text):
    cipher = AES.new(key.encode(), AES.MODE_ECB)
    text = text.encode()
    while len(text) % 16 != 0:
        text += b' '
    encrypted_text = cipher.encrypt(text)
    return base64.b64encode(encrypted_text).decode()

def camel_to_snake_case(data):
    if isinstance(data, dict):
        result = {}
        for _key, _value in data.items():
            _key = re.sub(r'(?<!^)(?=[A-Z])', '_', _key).lower()
            result[_key] = _value
        return result
    elif isinstance(data, str):
        return re.sub(r'(?<!^)(?=[A-Z])', '_', data).lower()

    return data


def to_snake_case(data):
    if isinstance(data, list):
        result = []
        for datum in data:
            result.append(camel_to_snake_case(datum))
        return result
    return camel_to_snake_case(data)


def supabase_filter_query_builder(query, filters):
    """Translate UI-builder filter objects into PostgREST query chain methods.

    Each filter has shape::

        {
          "field": "<col>",
          "operator": "is" | "is not" | "is one of" | "is not one of" |
                      "is between" | "is not between" | "is exist" |
                      "is not exist" | "is contains" | "is not contains" |
                      "all" | "greater than equals" | "less than equals",
          "value": {"is": ..., "isOneOf": [...], "gte": ..., "lte": ...},
          "operator_type": "and" | "or",
          "fieldType": "string" | "number" | "date" | ...
        }

    Returns the (mutated) PostgREST query builder.
    """
    or_clauses = []

    for _filter in filters:
        field = _filter.get("field")
        if not field:
            continue

        op = _filter["operator"]
        value = _filter.get("value", {})
        is_negation = "not" in op
        operator_type = _filter.get("operator_type", "and")

        clause = None  # (method, *args) for direct chain; or `None` to skip

        if op in ("is", "is not") and value.get("is") is not None:
            clause = ("eq", field, value["is"])
        elif op in ("is one of", "is not one of") and value.get("isOneOf") is not None:
            clause = ("in_", field, value["isOneOf"])
        elif op == "greater than equals" and value.get("gte") is not None:
            clause = ("gte", field, value["gte"])
        elif op == "less than equals" and value.get("lte") is not None:
            clause = ("lte", field, value["lte"])
        elif op in ("is between", "is not between") and value.get("gte") and value.get("lte"):
            # Apply both bounds; negation flips to .not_.gte / .not_.lte via or_
            if not is_negation:
                query = query.gte(field, value["gte"]).lte(field, value["lte"])
            else:
                query = query.or_(
                    f"{field}.lt.{_pgrst_escape(str(value['gte']))},"
                    f"{field}.gt.{_pgrst_escape(str(value['lte']))}"
                )
            continue
        elif op in ("is exist", "is not exist"):
            clause = ("not_", "is_", field, "null") if not is_negation else ("is_", field, "null")
        elif op in ("is contains", "is not contains") and value.get("is"):
            clause = ("ilike", field, f"%{_pgrst_escape(str(value['is']))}%")
        elif op == "all" and value.get("isOneOf") is not None:
            # PostgREST array-contains: cs (contains)
            clause = ("contains", field, value["isOneOf"])
        else:
            continue

        if clause is None:
            continue

        # Negation routing
        if is_negation and operator_type != "or":
            method, *args = clause
            if method == "eq":
                query = query.neq(*args)
            elif method == "in_":
                # PostgREST .not_.in_("col", [...])
                query = query.not_.in_(*args)
            elif method == "ilike":
                query = query.not_.ilike(*args)
            elif method == "contains":
                query = query.not_.contains(*args)
            else:
                method_name, *real_args = clause
                query = getattr(query, method_name)(*real_args)
            continue

        if operator_type == "or":
            # Collect for a final or_ call
            method, *args = clause
            if method == "eq":
                or_clauses.append(f"{args[0]}.eq.{_pgrst_escape(str(args[1]))}")
            elif method == "in_":
                joined = ",".join(_pgrst_escape(str(v)) for v in args[1])
                or_clauses.append(f"{args[0]}.in.({joined})")
            elif method == "ilike":
                or_clauses.append(f"{args[0]}.ilike.{_pgrst_escape(str(args[1]))}")
            elif method == "gte":
                or_clauses.append(f"{args[0]}.gte.{_pgrst_escape(str(args[1]))}")
            elif method == "lte":
                or_clauses.append(f"{args[0]}.lte.{_pgrst_escape(str(args[1]))}")
            continue

        # Default: chain the method directly (AND semantics)
        method, *args = clause
        query = getattr(query, method)(*args)

    if or_clauses:
        query = query.or_(",".join(or_clauses))

    return query

def decode_base64(encoded_string):
    decoded_bytes = base64.b64decode(encoded_string)
    return decoded_bytes.decode('utf-8')

