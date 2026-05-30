from __future__ import annotations

from io import BytesIO
import keyword
import re
import zipfile
from textwrap import dedent
from typing import Any, Iterable


def _get(item: Any, name: str, default: Any = None) -> Any:
    if isinstance(item, dict):
        return item.get(name, default)
    return getattr(item, name, default)


def _slugify(value: str) -> str:
    value = re.sub(r"[^a-zA-Z0-9_]+", "_", value.strip().lower())
    value = re.sub(r"_+", "_", value).strip("_")
    return value or "item"


def _pascal_case(value: str) -> str:
    parts = re.split(r"[^a-zA-Z0-9]+", value.strip())
    normalized = "".join(part.capitalize() for part in parts if part)
    return normalized or "GeneratedModel"


def _safe_python_name(value: str) -> str:
    candidate = _slugify(value)
    if candidate and candidate[0].isdigit():
        candidate = f"field_{candidate}"
    if keyword.iskeyword(candidate):
        candidate = f"{candidate}_field"
    return candidate


def _quote(value: Any) -> str:
    return repr(value)


def _column_type_sqlalchemy(column_type: str | None) -> str:
    normalized = (column_type or "string").strip().lower()
    if normalized in {"int", "integer", "smallint"}:
        return "Integer"
    if normalized in {"bigint"}:
        return "BigInteger"
    if normalized in {"bool", "boolean"}:
        return "Boolean"
    if normalized in {"float", "double", "real"}:
        return "Float"
    if normalized in {"decimal", "numeric"}:
        return "Numeric"
    if normalized in {"date"}:
        return "Date"
    if normalized in {"datetime", "datetime2", "timestamp", "timestamptz"}:
        return "DateTime"
    if normalized in {"json", "jsonb"}:
        return "JSON"
    if normalized in {"text"}:
        return "Text"
    return "String"


def _python_type(column_type: str | None) -> str:
    normalized = (column_type or "string").strip().lower()
    if normalized in {"int", "integer", "smallint", "bigint"}:
        return "int"
    if normalized in {"bool", "boolean"}:
        return "bool"
    if normalized in {"float", "double", "real", "decimal", "numeric"}:
        return "float"
    if normalized in {"json", "jsonb"}:
        return "dict[str, Any] | list[Any]"
    return "str"


def _model_column_line(column: dict[str, Any], relation_map: dict[tuple[str, str], tuple[str, str]], table_name: str) -> str:
    name = _safe_python_name(str(column.get("name") or "field"))
    sa_type = _column_type_sqlalchemy(str(column.get("type") or "string"))
    args: list[str] = [sa_type]

    relation = relation_map.get((table_name, str(column.get("name") or name)))
    if relation:
        args.append(f"ForeignKey({_quote(f'{relation[0]}.{relation[1]}')})")

    options: list[str] = []
    if column.get("primary") or column.get("primaryKey"):
        options.append("primary_key=True")
        if sa_type == "Integer":
            options.append("autoincrement=True")
    if column.get("nullable") is False and not (column.get("primary") or column.get("primaryKey")):
        options.append("nullable=False")
    if column.get("unique"):
        options.append("unique=True")
    if column.get("default") not in (None, ""):
        default_value = column.get("default")
        if isinstance(default_value, str) and default_value.upper() in {"NOW()", "CURRENT_TIMESTAMP"}:
            options.append("server_default=func.now()")
        else:
            options.append(f"default={_quote(default_value)}")
    if sa_type == "String" and isinstance(column.get("length"), int):
        args[0] = f"String({column['length']})"

    return f"    {name} = Column({', '.join(args + options)})"


def _build_relation_map(relations: Iterable[Any]) -> dict[tuple[str, str], tuple[str, str]]:
    relation_map: dict[tuple[str, str], tuple[str, str]] = {}
    for relation in relations:
        from_table = str(_get(relation, "from_table", "")).strip()
        from_column = str(_get(relation, "from_column", "")).strip()
        to_table = str(_get(relation, "to_table", "")).strip()
        to_column = str(_get(relation, "to_column", "id")).strip() or "id"
        if from_table and from_column and to_table:
            relation_map[(from_table, from_column)] = (to_table, to_column)
    return relation_map


