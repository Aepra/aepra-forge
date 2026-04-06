from pydantic import BaseModel, Field
from typing import List, Optional

# 1. Struktur Kolom (Column)
class ColumnSchema(BaseModel):
    name: str
    type: str
    primary: bool = False
    nullable: bool = True
    unique: bool = False
    default: Optional[str] = None
    length: Optional[int] = None

# 2. Struktur Tabel (Table)
class TableSchema(BaseModel):
    id: str
    name: str
    columns: List[ColumnSchema]

# 3. Struktur Relasi (Relation)
class RelationSchema(BaseModel):
    from_table: str
    from_column: str
    to_table: str
    to_column: str
    type: str  # contoh: "one-to-many"
    on_delete: str = "cascade"

# 4. Struktur Meta
class MetaSchema(BaseModel):
    version: str = "1.0"
    engine: str = "postgres"

# 5. MASTER SCHEMA (Struktur Utama JSON)
class ProjectBlueprint(BaseModel):
    tables: List[TableSchema]
    relations: List[RelationSchema] = []
    meta: MetaSchema