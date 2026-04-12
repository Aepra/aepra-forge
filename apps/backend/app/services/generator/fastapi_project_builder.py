import io
import re
import zipfile
from typing import Dict, List, Tuple

from app.schemas.blueprint import ColumnSchema, ProjectBlueprint, RelationSchema, TableSchema
from app.services.generator.sql_builder import generate_init_sql


def _to_class_name(raw_name: str) -> str:
    safe = re.sub(r"[^a-zA-Z0-9_]+", "_", raw_name).strip("_")
    parts = [p for p in safe.split("_") if p]
    if not parts:
        return "Entity"

    if len(parts) == 1 and parts[0].endswith("s") and len(parts[0]) > 1:
        parts[0] = parts[0][:-1]

    return "".join(part.capitalize() for part in parts)


def _snake_case(raw_name: str) -> str:
    safe = re.sub(r"[^a-zA-Z0-9_]+", "_", raw_name).strip("_")
    return safe.lower() or "entity"


def _build_relation_map(relations: List[RelationSchema]) -> Dict[Tuple[str, str], RelationSchema]:
    relation_map: Dict[Tuple[str, str], RelationSchema] = {}
    for relation in relations:
        relation_map[(relation.from_table, relation.from_column)] = relation
    return relation_map


def _sqlalchemy_col_type(col: ColumnSchema) -> str:
    sql_type = col.type.lower()

    if sql_type == "uuid":
        return "UUID(as_uuid=True)"
    if sql_type in {"int", "int fk", "integer"}:
        return "Integer"
    if sql_type == "bigint":
        return "BigInteger"
    if sql_type in {"bool", "boolean"}:
        return "Boolean"
    if sql_type in {"timestamp", "datetime"}:
        return "DateTime(timezone=True)"
    if sql_type == "text":
        return "Text"
    if sql_type == "varchar":
        return f"String({col.length or 255})"

    return "String"


def _python_type(col: ColumnSchema) -> str:
    sql_type = col.type.lower()

    if sql_type == "uuid":
        return "UUID"
    if sql_type in {"int", "int fk", "integer", "bigint"}:
        return "int"
    if sql_type in {"bool", "boolean"}:
        return "bool"
    if sql_type in {"timestamp", "datetime"}:
        return "datetime"
    return "str"


def _default_expr(col: ColumnSchema) -> str:
    if not col.default:
        return ""

    default_raw = col.default.strip().lower()

    if default_raw in {"uuid_generate_v4()", "gen_random_uuid()"}:
        return ", default=uuid.uuid4"
    if default_raw == "now()":
        return ", server_default=text(\"now()\")"
    return f", server_default=text(\"{col.default}\")"


def _build_model_file(table: TableSchema, relation_map: Dict[Tuple[str, str], RelationSchema]) -> str:
    class_name = _to_class_name(table.name)

    lines = [
        "import uuid",
        "",
        "from sqlalchemy import BigInteger, Boolean, Column, DateTime, ForeignKey, Integer, String, Text, text",
        "from sqlalchemy.dialects.postgresql import UUID",
        "",
        "from app.models.base_class import Base",
        "",
        "",
        f"class {class_name}(Base):",
        f"    __tablename__ = \"{table.name}\"",
        "",
    ]

    for col in table.columns:
        col_type_expr = _sqlalchemy_col_type(col)
        relation = relation_map.get((table.name, col.name))

        args: List[str] = [col_type_expr]
        if relation:
            on_delete = relation.on_delete.upper()
            args.append(f"ForeignKey(\"{relation.to_table}.{relation.to_column}\", ondelete=\"{on_delete}\")")

        kwargs: List[str] = []
        if col.primary:
            kwargs.append("primary_key=True")
        if not col.nullable:
            kwargs.append("nullable=False")
        if col.unique:
            kwargs.append("unique=True")

        default_expr = _default_expr(col)
        if default_expr:
            kwargs.append(default_expr.replace(", ", "", 1))

        args_and_kwargs = ", ".join(args + kwargs)
        lines.append(f"    {col.name} = Column({args_and_kwargs})")

    lines.append("")
    return "\n".join(lines)


