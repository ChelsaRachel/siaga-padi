import re
from dotenv import dotenv_values
from pydantic.v1 import BaseSettings, Field
from dotenv import load_dotenv
from loguru import logger
import os
from typing import Literal, Optional

logger.debug("Status load env {e}", e=load_dotenv(".env", override=True))


def build_routers(routers):
    result = {}
    for router in routers.split(","):
        selected_end_point = re.findall(r"\[([^\]]+)\]", router)
        if selected_end_point:
            router = router.split("[")[0]
            result[router] = selected_end_point[0].split(":")
        else:
            result[router] = None

    return result


WIDGET_KEYWORD_USER_PROMPT = """Below is a widget document with the following details.

##Source Widget
Dashboard name: {dashboardName}
Dashboard description: {dashboardDescription}
Menu name: {menuName}
Menu description: {menuDescription}

##Widget
Widget name: {name}
Widget description: {widgetDescription}
Sample widget data:
{sampleData}"""

DESC_PROMPT = """You are an expert at describing dataset metadata in Bahasa Indonesia. Your goal is to produce a single paragraph that provides a clear and informative overview of the dataset, easily understood by general readers, in proper and fluent Bahasa Indonesia. The description should capture the essence of the dataset without unnecessary details or repetition."""


class BaseSetting(BaseSettings):
    SUPABASE_URL: str
    SUPABASE_KEY: str
    SUPABASE_SCHEMA: str = Field(default="public")

    SUPABASE_TABLE_WORKSPACE: str
    SUPABASE_TABLE_WORKSPACE_FEATURE_SHARING: str
    SUPABASE_TABLE_USER: str
    SUPABASE_TABLE_ROLE: str
    SUPABASE_TABLE_GROUP: str
    SUPABASE_TABLE_CONNECTION_GROUP: str
    SUPABASE_TABLE_CONNECTION: str
    SUPABASE_TABLE_ORGANIZATION: str
    SUPABASE_TABLE_WORKSPACE_INTEGRATION: str
    SUPABASE_TABLE_USER_INTEGRATION: str
    SUPABASE_TABLE_USER_STATUS: str
    SUPABASE_TABLE_USER_WORKSPACE: str
    SUPABASE_TABLE_PERMISSION: str


    REDIS_HOST: str
    REDIS_PORT: int
    REDIS_PASSWORD: str
    REDIS_DB: int

    GOOGLE_CLIENT_ID: Optional[str] = Field(default=None)
    GOOGLE_CLIENT_SECRET: Optional[str] = Field(default=None)


    JWT_SECRET: str
    JWT_ALGORITH: str
    JWT_EXPIRED: int
    JWT_REFRESH: int = Field(default=604800)
    JWT_ACTIVE: bool

    BASE_RESPONSE_CASE: str

    ACTIVE_ROUTERS: dict
    ENABLED_ROUTERS: str = Field(default="")


    PROOFY_API_KEY: str
    PROOFY_URL: str

    ENC_ACTIVE: bool = Field(default=False)
    ENC_SECRET: str
    ENC_SECRET_PERMISSION: str

    RATE_LIMIT: int = Field(default=100000)
    RATE_LIMIT_WINDOW: int = Field(default=60)
    ACCOUNT_LOCK_TIME: int = Field(default=600)
    ACCOUNT_FAIL_LIMIT: int = Field(default=5)

    COPYRIGHT: str = Field(
        default="Copyright (c) 2023 eBdesk Teknologi. All Rights Reserved."
    )

    # External Authentication Configuration
    LOGIN_METHOD: Optional[str] = Field(default=None)
    LOGIN_API_URL: Optional[str] = Field(default=None)
    SUPABASE_TABLE_USER_EXTERNAL: Optional[str] = Field(default="user_external")

    MAX_THREADS_WORKERS: int = Field(default=64)
    SMTP_EMAIL: str
    SMTP_PASSWORD: Optional[str] = Field(default=None)
    SMTP_HOST: str
    SMTP_PORT: int
    SMTP_USE_TLS: Optional[bool] = Field(default=None)

    # --- Agent management plane (mandatory router /agent-mgmt/*) ---
    # be-python is the service layer for the agents workforce. The settings below
    # gate access to /agent-mgmt/* and drive the scheduler tick loop that fires
    # scheduled agents.
    INTERNAL_API_TOKEN: str = Field(default="")
    """Long-random shared secret. Configured in .env, used as the `X-Internal-Token`
    header by agent-python's `_runs.py` and system callers to bypass JWT on
    /agent-mgmt/*. Should be rotated periodically. Empty string = bypass disabled
    (JWT only)."""

    BE_AGENTS_TICK_SECONDS: int = Field(default=30)
    """Scheduler tick interval (seconds). Lower = faster cron firing, higher load."""

    MCP_HUB_URL: Optional[str] = Field(default=None)
    """MCPHub instance URL (used by agent_mgmt.fire_agent to call agents in the project group)."""

    MCP_HUB_API_KEY: Optional[str] = Field(default=None)
    """Bearer token for MCPHub."""

    MCP_HUB_GROUP: Optional[str] = Field(default=None)
    """Project group slug — shared with all agents in this Argus app."""
    SMTP_TYPE: Optional[str] = Field(default=None)
    SMTP_SENDER: Optional[str] = Field(default=None)

    class Config:
        env_file = ".env"


class Setting:
    instance = None

    def __new__(cls, *args, **kwargs):
        global settings
        if cls.instance is None:
            if kwargs.get("file"):
                env_values = dotenv_values(kwargs["file"])
                current_env = BaseSetting().dict()
                env_values = {
                    _key: os.getenv(_key, "")
                    for _key in env_values.keys()
                    if _key in current_env
                }

                if kwargs.get("update_env"):
                    new_env = {}
                    for env in kwargs.get("update_env").split(" "):
                        if env.split("=")[0] in env_values:
                            new_env[env.split("=")[0]] = env.split("=")[1]
                    env_values.update(new_env)

                if kwargs.get("routers"):
                    env_values["ACTIVE_ROUTERS"] = build_routers(kwargs.get("routers"))
                else:
                    env_values["ACTIVE_ROUTERS"] = ""
                cls.instance = BaseSetting(**env_values)
                settings = cls.instance
        return cls.instance


settings = Setting()
