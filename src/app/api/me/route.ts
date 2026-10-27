import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema/users";
import { HttpError } from "@/lib/http-error";
import { withAuth } from "@/lib/with-auth";

type UserRow = typeof users.$inferSelect;

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD");
const timeSchema = z
  .string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, "must be HH:MM or HH:MM:SS");

const patchSchema = z
  .object({
    email: z.string().email().nullable().optional(),
    name: z.string().nullable().optional(),
    gender: z.string().nullable().optional(),
    birthday: dateSchema.nullable().optional(),
    timezone: z.string().min(1).optional(),
    reminderTime: timeSchema.nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "no fields to update",
  });

function toProfileDto(row: UserRow) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    gender: row.gender,
    birthday: row.birthday,
    timezone: row.timezone,
    reminderTime: row.reminderTime,
    createdAt: row.createdAt,
  };
}

export const GET = withAuth(async (_req, user) => {
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  if (!row) throw new HttpError(404, "User not found");
  return NextResponse.json(toProfileDto(row));
});

export const PATCH = withAuth(async (req, user) => {
  const body = patchSchema.parse(await req.json());

  const [row] = await db
    .update(users)
    .set(body)
    .where(eq(users.id, user.id))
    .returning();

  return NextResponse.json(toProfileDto(row));
});
