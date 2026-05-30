from pydantic import BaseModel, Field
from typing import List, Optional
import uuid


class AccountInfo(BaseModel):
    provider: str
    account_id: Optional[str] = None


class Identity(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    accounts: List[AccountInfo] = []


class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    identities: List[Identity] = []


class Product(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    owner_user_id: Optional[str] = None


class Admin(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    role: Optional[str] = None
