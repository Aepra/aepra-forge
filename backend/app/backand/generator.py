"""Adapter module exposing generator entrypoints under unified backand package.

This file re-exports functions from the existing `backand_product` generator
implementation so other parts of the codebase can import from
`app.backand.generator` while we migrate the implementation later.
"""

from app.backand_product import build_fastapi_project_zip, generate_init_sql, generate_sqlalchemy_models, generate_docker_compose

__all__ = [
    "build_fastapi_project_zip",
    "generate_init_sql",
    "generate_sqlalchemy_models",
    "generate_docker_compose",
]
