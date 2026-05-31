"""Projects API endpoints for backend"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session
from uuid import uuid4
from datetime import datetime
import json

from app.database.db import get_db
from app.database.models import Project

router = APIRouter(prefix="/api/projects", tags=["projects"])


class ProjectCreateRequest(BaseModel):
    """Request body for creating/updating project"""
    project_id: Optional[str] = None
    name: str
    nodes: list = []
    edges: list = []


@router.post("/save")
def save_project(
    request: ProjectCreateRequest,
    owner_id: str = Header(...),
    db: Session = Depends(get_db),
):
    """Save or update a project"""
    try:
        print(f"\n[POST /api/projects/save]")
        print(f"  Owner ID: {owner_id}")
        print(f"  Request: {request}")
        
        project_id = request.project_id
        name = request.name
        nodes = request.nodes or []
        edges = request.edges or []
        
        print(f"  Project ID: {project_id or 'NEW'}")
        print(f"  Name: {name}")
        print(f"  Nodes: {len(nodes)}")
        print(f"  Edges: {len(edges)}")
        
        # Validate inputs
        if not name or len(name.strip()) == 0:
            raise HTTPException(status_code=400, detail="Project name cannot be empty")
        
        if len(name) > 120:
            raise HTTPException(status_code=400, detail="Project name too long (max 120 chars)")
        
        if len(nodes) > 500:
            raise HTTPException(status_code=400, detail="Too many nodes (max 500)")
        
        if len(edges) > 2000:
            raise HTTPException(status_code=400, detail="Too many edges (max 2000)")

        # Check if updating existing project
        if project_id:
            print(f"  Updating existing project...")
            project = db.query(Project).filter(
                Project.project_id == project_id,
                Project.owner_id == owner_id
            ).first()
            
            if not project:
                print(f"  ✗ Project not found")
                raise HTTPException(status_code=404, detail="Project not found")
            
            # Update existing project
            project.name = name.strip()[:120]
            project.nodes = nodes
            project.edges = edges
            project.updated_at = datetime.utcnow()
        else:
            # Create new project
            print(f"  Creating new project...")
            project = Project(
                project_id=str(uuid4()),
                owner_id=owner_id,
                name=name.strip()[:120],
                nodes=nodes,
                edges=edges,
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            db.add(project)
        
        db.commit()
        db.refresh(project)
        
        print(f"✓ Project saved: {project.project_id} (owner: {owner_id})")
        
        return {
            "success": True,
            "data": project.to_dict()
        }
    
    except HTTPException as e:
        print(f"✗ HTTP Error: {e.status_code} - {e.detail}")
        raise e
    except Exception as e:
        db.rollback()
        print(f"✗ Error saving project: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
        
        return {
            "success": True,
            "data": project.to_dict()
        }
    
    except HTTPException as e:
        raise e
    except Exception as e:
        db.rollback()
        print(f"✗ Error saving project: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/list")
def list_projects(
    owner_id: str = Header(...),
    db: Session = Depends(get_db),
):
    """List all projects for owner"""
    try:
        print(f"\n[GET /api/projects/list]")
        print(f"  Owner ID: {owner_id}")
        
        projects = db.query(Project).filter(
            Project.owner_id == owner_id
        ).order_by(Project.updated_at.desc()).all()
        
        print(f"✓ Listed {len(projects)} projects for owner: {owner_id}")
        
        return {
            "success": True,
            "data": [p.to_dict() for p in projects]
        }
    
    except Exception as e:
        print(f"✗ Error listing projects: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{project_id}")
def get_project(
    project_id: str,
    owner_id: str = Header(...),
    db: Session = Depends(get_db),
):
    """Get a specific project"""
    try:
        project = db.query(Project).filter(
            Project.project_id == project_id,
            Project.owner_id == owner_id
        ).first()
        
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        print(f"✓ Retrieved project: {project_id}")
        
        return {
            "success": True,
            "data": project.to_dict()
        }
    
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"✗ Error getting project: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{project_id}")
def delete_project(
    project_id: str,
    owner_id: str = Header(...),
    db: Session = Depends(get_db),
):
    """Delete a project"""
    try:
        print(f"\n[DELETE /api/projects/{project_id}]")
        print(f"  Owner ID: {owner_id}")
        
        project = db.query(Project).filter(
            Project.project_id == project_id,
            Project.owner_id == owner_id
        ).first()
        
        if not project:
            print(f"  ✗ Project not found")
            raise HTTPException(status_code=404, detail="Project not found")
        
        db.delete(project)
        db.commit()
        
        print(f"✓ Project deleted from database: {project_id}")
        
        return {
            "success": True,
            "message": "Project deleted successfully"
        }
    
    except HTTPException as e:
        print(f"✗ HTTP Error: {e.status_code} - {e.detail}")
        raise e
    except Exception as e:
        db.rollback()
        print(f"✗ Error deleting project: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
