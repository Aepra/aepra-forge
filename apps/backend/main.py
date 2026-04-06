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
    description="The Brain of The Hybrid Developer Platform",
    version="1.0.0"
)

@app.get("/")
async def root():
    return {"status": "success", "message": "Aepra-Forge Backend is Online!", "engine": "FastAPI"}

@app.post("/api/v1/generator/build")
async def build_infrastructure(blueprint: ProjectBlueprint):
    # 1. Generate core files
    sql_code = generate_init_sql(blueprint)
    python_models = generate_sqlalchemy_models(blueprint)
    docker_code = generate_docker_compose(blueprint)
    
    # --- BOILERPLATE KODE TAMBAHAN UNTUK PROJECT USER ---
    
    # Boilerplate untuk app/main.py
    app_main_code = """from fastapi import FastAPI

app = FastAPI(title="My Generated API")

@app.get("/")
def read_root():
    return {"message": "Welcome to your generated API! Start building in the /app/crud folder."}
"""

    # Boilerplate untuk app/core/database.py
    database_code = """from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Mengarah ke Docker PostgreSQL yang di-generate
SQLALCHEMY_DATABASE_URL = "postgresql://admin:password123@localhost:5432/main_db"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
"""

    # Dependencies untuk user
    requirements_code = """fastapi==0.103.2
uvicorn==0.23.2
sqlalchemy==2.0.21
psycopg2-binary==2.9.9
"""

    # 2. Siapkan ZIP
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        
        # --- INFRASTRUCTURE FILES ---
        zip_file.writestr("docker-compose.yml", docker_code)
        zip_file.writestr("init.sql", sql_code)
        zip_file.writestr("requirements.txt", requirements_code)
        
        # --- APP STRUCTURE ---
        zip_file.writestr("app/main.py", app_main_code)
        zip_file.writestr("app/models.py", python_models)
        zip_file.writestr("app/core/database.py", database_code)
        
        # --- EMPTY FOLDERS (Untuk user mulai ngoding) ---
        zip_file.writestr("app/crud/__init__.py", "# Tulis fungsi CRUD Anda di folder ini\n")
        zip_file.writestr("app/schemas/__init__.py", "# Tulis schema Pydantic Anda di folder ini\n")
        
        # --- README ---
        readme_text = """# 🚀 Your Generated Project

## Cara Memulai:
1. Nyalakan Database: `docker-compose up -d`
2. Install library Python: `pip install -r requirements.txt`
3. Jalankan Server API: `uvicorn app.main:app --reload`
4. Mulai tambahkan logika CRUD Anda di folder `app/crud/`!
"""
        zip_file.writestr("README.md", readme_text)

    # 3. Kirim ZIP ke user
    zip_buffer.seek(0)
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=my-generated-project.zip"}
    )