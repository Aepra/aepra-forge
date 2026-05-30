/**
 * Storage Layer - Type Definitions
 * 
 * Simple interfaces for project persistence.
 * No database required - uses the local filesystem.
 */

// ============================================================================
// Project Types
// ============================================================================

export interface SchemaData {
  nodes: unknown[];
  edges: unknown[];
}

export interface ProjectDocument {
  project_id: string;
  owner_id: string; // GitHub user ID
  name: string;
  created_at: string; // ISO-8601 UTC
  updated_at: string; // ISO-8601 UTC
  schema: SchemaData;
}

export interface ProjectSummary {
  project_id: string;
  owner_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectRepository {
  /**
   * Get a single project by ID
   */
  getProject(projectId: string): Promise<ProjectDocument | null>;

  /**
   * Save a project (create or update)
   */
  saveProject(project: ProjectDocument): Promise<void>;

  /**
   * Delete a project by ID
   */
  deleteProject(projectId: string): Promise<void>;

  /**
   * List all projects for an owner
   */
  listProjects(ownerId: string): Promise<ProjectSummary[]>;

  /**
   * Check if a project exists
   */
  exists(projectId: string): Promise<boolean>;
}
