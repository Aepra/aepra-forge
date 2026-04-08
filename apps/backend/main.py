from fastapi import FastAPI
from fastapi.responses import StreamingResponse
import io
import zipfile

from app.schemas.blueprint import ProjectBlueprint
from app.services.generator.sql_builder import generate_init_sql
from app.services.generator.models_builder import generate_sqlalchemy_models
from app.services.generator.docker_builder import generate_docker_compose

app = FastAPI(
    title="Aepra-Forge API",
    description="The Professional Backend Generator",
    version="1.0.0"
)

@app.get("/")
async def root():
    return {"status": "success", "message": "Aepra-Forge Backend is Online!"}

@app.post("/api/v1/generator/build")
async def build_infrastructure(blueprint: ProjectBlueprint):
    # 1. Generate Core Files
    sql_code = generate_init_sql(blueprint)
    python_models = generate_sqlalchemy_models(blueprint)
    docker_code = generate_docker_compose(blueprint)

    # Helper function untuk menentukan tipe data Python di Pydantic
    def get_py_type(sql_type: str) -> str:
        if sql_type == 'uuid': return 'UUID'
        if sql_type == 'timestamp': return 'datetime'
        if 'int' in sql_type: return 'int'
        if 'bool' in sql_type: return 'bool'
        return 'str'
    
    # --- 1. GENERATE SCHEMAS (Pydantic) ---
    schemas_code = """from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID

"""
    for table in blueprint.tables:
        t_cap = table.name.capitalize()
        # Base Schema
        schemas_code += f"class {t_cap}Base(BaseModel):\n"
        for col in table.columns:
            if col.name == "id": continue # ID tidak diinput oleh user
            py_type = get_py_type(col.type)
            schemas_code += f"    {col.name}: Optional[{py_type}] = None\n"
        
        # Create Schema & Response Schema
        schemas_code += f"\nclass {t_cap}Create({t_cap}Base):\n    pass\n\n"
        schemas_code += f"class {t_cap}({t_cap}Base):\n    id: UUID\n    class Config:\n        from_attributes = True\n\n"

    # --- 2. GENERATE CRUD (Database Operations) ---
    crud_code = """from sqlalchemy.orm import Session
from app.models import models
from app.schemas import schemas

"""
    for table in blueprint.tables:
        t_name = table.name
        t_cap = t_name.capitalize()
        crud_code += f"def get_{t_name}(db: Session, skip: int = 0, limit: int = 100):\n"
        crud_code += f"    return db.query(models.{t_cap}).offset(skip).limit(limit).all()\n\n"
        crud_code += f"def create_{t_name}(db: Session, item: schemas.{t_cap}Create):\n"
        crud_code += f"    db_item = models.{t_cap}(**item.model_dump(exclude_unset=True))\n"
        crud_code += f"    db.add(db_item)\n    db.commit()\n    db.refresh(db_item)\n    return db_item\n\n"

    # --- 3. GENERATE API ROUTES (Endpoints) ---
    routes_code = """from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.crud import crud
from app.schemas import schemas

router = APIRouter()

"""
    for table in blueprint.tables:
        t_name = table.name
        t_cap = t_name.capitalize()
        routes_code += f"@router.get('/{t_name}', response_model=List[schemas.{t_cap}], tags=['{t_cap}'])\n"
        routes_code += f"def read_{t_name}(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):\n"
        routes_code += f"    return crud.get_{t_name}(db, skip=skip, limit=limit)\n\n"
        
        routes_code += f"@router.post('/{t_name}', response_model=schemas.{t_cap}, tags=['{t_cap}'])\n"
        routes_code += f"def create_{t_name}(item: schemas.{t_cap}Create, db: Session = Depends(get_db)):\n"
        routes_code += f"    return crud.create_{t_name}(db=db, item=item)\n\n"

    # --- 4. GENERATE MAIN.PY (Entry Point) ---
    main_code = """from fastapi import FastAPI
from app.api.routes import router
from app.models import models
from app.core.database import engine

# Sinkronisasi tabel ke database
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Professional Auto-Generated API")

# Sambungkan semua rute API
app.include_router(router, prefix="/api/v1")

@app.get("/")
def root():
    return {"message": "System is Professional and Modular! Buka /docs untuk mengelola database."}
"""

    # --- 5. GENERATE DATABASE.PY ---
    database_code = """from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

SQLALCHEMY_DATABASE_URL = "postgresql://admin:password123@db:5432/main_db"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
"""

    # --- FILE PENDUKUNG ---
    dockerfile_code = """FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
"""
    requirements_code = "fastapi\nuvicorn\nsqlalchemy\npsycopg2-binary\npydantic\n"

    readme_text = """# 🚀 Professional Clean Architecture API

Proyek ini telah digenerate menggunakan pola arsitektur modular.
Jalankan dengan: `docker-compose up -d --build`
Lalu buka: http://localhost:8000/docs
"""

    # --- BUNGKUS KE ZIP DENGAN STRUKTUR MODULAR ---
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        # File Root
        zip_file.writestr("docker-compose.yml", docker_code)
        zip_file.writestr("Dockerfile", dockerfile_code)
        zip_file.writestr("init.sql", sql_code)
        zip_file.writestr("requirements.txt", requirements_code)
        zip_file.writestr("README.md", readme_text)
        
        # Entry point aplikasi
        zip_file.writestr("app/__init__.py", "")
        zip_file.writestr("app/main.py", main_code)
        
        # Folder Core
        zip_file.writestr("app/core/__init__.py", "")
        zip_file.writestr("app/core/database.py", database_code)
        
        # Folder Models
        zip_file.writestr("app/models/__init__.py", "")
        zip_file.writestr("app/models/models.py", python_models)
        
        # Folder Schemas
        zip_file.writestr("app/schemas/__init__.py", "")
        zip_file.writestr("app/schemas/schemas.py", schemas_code)
        
        # Folder CRUD 
        zip_file.writestr("app/crud/__init__.py", "")
        zip_file.writestr("app/crud/crud.py", crud_code)
        
        # Folder API Routers asdasda 
        zip_file.writestr("app/api/__init__.py", "")
        zip_file.writestr("app/api/routes.py", routes_code)

    zip_buffer.seek(0)
    return StreamingResponse(
        zip_buffer, 
        media_type="application/zip", 
        headers={"Content-Disposition": "attachment; filename=aepra-professional-api.zip"}
    )