def _render_models(tables: list[Any], relations: list[Any]) -> str:
    relation_map = _build_relation_map(relations)
    lines: list[str] = [
        "from sqlalchemy import Column, Integer, BigInteger, String, Text, Boolean, Float, Date, DateTime, JSON, Numeric, ForeignKey, func",
        "from sqlalchemy.orm import declarative_base",
        "",
        "Base = declarative_base()",
        "",
    ]

    for table in tables:
        table_name = str(_get(table, "name", "item"))
        class_name = _pascal_case(table_name)
        columns = list(_get(table, "columns", []) or [])
        has_primary = any(bool(column.get("primary") or column.get("primaryKey")) for column in columns if isinstance(column, dict))

        lines.append(f"class {class_name}(Base):")
        lines.append(f"    __tablename__ = {_quote(table_name)}")
        if not has_primary:
            lines.append("    id = Column(Integer, primary_key=True, autoincrement=True)")

        for column in columns:
            if not isinstance(column, dict):
                continue
            lines.append(_model_column_line(column, relation_map, table_name))

        if lines[-1] == f"    __tablename__ = {_quote(table_name)}":
            lines.append("    pass")

        lines.append("")

    return "\n".join(lines).rstrip() + "\n"


def _render_schemas(tables: list[Any]) -> str:
    blocks: list[str] = []
    for table in tables:
        table_name = str(_get(table, "name", "item"))
        class_name = _pascal_case(table_name)
        columns = list(_get(table, "columns", []) or [])
        primary_columns = [column for column in columns if isinstance(column, dict) and (column.get("primary") or column.get("primaryKey"))]
        primary_column = primary_columns[0] if primary_columns else None
        primary_name = _safe_python_name(str((primary_column or {}).get("name") or "id"))
        primary_type = _python_type(str((primary_column or {}).get("type") or "int"))

        base_fields: list[str] = []
        update_fields: list[str] = []
        for column in columns:
            if not isinstance(column, dict):
                continue
            if column.get("primary") or column.get("primaryKey"):
                continue

            field_name = _safe_python_name(str(column.get("name") or "field"))
            python_type = _python_type(str(column.get("type") or "string"))
            nullable = column.get("nullable") is not False
            default = column.get("default")

            if nullable or default not in (None, ""):
                base_fields.append(f"    {field_name}: {python_type} | None = None")
            else:
                base_fields.append(f"    {field_name}: {python_type}")

            update_fields.append(f"    {field_name}: {python_type} | None = None")

        base_block = "\n".join(base_fields) if base_fields else "    pass"
        update_block = "\n".join(update_fields) if update_fields else "    pass"

        blocks.append(
            dedent(
                f"""
                class {class_name}Base(BaseModel):
                {base_block}


                class {class_name}Create({class_name}Base):
                    pass


                class {class_name}Update(BaseModel):
                {update_block}


                class {class_name}Read({class_name}Base):
                    model_config = ConfigDict(from_attributes=True)
                    {primary_name}: {primary_type}
                """
            ).strip()
        )

    header = "from pydantic import BaseModel, ConfigDict\nfrom typing import Any\n\n"
    return header + "\n\n".join(blocks) + "\n"


def _render_database() -> str:
    return dedent(
        """
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker

        DATABASE_URL = "sqlite:///./generated.db"

        connect_args = {"check_same_thread": False}
        engine = create_engine(DATABASE_URL, connect_args=connect_args)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

        def get_db():
            db = SessionLocal()
            try:
                yield db
            finally:
                db.close()
        """
    ).strip() + "\n"


def _render_router(table: Any) -> str:
    table_name = str(_get(table, "name", "item"))
    class_name = _pascal_case(table_name)
    router_name = _safe_python_name(table_name)
    columns = list(_get(table, "columns", []) or [])
    primary_columns = [column for column in columns if isinstance(column, dict) and (column.get("primary") or column.get("primaryKey"))]
    primary_column = primary_columns[0] if primary_columns else None
    primary_name = _safe_python_name(str((primary_column or {}).get("name") or "id"))
    primary_type = _python_type(str((primary_column or {}).get("type") or "int"))
    path_param_type = "int" if primary_type == "int" else "str"

    return dedent(
        f"""
        from fastapi import APIRouter, Depends, HTTPException
        from sqlalchemy.orm import Session

        from app.database import get_db
        from app.models import {class_name}
        from app.schemas import {class_name}Create, {class_name}Read, {class_name}Update

        router = APIRouter(prefix="/{router_name}", tags=["{router_name}"])


        @router.get("/", response_model=list[{class_name}Read])
        def list_{router_name}(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
            return db.query({class_name}).offset(skip).limit(limit).all()


        @router.post("/", response_model={class_name}Read)
        def create_{router_name}(payload: {class_name}Create, db: Session = Depends(get_db)):
            item = {class_name}(**payload.model_dump())
            db.add(item)
            db.commit()
            db.refresh(item)
            return item


        @router.get("/{{item_id}}", response_model={class_name}Read)
        def get_{router_name}(item_id: {path_param_type}, db: Session = Depends(get_db)):
            item = db.query({class_name}).filter({class_name}.{primary_name} == item_id).first()
            if not item:
                raise HTTPException(status_code=404, detail="Item not found")
            return item


        @router.put("/{{item_id}}", response_model={class_name}Read)
        def update_{router_name}(item_id: {path_param_type}, payload: {class_name}Update, db: Session = Depends(get_db)):
            item = db.query({class_name}).filter({class_name}.{primary_name} == item_id).first()
            if not item:
                raise HTTPException(status_code=404, detail="Item not found")

            for key, value in payload.model_dump(exclude_unset=True).items():
                setattr(item, key, value)

            db.commit()
            db.refresh(item)
            return item


        @router.delete("/{{item_id}}")
        def delete_{router_name}(item_id: {path_param_type}, db: Session = Depends(get_db)):
            item = db.query({class_name}).filter({class_name}.{primary_name} == item_id).first()
            if not item:
                raise HTTPException(status_code=404, detail="Item not found")

            db.delete(item)
            db.commit()
            return {{"success": True}}
        """
    ).strip() + "\n"


