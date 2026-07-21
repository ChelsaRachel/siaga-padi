from pydantic import Field, BaseModel
from typing import Optional
from dto import FindDTO


class BaseWorkspaceIntegrationDTO(BaseModel):
    listUserEmail : Optional[list] = Field(default=None)
    listUserId: Optional[list] = Field(default=None)
    workspaceId: str


class WorkspaceIntegrationDTO(BaseWorkspaceIntegrationDTO):
    permission: str
    invitedBy: str

class WorkspaceDTO(BaseModel):
    name: Optional[str] = Field(default=None)
    description: Optional[str] = Field(default=None)
    image: Optional[str] = Field(default=None)
    color: Optional[str] = Field(default=None)
    status: Optional[str] = Field(default=None)
    settings: Optional[dict] = Field(default=None)
    createdBy: Optional[str] = Field(default=None)
    updatedBy: Optional[str] = Field(default=None)
    invite : Optional[WorkspaceIntegrationDTO] = Field(default=None)
    organizationId: Optional[str] = Field(default=None)
    url: Optional[str] = Field(default=None)
    personal: Optional[bool] = Field(default=False)
    private: Optional[bool] = Field(default=False)
    dashboardId: Optional[str] = Field(default=None)


class RemoveWorkspaceIntegrationDTO(BaseWorkspaceIntegrationDTO):
    pass


class UpdateWorkspaceDTO(WorkspaceDTO):
    id: str


class GetMemberDTO(FindDTO):
    workspaceId: str

class WorkspaceJoinDTO(BaseModel):
    workspaceId: str
    userId: str
    permission: str
    invitedBy: str

class WorkspaceJoinedStatusDTO(BaseModel):
    workspaceId: str
    userId: str
    permissionId: str

class WorkspaceUpdateMemberDTO(BaseModel):
    workspaceId: str
    userId: str
    permission: str


class DuplicateWorkspaceDTO(BaseModel):
    workspaceId: str
    duplicateBy: str
    name: str = Field(default=None)
