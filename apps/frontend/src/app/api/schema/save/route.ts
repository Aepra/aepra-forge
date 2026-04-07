import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectName, nodes, edges } = body;

    // Pastikan user admin ada
    const user = await prisma.user.upsert({
      where: { email: 'admin@aepra.forge' },
      update: {},
      create: {
        email: 'admin@aepra.forge',
        password_hash: 'default_pass',
      },
    });

    // Simpan Project & Schema
    const project = await prisma.project.create({
      data: {
        name: projectName,
        user_id: user.id,
        schemas: {
          create: {
            schema_json: { nodes, edges },
            version: 1,
          }
        }
      },
      include: { schemas: true }
    });

    return NextResponse.json({ success: true, data: project });
  } catch (error: any) {
    console.error("DB Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}