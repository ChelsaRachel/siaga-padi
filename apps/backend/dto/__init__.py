from typing import Any, Optional
from pydantic import BaseModel, Field
import os
from datetime import datetime


class CustomBaseModel(BaseModel):
    def dict(self, *, include: Any = None, exclude: Any = None, by_alias: bool = False, exclude_unset: bool = True, **kwargs) -> dict:
        return super().dict(include=include, exclude=exclude, by_alias=by_alias, exclude_unset=exclude_unset, **kwargs)


class BaseFindDTO(BaseModel):
    search: str = Field(default=None)
    search_by: list = Field(default=[])
    operator: str = Field(default=None)
    orderBy: str = Field(default="createdAt")
    order: str = Field(default="desc")
    page: int = Field(default=1)
    size: int = Field(default=10)
    searchIgnoreSpecial: bool = Field(default=False)


class FindDTO(BaseFindDTO):
    workspaceId: str = Field(default=None)
    filters: list = Field(default=[])
    organizationId: str = Field(default=None)

class ConnectionFindDTO(FindDTO):
    readWrite: bool = Field(default=False)
    showHost: bool = Field(default=False)

class LogDTO(BaseModel):
    dashboardId: Optional[str] = Field(default=None)
    dashboardName: Optional[str] = Field(default=None)
    menuId: Optional[str] = Field(default=None)
    menuName: Optional[str] = Field(default=None)
    widgetId: Optional[str] = Field(default=None)
    widgetName: Optional[str] = Field(default=None)
    applicationType: str = Field(default="fusion_app" if os.getenv("IS_FUSION_APP") in [True, "true", "True", "TRUE"] else "fusion_builder")
    domain: Optional[str] = Field(default=None)
    userId: Optional[str] = Field(default=None)

    endpoint: str = Field(default=None)
    metadata: str = Field(default=None)
    executedAt: int = Field(default_factory=lambda: int(datetime.now().timestamp() * 1000))
    executionTime: int | float = Field(default=None)
    code: int = Field(default=None)
    errorMessage: str = Field(default=None)
