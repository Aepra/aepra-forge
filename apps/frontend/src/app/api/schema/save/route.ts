import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Prisma } from "@prisma/client";

import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";

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

const getSessionIdentity = async () => {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return null;

  return {
    email,
    name: session.user?.name || null,
    image: session.user?.image || null,
  };
};

const sanitizeProjectName = (name: string) => name.trim().slice(0, 120);

export async function GET() {
  try {
    const identity = await getSessionIdentity();
    if (!identity) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: identity.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ success: true, data: [] });
    }

    const projects = await prisma.project.findMany({
      where: { user_id: user.id },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        name: true,
        created_at: true,
        schemas: {
          take: 1,
          orderBy: { created_at: "desc" },
          select: {
            id: true,
            version: true,
            created_at: true,
          },
        },
      },
    });

    const data = projects.map((project) => ({
      id: project.id,
      name: project.name,
      createdAt: project.created_at,
      latestSchema: project.schemas[0]
        ? {
            id: project.schemas[0].id,
            version: project.schemas[0].version,
            createdAt: project.schemas[0].created_at,
          }
        : null,
    }));

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

    const { projectName, nodes, edges } = body as {
      projectName: string;
      projectId?: string;
      nodes: unknown[];
      edges: unknown[];
    };

    const cleanProjectName = sanitizeProjectName(projectName);

    // Pastikan user login tersinkron di database aplikasi.
    const user = await prisma.user.upsert({
      where: { email: identity.email },
      update: {},
      create: {
        email: identity.email,
        password_hash: "oauth_only",
      },
    });

    const result = await prisma.$transaction(async (tx) => {
      let project;

      if (body.projectId) {
        const existingProject = await tx.project.findFirst({
          where: {
            id: body.projectId,
            user_id: user.id,
          },
          select: {
            id: true,
            name: true,
          },
        });

        if (!existingProject) {
          throw new Error("PROJECT_NOT_FOUND");
        }

        project = await tx.project.update({
          where: { id: existingProject.id },
          data: { name: cleanProjectName },
          select: { id: true, name: true, created_at: true },
        });
      } else {
        project = await tx.project.create({
          data: {
            name: cleanProjectName,
            user_id: user.id,
          },
          select: { id: true, name: true, created_at: true },
        });
      }

      const latestSchema = await tx.schema.findFirst({
        where: { project_id: project.id },
        orderBy: { version: "desc" },
        select: { version: true },
      });

      const schema = await tx.schema.create({
        data: {
          project_id: project.id,
          schema_json: { nodes, edges } as Prisma.InputJsonValue,
          version: (latestSchema?.version ?? 0) + 1,
        },
        select: { id: true, version: true, created_at: true },
      });

      return {
        project,
        schema,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        projectId: result.project.id,
        projectName: result.project.name,
        schemaId: result.schema.id,
        schemaVersion: result.schema.version,
        savedAt: result.schema.created_at,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "PROJECT_NOT_FOUND") {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 });
    }

    console.error("Schema save error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}