import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { randomUUID } from "crypto";

import { authOptions } from "@/config/auth";
import { FileSystemProjectRepository } from "@/lib/storage/filesystem";
import type { ProjectDocument } from "@/lib/storage/types";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const requestCounter = new Map<string, { count: number; resetAt: number }>();

const getRequestKey = (request: Request) => {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || "local";
  return ip;
};

const isRateLimited = (key: string) => {
  const now = Date.now();
  const entry = requestCounter.get(key);

  if (!entry || now > entry.resetAt) {
    requestCounter.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return true;
  }

  entry.count += 1;
  requestCounter.set(key, entry);
  return false;
};

const isValidSchemaPayload = (value: unknown) => {
  if (!value || typeof value !== "object") return false;
  const body = value as { projectName?: unknown; projectId?: unknown; nodes?: unknown; edges?: unknown };
  if (typeof body.projectName !== "string" || body.projectName.trim().length === 0) return false;
  if (body.projectName.length > 120) return false;
  if (body.projectId != null && (typeof body.projectId !== "string" || body.projectId.trim().length === 0)) return false;
  if (!Array.isArray(body.nodes) || !Array.isArray(body.edges)) return false;
  if (body.nodes.length > 500 || body.edges.length > 2000) return false;
  return true;
};

interface SessionIdentity {
  github_id: number;
  username: string;
  email: string;
  avatar_url: string;
}

const getSessionIdentity = async (): Promise<SessionIdentity | null> => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  return {
    github_id: parseInt(session.user.id, 10) || 0,
    username: session.user.name || "unknown",
    email: session.user.email || "",
    avatar_url: session.user.image || "",
  };
};

const sanitizeProjectName = (name: string) => name.trim().slice(0, 120);
const projectRepository = new FileSystemProjectRepository();

export async function GET(request: Request) {
  try {
    const identity = await getSessionIdentity();
    if (!identity) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");

    console.log("[GET /api/schema/save]", {
      projectId: projectId || "list",
      ownerId: identity.github_id.toString(),
      username: identity.username,
    });

    if (projectId) {
      const project = await projectRepository.getProject(projectId);
      if (!project || project.owner_id !== identity.github_id.toString()) {
        console.warn("[GET /api/schema/save] Project not found", {
          projectId,
          found: !!project,
          ownerMatch: project?.owner_id === identity.github_id.toString(),
        });
        return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        data: {
          projectId: project.project_id,
          projectName: project.name,
          ownerId: project.owner_id,
          createdAt: project.created_at,
          updatedAt: project.updated_at,
          nodes: project.schema.nodes,
          edges: project.schema.edges,
        },
      });
    }

    const summaries = await projectRepository.listProjects(identity.github_id.toString());
    console.log("[GET /api/schema/save] Listed projects", {
      count: summaries.length,
      ownerId: identity.github_id.toString(),
    });

    const data = [] as Array<{
      id: string;
      projectId: string;
      name: string;
      createdAt: string;
      updatedAt: string;
      tablesCount: number;
      relationsCount: number;
      isBlank: boolean;
    }>;

    for (const summary of summaries) {
      const project = await projectRepository.getProject(summary.project_id);
      data.push({
        id: summary.project_id,
        projectId: summary.project_id,
        name: summary.name,
        createdAt: summary.created_at,
        updatedAt: summary.updated_at,
        tablesCount: project?.schema.nodes.length || 0,
        relationsCount: project?.schema.edges.length || 0,
        isBlank: (project?.schema.nodes.length || 0) === 0,
      });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Schema list error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const rateLimitKey = getRequestKey(request);
    if (isRateLimited(rateLimitKey)) {
      return NextResponse.json({ success: false, error: "Too many requests" }, { status: 429 });
    }

    const identity = await getSessionIdentity();
    if (!identity) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    if (!isValidSchemaPayload(body)) {
      return NextResponse.json({ success: false, error: "Invalid payload" }, { status: 400 });
    }

    const { projectName, projectId, nodes, edges } = body as {
      projectName: string;
      projectId?: string;
      nodes: unknown[];
      edges: unknown[];
    };

    const cleanProjectName = sanitizeProjectName(projectName);
    const ownerId = identity.github_id.toString();

    console.log("[POST /api/schema/save]", {
      projectId,
      projectName: cleanProjectName,
      ownerId,
      github_id: identity.github_id,
      username: identity.username,
      nodesCount: nodes.length,
      edgesCount: edges.length,
    });

    let project: ProjectDocument;
    const now = new Date().toISOString();

    if (projectId) {
      const existingProject = await projectRepository.getProject(projectId);
      if (!existingProject || existingProject.owner_id !== ownerId) {
        console.error("[POST /api/schema/save] Project not found or ownership mismatch", {
          projectId,
          existingProject: !!existingProject,
          existingOwnerId: existingProject?.owner_id,
          currentOwnerId: ownerId,
        });
        return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
      }

      project = {
        ...existingProject,
        name: cleanProjectName,
        updated_at: now,
        schema: {
          nodes,
          edges,
        },
      };
    } else {
      const newProjectId = `proj_${randomUUID().slice(0, 8)}`;
      project = {
        project_id: newProjectId,
        owner_id: ownerId,
        name: cleanProjectName,
        created_at: now,
        updated_at: now,
        schema: {
          nodes,
          edges,
        },
      };
    }

    await projectRepository.saveProject(project);

    return NextResponse.json({
      success: true,
      data: {
        projectId: project.project_id,
        projectName: project.name,
        savedAt: project.updated_at,
      },
    });
  } catch (error: unknown) {
    console.error("Schema save error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const identity = await getSessionIdentity();
    if (!identity) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");
    if (!projectId) {
      return NextResponse.json({ success: false, error: "Missing projectId" }, { status: 400 });
    }

    const ownerId = identity.github_id.toString();

    const project = await projectRepository.getProject(projectId);
    if (!project || project.owner_id !== ownerId) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    }

    await projectRepository.deleteProject(projectId);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Schema delete error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}