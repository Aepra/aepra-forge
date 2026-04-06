from jinja2 import Template
from app.schemas.blueprint import ProjectBlueprint

def generate_sqlalchemy_models(blueprint: ProjectBlueprint) -> str:
    template_str = """from sqlalchemy import Column, String, Integer, Boolean, DateTime, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import declarative_base
import uuid

Base = declarative_base()

{% for table in tables %}
class {{ table.name.capitalize() }}(Base):
    __tablename__ = "{{ table.name }}"
    
{%- for col in table.columns %}
    {{ col.name }} = Column(
        {%- if col.type == 'uuid' %}UUID(as_uuid=True)
        {%- elif col.type == 'varchar' %}String{% if col.length %}({{ col.length }}){% endif %}
        {%- elif col.type == 'timestamp' %}DateTime
        {%- else %}String{% endif %}
        {%- if col.primary %}, primary_key=True{% endif %}
        {%- if col.unique %}, unique=True{% endif %}
        {%- if not col.nullable %}, nullable=False{% endif %}
        {%- if col.default == 'uuid_generate_v4()' or col.default == 'gen_random_uuid()' %}, default=uuid.uuid4{% endif %}
    )
{%- endfor %}
{% endfor %}
"""
    jinja_template = Template(template_str)
    return jinja_template.render(tables=blueprint.tables)