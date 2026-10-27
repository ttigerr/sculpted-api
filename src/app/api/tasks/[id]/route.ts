import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { tasks } from "@/db/schema/tasks";
import { HttpError } from "@/lib/http-error";
import { withAuth } from "@/lib/with-auth";

type TaskRow = typeof tasks.$inferSelect;

const idSchema = z.string().uuid();
const patchSchema = z
  .object({
    title: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    isCompleted: z.boolean().optional(),
    scheduledAt: z.coerce.date().nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "no fields to update",
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

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = withAuth<Ctx>(async (req, user, { params }) => {
  const { id } = await params;
  const taskId = idSchema.parse(id);
  const body = patchSchema.parse(await req.json());

  const [row] = await db
    .update(tasks)
    .set(body)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)))
    .returning();

  if (!row) throw new HttpError(404, "Task not found");
  return NextResponse.json(toTaskDto(row));
});

export const DELETE = withAuth<Ctx>(async (_req, user, { params }) => {
  const { id } = await params;
  const taskId = idSchema.parse(id);

  const deleted = await db
    .delete(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)))
    .returning({ id: tasks.id });

  if (deleted.length === 0) throw new HttpError(404, "Task not found");
  return new Response(null, { status: 204 });
});
