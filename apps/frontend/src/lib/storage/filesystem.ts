/**
 * Storage Layer - Filesystem Implementation
 * 
 * Simple file-based storage for development.
 * Reads/writes JSON files to .local-storage/ directory.
 */

import { promises as fs } from "fs";
import { join } from "path";
import type {
  ProjectDocument,
  ProjectRepository,
  ProjectSummary,
} from "./types";

// ============================================================================
// Filesystem Project Repository
// ============================================================================

export class FileSystemProjectRepository implements ProjectRepository {
  private baseDir: string;

  constructor(baseDir: string = ".local-storage") {
    this.baseDir = baseDir;
  }

  private projectsDir(): string {
    return join(this.baseDir, "projects");
  }

  private projectPath(projectId: string): string {
    return join(this.projectsDir(), `${projectId}.json`);
  }

  async getProject(projectId: string): Promise<ProjectDocument | null> {
    try {
      const filePath = this.projectPath(projectId);
      const content = await fs.readFile(filePath, "utf-8");
      return JSON.parse(content) as ProjectDocument;
    } catch {
      return null;
    }
  }

  async saveProject(project: ProjectDocument): Promise<void> {
    const dirPath = this.projectsDir();
    await fs.mkdir(dirPath, { recursive: true });

    const filePath = this.projectPath(project.project_id);
    const content = JSON.stringify(project, null, 2);
    await fs.writeFile(filePath, content, "utf-8");
  }

  async deleteProject(projectId: string): Promise<void> {
    try {
      const filePath = this.projectPath(projectId);
      await fs.unlink(filePath);
    } catch {
      // File doesn't exist, ignore
    }
  }

  async listProjects(ownerId: string): Promise<ProjectSummary[]> {
    try {
      const dirPath = this.projectsDir();
      const files = await fs.readdir(dirPath);

      const summaries: ProjectSummary[] = [];

      for (const file of files) {
        if (!file.endsWith(".json")) continue;

        try {
          const filePath = join(dirPath, file);
          const content = await fs.readFile(filePath, "utf-8");
          const project = JSON.parse(content) as ProjectDocument;

          if (project.owner_id === ownerId) {
            summaries.push({
              project_id: project.project_id,
              owner_id: project.owner_id,
              name: project.name,
              created_at: project.created_at,
              updated_at: project.updated_at,
            });
          }
        } catch {
          // Skip malformed files
          continue;
        }
      }

      // Sort by updated_at descending
      summaries.sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

      return summaries;
    } catch {
      return [];
    }
  }

  async exists(projectId: string): Promise<boolean> {
    try {
      const filePath = this.projectPath(projectId);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}
