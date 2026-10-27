import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { tasks } from "@/db/schema/tasks";
import { withAuth } from "@/lib/with-auth";

type TaskRow = typeof tasks.$inferSelect;

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  isCompleted: z.boolean().optional(),
  scheduledAt: z.coerce.date().nullable().optional(),
});

function toTaskDto(row: TaskRow) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    isCompleted: row.isCompleted,
    scheduledDate: row.scheduledAt?.toISOString() ?? null,
    creationDate: row.createdAt.toISOString(),
  };
}

export const GET = withAuth(async (_req, user) => {
  const rows = await db
    .select()
    .from(tasks)
    .where(eq(tasks.userId, user.id))
    .orderBy(desc(tasks.createdAt));

  return NextResponse.json(rows.map(toTaskDto));
});

export const POST = withAuth(async (req, user) => {
  const body = createSchema.parse(await req.json());

  const [row] = await db
    .insert(tasks)
    .values({
      userId: user.id,
      title: body.title,
      description: body.description ?? null,
      isCompleted: body.isCompleted ?? false,
      scheduledAt: body.scheduledAt ?? null,
    })
    .returning();

  return NextResponse.json(toTaskDto(row), { status: 201 });
});