def _render_routers_init(tables: list[Any]) -> str:
    lines = ["from fastapi import APIRouter", ""]
    for table in tables:
        table_name = str(_get(table, "name", "item"))
        router_name = _safe_python_name(table_name)
        lines.append(f"from app.routers.{router_name} import router as {router_name}_router")

    lines.extend(["", "router = APIRouter()", ""])

    for table in tables:
        table_name = str(_get(table, "name", "item"))
        router_name = _safe_python_name(table_name)
        lines.append(f"router.include_router({router_name}_router)")

    return "\n".join(lines).rstrip() + "\n"


def _render_main() -> str:
    return dedent(
        """
        from fastapi import FastAPI

        from app.database import engine
        from app.models import Base
        from app.routers import router as api_router

        Base.metadata.create_all(bind=engine)

        app = FastAPI(title="Generated FastAPI Project")
        app.include_router(api_router, prefix="/api")


        @app.get("/")
        def root():
            return {"status": "ok", "message": "Generated FastAPI project is running"}
        """
    ).strip() + "\n"


def _render_requirements() -> str:
    return dedent(
        """
        fastapi>=0.115
        uvicorn[standard]>=0.30
        sqlalchemy>=2.0
        pydantic>=2.0
        """
    ).strip() + "\n"


def _render_readme() -> str:
    return dedent(
        """
        # Generated FastAPI Project

        ## Run

        ```bash
        pip install -r requirements.txt
        uvicorn app.main:app --reload
        ```

        ## Notes

        - SQLite database file: `generated.db`
        - API routes are mounted under `/api`
        - Each schema table becomes a CRUD router
        """
    ).strip() + "\n"


def build_fastapi_project_zip(blueprint: Any) -> BytesIO:
    tables = list(_get(blueprint, "tables", []) or [])
    relations = list(_get(blueprint, "relations", []) or [])

    buf = BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as archive:
        root = "generated-project"

        archive.writestr(f"{root}/app/__init__.py", "")
        archive.writestr(f"{root}/app/main.py", _render_main())
        archive.writestr(f"{root}/app/database.py", _render_database())
        archive.writestr(f"{root}/app/models.py", _render_models(tables, relations))
        archive.writestr(f"{root}/app/schemas.py", _render_schemas(tables))
        archive.writestr(f"{root}/app/routers/__init__.py", _render_routers_init(tables))

        for table in tables:
            table_name = str(_get(table, "name", "item"))
            router_name = _safe_python_name(table_name)
            archive.writestr(f"{root}/app/routers/{router_name}.py", _render_router(table))

        archive.writestr(f"{root}/requirements.txt", _render_requirements())
        archive.writestr(f"{root}/README.md", _render_readme())

    buf.seek(0)
    return buf


def generate_init_sql(blueprint: Any) -> str:
    return "-- generated by Aepra Forge"


def generate_sqlalchemy_models(blueprint: Any) -> str:
    tables = list(_get(blueprint, "tables", []) or [])
    relations = list(_get(blueprint, "relations", []) or [])
    return _render_models(tables, relations)


def generate_docker_compose(blueprint: Any) -> str:
    return dedent(
        """
        version: '3.9'
        services:
          app:
            build: .
            ports:
              - "8000:8000"
            command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
        """
    ).strip() + "\n"
