from fastapi import APIRouter, HTTPException
from typing import List

from .schemas import User, Identity, Product, Admin
from .storage import read_collection, write_collection

router = APIRouter()


@router.get("/users", response_model=List[User])
def list_users():
    return read_collection("users")


@router.post("/users", response_model=User)
def create_user(payload: User):
    items = read_collection("users")
    items.append(payload.model_dump())
    write_collection("users", items)
    return payload


@router.get("/users/{user_id}", response_model=User)
def get_user(user_id: str):
    items = read_collection("users")
    for it in items:
        if it.get("id") == user_id:
            return it
    raise HTTPException(status_code=404, detail="user not found")


@router.get("/identities", response_model=List[Identity])
def list_identities():
    return read_collection("identities")


@router.post("/identities", response_model=Identity)
def create_identity(payload: Identity):
    items = read_collection("identities")
    items.append(payload.model_dump())
    write_collection("identities", items)
    return payload


@router.get("/products", response_model=List[Product])
def list_products():
    return read_collection("products")


@router.post("/products", response_model=Product)
def create_product(payload: Product):
    items = read_collection("products")
    items.append(payload.model_dump())
    write_collection("products", items)
    return payload


@router.get("/admins", response_model=List[Admin])
def list_admins():
    return read_collection("admins")


@router.post("/admins", response_model=Admin)
def create_admin(payload: Admin):
    items = read_collection("admins")
    items.append(payload.model_dump())
    write_collection("admins", items)
    return payload
