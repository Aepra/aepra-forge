import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/config/auth";
import { FileSystemProjectRepository } from "@/lib/storage/filesystem";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const requestCounter = new Map<string, { count: number; resetAt: number }>();
const projectRepository = new FileSystemProjectRepository();

const getRequestKey = (request: Request, email?: string) => {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || "local";
  return email ? `${email}:${ip}` : ip;
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

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email;
    if (!email) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const rateLimitKey = getRequestKey(request, email);
    if (isRateLimited(rateLimitKey)) {
      return NextResponse.json({ success: false, error: "Too many requests" }, { status: 429 });
    }

    const url = new URL(request.url);
    const framework = (url.searchParams.get("framework") || "fastapi").toLowerCase();
    if (framework !== "fastapi") {
      return NextResponse.json(
        { success: false, error: "Framework is not supported yet. Use framework=fastapi" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null) as
      | {
          projectId?: string;
          tables?: Array<{
            id?: string;
            name?: string;
            columns?: Array<{
              id?: string;
              name?: string;
              type?: string;
              primary?: boolean;
              primaryKey?: boolean;
              nullable?: boolean;
              unique?: boolean;
              default?: string | null;
              length?: number | null;
            }>;
          }>;
          relations?: Array<{
            from_table?: string;
            from_column?: string;
            to_table?: string;
            to_column?: string;
            type?: string;
            on_delete?: string;
          }>;
        }
      | null;

    const buildBlueprintFromTables = (
      tables: NonNullable<NonNullable<typeof body>["tables"]>,
      relations: NonNullable<NonNullable<typeof body>["relations"]>,
    ) => ({
      tables: tables.map((table, index) => ({
        id: String(table.id || `table_${index + 1}`),
        name: String(table.name || `table_${index + 1}`),
        columns: Array.isArray(table.columns)
          ? table.columns.map((column, columnIndex) => ({
              name: String(column.name || `column_${columnIndex + 1}`),
              type: String(column.type || "string"),
              primary: column.primary === true || column.primaryKey === true,
              nullable: column.nullable !== false,
              unique: column.unique === true,
              default: column.default ?? null,
              length: typeof column.length === "number" ? column.length : null,
            }))
          : [],
      })),
      relations: relations.map((relation) => ({
        from_table: String(relation.from_table || ""),
        from_column: String(relation.from_column || ""),
        to_table: String(relation.to_table || ""),
        to_column: String(relation.to_column || ""),
        type: String(relation.type || "one-to-many"),
        on_delete: String(relation.on_delete || "cascade"),
      })),
      meta: {
        version: "1.0",
        engine: "sqlite",
      },
    });

    let blueprint: {
      tables: Array<Record<string, unknown>>;
      relations: Array<Record<string, unknown>>;
      meta: { version: string; engine: string };
    } | null = null;

    if (body?.projectId) {
      const project = await projectRepository.getProject(body.projectId);
      const sessionUserId = session?.user?.id;

      if (project && sessionUserId && project.owner_id === sessionUserId) {
        const tables = (project.schema.nodes as Array<{ id?: string; data?: { label?: string; columns?: unknown[] } }>) || [];
        const edges = (project.schema.edges as Array<{
          id?: string;
          source?: string;
          target?: string;
          sourceHandle?: string | null;
          targetHandle?: string | null;
        }>) || [];

        const tableNameByNodeId = new Map<string, string>();
        const convertedTables = tables.map((node, index) => {
          const tableName = String(node.data?.label || `table_${index + 1}`).trim().toLowerCase().replace(/\s+/g, "_");
          tableNameByNodeId.set(String(node.id || `table_${index + 1}`), tableName);

          return {
            id: String(node.id || `table_${index + 1}`),
            name: tableName,
            columns: Array.isArray(node.data?.columns)
              ? node.data.columns.map((column, columnIndex) => {
                  const typedColumn = column as {
                    id?: string;
                    name?: string;
                    type?: string;
                    primary?: boolean;
                    primaryKey?: boolean;
                    nullable?: boolean;
                    unique?: boolean;
                    default?: string | null;
                    length?: number | null;
                  };

                  return {
                    name: String(typedColumn.name || `column_${columnIndex + 1}`),
                    type: String(typedColumn.type || "string"),
                    primary: typedColumn.primary === true || typedColumn.primaryKey === true,
                    nullable: typedColumn.nullable !== false,
                    unique: typedColumn.unique === true,
                    default: typedColumn.default ?? null,
                    length: typeof typedColumn.length === "number" ? typedColumn.length : null,
                  };
                })
              : [],
          };
        });

        const convertedRelations = edges
          .map((edge) => {
            const sourceTable = tableNameByNodeId.get(String(edge.source || ""));
            const targetTable = tableNameByNodeId.get(String(edge.target || ""));

            if (!sourceTable || !targetTable) return null;

            return {
              from_table: sourceTable,
              from_column: String(edge.sourceHandle || ""),
              to_table: targetTable,
              to_column: String(edge.targetHandle || ""),
              type: "one-to-many",
              on_delete: "cascade",
            };
          })
          .filter(Boolean) as Array<Record<string, unknown>>;

        blueprint = {
          tables: convertedTables,
          relations: convertedRelations,
          meta: { version: "1.0", engine: "sqlite" },
        };
      }
    }

    if (!blueprint && Array.isArray(body?.tables) && Array.isArray(body?.relations)) {
      blueprint = buildBlueprintFromTables(body.tables, body.relations);
    }

    if (!blueprint) {
      return NextResponse.json({ success: false, error: "Missing project data" }, { status: 400 });
    }

    const backendBaseUrl = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
    const backendToken = process.env.AEPRA_BUILD_API_TOKEN;

    const upstreamResponse = await fetch(
      `${backendBaseUrl}/api/v1/generator/build?framework=${encodeURIComponent(framework)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(backendToken ? { "x-aepra-build-token": backendToken } : {}),
        },
        body: JSON.stringify(blueprint),
        cache: "no-store",
      }
    );

    if (!upstreamResponse.ok) {
      const detail = await upstreamResponse.text();
      return NextResponse.json(
        {
          success: false,
          error: "Failed to generate project",
          detail: detail.slice(0, 500),
        },
        { status: upstreamResponse.status }
      );
    }

    const zipBuffer = await upstreamResponse.arrayBuffer();
    const fileName = upstreamResponse.headers.get("content-disposition")?.match(/filename=([^;]+)/i)?.[1]?.replace(/\"/g, "") || `aepra-${framework}-project.zip`;

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename=${fileName}`,
      },
    });
  } catch (error) {
    console.error("Generator proxy error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
