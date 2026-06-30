from pydantic import BaseModel, Field

from app.models.enums import UserRole
from app.schemas.common import StrictRequestModel


class LoginRequest(StrictRequestModel):
    username: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=1, max_length=256)


class UserRead(BaseModel):
    id: int
    username: str
    role: UserRole

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead
