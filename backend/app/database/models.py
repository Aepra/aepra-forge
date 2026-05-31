"""SQLAlchemy models for Aepra-Forge database"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, JSON, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Session

Base = declarative_base()


class Project(Base):
    """Project model for storing database schemas"""
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(String(255), unique=True, index=True, nullable=False)
    owner_id = Column(String(255), index=True, nullable=False)
    name = Column(String(120), nullable=False)
    nodes = Column(JSON, nullable=False, default=list)
    edges = Column(JSON, nullable=False, default=list)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            "project_id": self.project_id,
            "owner_id": self.owner_id,
            "name": self.name,
            "nodes": self.nodes,
            "edges": self.edges,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