def _build_schema_file(table: TableSchema) -> str:
    class_name = _to_class_name(table.name)

    base_lines = [
        "from datetime import datetime",
        "from typing import Optional",
        "from uuid import UUID",
        "",
        "from pydantic import BaseModel, ConfigDict",
        "",
        "",
        f"class {class_name}Base(BaseModel):",
    ]

    create_lines: List[str] = []
    update_lines: List[str] = []
    read_lines: List[str] = []

    for col in table.columns:
        py_type = _python_type(col)
        is_required_on_create = not col.primary and not col.nullable and col.default is None

        if col.primary:
            read_lines.append(f"    {col.name}: {py_type}")
            continue

        if is_required_on_create:
            create_lines.append(f"    {col.name}: {py_type}")
        else:
            create_lines.append(f"    {col.name}: Optional[{py_type}] = None")

        update_lines.append(f"    {col.name}: Optional[{py_type}] = None")
        read_lines.append(f"    {col.name}: Optional[{py_type}] = None")

    if not create_lines:
        create_lines = ["    pass"]
    if not update_lines:
        update_lines = ["    pass"]
    if not read_lines:
        read_lines = ["    pass"]

    schema = "\n".join(base_lines)

    if len(table.columns) == 0:
        schema += "\n    pass\n"
    else:
        for col in table.columns:
            if col.primary:
                continue
            py_type = _python_type(col)
            schema += f"\n    {col.name}: Optional[{py_type}] = None"
        if all(col.primary for col in table.columns):
            schema += "\n    pass"
        schema += "\n"

    schema += f"\n\nclass {class_name}Create(BaseModel):\n"
    schema += "\n".join(create_lines) + "\n"

    schema += f"\n\nclass {class_name}Update(BaseModel):\n"
    schema += "\n".join(update_lines) + "\n"

    schema += f"\n\nclass {class_name}Read(BaseModel):\n"
    schema += "\n".join(read_lines) + "\n"
    schema += "\n    model_config = ConfigDict(from_attributes=True)\n"

    return schema


def _build_crud_file(table: TableSchema) -> str:
    class_name = _to_class_name(table.name)
    module_name = _snake_case(table.name)

    pk_column = next((col for col in table.columns if col.primary), None)
    pk_name = pk_column.name if pk_column else "id"
    pk_type = _python_type(pk_column) if pk_column else "UUID"

    return f'''from sqlalchemy.orm import Session

from app.models.{module_name} import {class_name}
from app.schemas.{module_name} import {class_name}Create, {class_name}Update


def get(db: Session, item_id: {pk_type}) -> {class_name} | None:
    return db.query({class_name}).filter({class_name}.{pk_name} == item_id).first()


def get_multi(db: Session, skip: int = 0, limit: int = 100) -> list[{class_name}]:
    return db.query({class_name}).offset(skip).limit(limit).all()


def create(db: Session, payload: {class_name}Create) -> {class_name}:
    item = {class_name}(**payload.model_dump(exclude_unset=True))
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def update(db: Session, db_item: {class_name}, payload: {class_name}Update) -> {class_name}:
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_item, key, value)

    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item


def remove(db: Session, db_item: {class_name}) -> None:
    db.delete(db_item)
    db.commit()
'''


def _build_endpoint_file(table: TableSchema) -> str:
    class_name = _to_class_name(table.name)
    module_name = _snake_case(table.name)

    pk_column = next((col for col in table.columns if col.primary), None)
    pk_type = _python_type(pk_column) if pk_column else "UUID"

    return f'''from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_db
from app.crud import {module_name} as {module_name}_crud
from app.schemas.{module_name} import {class_name}Create, {class_name}Read, {class_name}Update

router = APIRouter(prefix="/{table.name}", tags=["{class_name}"])


@router.get("/", response_model=list[{class_name}Read])
def read_items(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return {module_name}_crud.get_multi(db=db, skip=skip, limit=limit)


@router.get("/{{item_id}}", response_model={class_name}Read)
def read_item(item_id: {pk_type}, db: Session = Depends(get_db)):
    item = {module_name}_crud.get(db=db, item_id=item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return item


@router.post("/", response_model={class_name}Read, status_code=status.HTTP_201_CREATED)
def create_item(payload: {class_name}Create, db: Session = Depends(get_db)):
    return {module_name}_crud.create(db=db, payload=payload)


@router.put("/{{item_id}}", response_model={class_name}Read)
def update_item(item_id: {pk_type}, payload: {class_name}Update, db: Session = Depends(get_db)):
    item = {module_name}_crud.get(db=db, item_id=item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return {module_name}_crud.update(db=db, db_item=item, payload=payload)


@router.delete("/{{item_id}}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(item_id: {pk_type}, db: Session = Depends(get_db)):
    item = {module_name}_crud.get(db=db, item_id=item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    {module_name}_crud.remove(db=db, db_item=item)
'''


