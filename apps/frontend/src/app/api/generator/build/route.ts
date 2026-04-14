import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/config/auth";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const requestCounter = new Map<string, { count: number; resetAt: number }>();

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

    const backendBaseUrl = process.env.BACKEND_INTERNAL_URL || process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
    const backendToken = process.env.AEPRA_BUILD_API_TOKEN;
    const payloadText = await request.text();

    const upstreamResponse = await fetch(
      `${backendBaseUrl}/api/v1/generator/build?framework=${encodeURIComponent(framework)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(backendToken ? { "x-aepra-build-token": backendToken } : {}),
        },
        body: payloadText,
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
