from jinja2 import Template
from app.schemas.blueprint import ProjectBlueprint

def generate_docker_compose(blueprint: ProjectBlueprint) -> str:
    template_str = """version: '3.8'

services:
  db:
    image: {{ meta.engine }}:16-alpine
    container_name: aepra_generated_db
    restart: always
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: password123
      POSTGRES_DB: main_db
    ports:
      - "5432:5432"
    volumes:
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
      - pgdata:/var/lib/postgresql/data

  # --- SERVER API (FASTAPI) DI DALAM DOCKER ---
  api:
    build: .
    container_name: aepra_generated_api
    restart: always
    ports:
      - "8000:8000"
    depends_on:
      - db
    volumes:
      - .:/app # Supaya kalau kodingan diedit, otomatis reload!

volumes:
  pgdata:
"""
    jinja_template = Template(template_str)
    return jinja_template.render(meta=blueprint.meta)