def build_fastapi_project_zip(blueprint: ProjectBlueprint) -> io.BytesIO:
    relation_map = _build_relation_map(blueprint.relations)
    sql_code = generate_init_sql(blueprint)

    model_modules = [_snake_case(table.name) for table in blueprint.tables]

    api_router_imports = "\n".join(
        f"from app.api.v1.endpoints import {module_name}" for module_name in model_modules
    )
    api_router_includes = "\n".join(
        f"api_router.include_router({module_name}.router)" for module_name in model_modules
    )

    model_init_imports = "\n".join(
        f"from app.models.{module_name} import {_to_class_name(module_name)}" for module_name in model_modules
    )

    crud_init_imports = "\n".join(f"from app.crud import {module_name}" for module_name in model_modules)

    schema_init_imports = "\n".join(
        f"from app.schemas.{module_name} import {_to_class_name(module_name)}Create, {_to_class_name(module_name)}Read, {_to_class_name(module_name)}Update"
        for module_name in model_modules
    )

    project_files: Dict[str, str] = {
        "Dockerfile": """FROM python:3.11-slim\n\nWORKDIR /app\n\nENV PYTHONDONTWRITEBYTECODE=1\nENV PYTHONUNBUFFERED=1\n\nCOPY requirements.txt ./\nRUN pip install --no-cache-dir -r requirements.txt\n\nCOPY . .\n\nCMD [\"uvicorn\", \"app.main:app\", \"--host\", \"0.0.0.0\", \"--port\", \"8000\"]\n""",
        "docker-compose.yml": """version: '3.9'\n\nservices:\n  db:\n    image: postgres:16-alpine\n    container_name: aepra_fastapi_db\n    restart: unless-stopped\n    env_file:\n      - .env\n    environment:\n      POSTGRES_USER: ${POSTGRES_USER}\n      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}\n      POSTGRES_DB: ${POSTGRES_DB}\n    ports:\n      - \"5432:5432\"\n    volumes:\n      - pg_data:/var/lib/postgresql/data\n      - ./init.sql:/docker-entrypoint-initdb.d/001_init.sql\n\n  api:\n    build: .\n    container_name: aepra_fastapi_api\n    restart: unless-stopped\n    env_file:\n      - .env\n    depends_on:\n      - db\n    ports:\n      - \"8000:8000\"\n\nvolumes:\n  pg_data:\n""",
        ".env.example": """APP_NAME=Aepra Generated API\nAPP_ENV=development\nAPI_V1_STR=/api/v1\n\nPOSTGRES_USER=admin\nPOSTGRES_PASSWORD=password123\nPOSTGRES_DB=main_db\nPOSTGRES_HOST=db\nPOSTGRES_PORT=5432\nDATABASE_URL=postgresql+psycopg2://admin:password123@db:5432/main_db\n""",
        "requirements.txt": """fastapi==0.115.0\nuvicorn[standard]==0.30.6\nsqlalchemy==2.0.35\npsycopg2-binary==2.9.9\npydantic==2.9.2\npydantic-settings==2.5.2\npython-dotenv==1.0.1\npytest==8.3.3\n""",
        "README.md": """# Generated FastAPI Project\n\nProject ini digenerate otomatis dari schema_json oleh Aepra-Forge.\n\n## Run\n\n1. Copy environment file\n\n```bash\ncp .env.example .env\n```\n\n2. Build and run\n\n```bash\ndocker compose up --build\n```\n\n3. Open API docs\n\n- Swagger UI: http://localhost:8000/docs\n- ReDoc: http://localhost:8000/redoc\n- Health: http://localhost:8000/healthz\n\n## Notes\n\n- Database Postgres berjalan di port 5432\n- API berjalan di port 8000\n- SQL bootstrap tersedia di `init.sql`\n""",
        "init.sql": sql_code,
        "app/__init__.py": "",
        "app/main.py": """from fastapi import FastAPI\n\nfrom app.api.v1.api import api_router\nfrom app.core.config import settings\nfrom app.core.database import engine\nfrom app.models.base_class import Base\n\nBase.metadata.create_all(bind=engine)\n\napp = FastAPI(title=settings.APP_NAME)\napp.include_router(api_router, prefix=settings.API_V1_STR)\n\n\n@app.get(\"/\")\ndef root() -> dict[str, str]:\n    return {\"message\": \"Generated FastAPI API is running\"}\n\n\n@app.get(\"/healthz\")\ndef healthz() -> dict[str, str]:\n    return {\"status\": \"ok\"}\n""",
        "app/core/__init__.py": "",
        "app/core/config.py": """from pydantic_settings import BaseSettings, SettingsConfigDict\n\n\nclass Settings(BaseSettings):\n    APP_NAME: str = \"Aepra Generated API\"\n    APP_ENV: str = \"development\"\n    API_V1_STR: str = \"/api/v1\"\n\n    POSTGRES_USER: str = \"admin\"\n    POSTGRES_PASSWORD: str = \"password123\"\n    POSTGRES_DB: str = \"main_db\"\n    POSTGRES_HOST: str = \"db\"\n    POSTGRES_PORT: int = 5432\n\n    DATABASE_URL: str = \"postgresql+psycopg2://admin:password123@db:5432/main_db\"\n\n    model_config = SettingsConfigDict(env_file=\".env\", case_sensitive=True)\n\n\nsettings = Settings()\n""",
        "app/core/database.py": """from sqlalchemy import create_engine\nfrom sqlalchemy.orm import sessionmaker\n\nfrom app.core.config import settings\n\nengine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)\nSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)\n""",
        "app/core/deps.py": """from collections.abc import Generator\n\nfrom sqlalchemy.orm import Session\n\nfrom app.core.database import SessionLocal\n\n\ndef get_db() -> Generator[Session, None, None]:\n    db = SessionLocal()\n    try:\n        yield db\n    finally:\n        db.close()\n""",
        "app/models/__init__.py": f"from app.models.base_class import Base\n{model_init_imports}\n",
        "app/models/base_class.py": """from sqlalchemy.orm import declarative_base\n\nBase = declarative_base()\n""",
        "app/schemas/__init__.py": f"{schema_init_imports}\n",
        "app/crud/__init__.py": f"{crud_init_imports}\n",
        "app/api/__init__.py": "",
        "app/api/v1/__init__.py": "",
        "app/api/v1/endpoints/__init__.py": "",
        "app/api/v1/api.py": f"""from fastapi import APIRouter\n\n{api_router_imports}\n\napi_router = APIRouter()\n\n{api_router_includes}\n""",
        "tests/__init__.py": "",
        "tests/test_health.py": """from fastapi.testclient import TestClient\n\nfrom app.main import app\n\n\nclient = TestClient(app)\n\n\ndef test_healthz() -> None:\n    response = client.get(\"/healthz\")\n    assert response.status_code == 200\n    assert response.json()[\"status\"] == \"ok\"\n""",
    }

    for table in blueprint.tables:
        module_name = _snake_case(table.name)
        project_files[f"app/models/{module_name}.py"] = _build_model_file(table, relation_map)
        project_files[f"app/schemas/{module_name}.py"] = _build_schema_file(table)
        project_files[f"app/crud/{module_name}.py"] = _build_crud_file(table)
        project_files[f"app/api/v1/endpoints/{module_name}.py"] = _build_endpoint_file(table)

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for path, content in project_files.items():
            zip_file.writestr(path, content)

    zip_buffer.seek(0)
    return zip_buffer
