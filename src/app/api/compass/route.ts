import { NextResponse } from "next/server";
import { and, between, eq, gte, asc } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { compassEntries } from "@/db/schema/compass-entries";
import { withAuth } from "@/lib/with-auth";

type CompassRow = typeof compassEntries.$inferSelect;

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "must be YYYY-MM-DD");
const scoreSchema = z.number().int().min(0).max(10);

const upsertSchema = z.object({
  creationDate: dateSchema,
  virtue1: z.string().min(1),
  virtue1Score: scoreSchema,
  virtue1Note: z.string().optional(),
  virtue2: z.string().min(1),
  virtue2Score: scoreSchema,
  virtue2Note: z.string().optional(),
  virtue3: z.string().min(1),
  virtue3Score: scoreSchema,
  virtue3Note: z.string().optional(),
  overallScore: scoreSchema,
});

function toCompassDto(row: CompassRow) {
  return {
    id: row.id,
    creationDate: row.entryDate,
    virtue1: row.virtue1,
    virtue1Score: row.virtue1Score,
    virtue1Note: row.virtue1Note ?? undefined,
    virtue2: row.virtue2,
    virtue2Score: row.virtue2Score,
    virtue2Note: row.virtue2Note ?? undefined,
    virtue3: row.virtue3,
    virtue3Score: row.virtue3Score,
    virtue3Note: row.virtue3Note ?? undefined,
    overallScore: row.overallScore,
  };
}

export const GET = withAuth(async (req, user) => {
  const url = new URL(req.url);
  const query = z
    .object({ fromDate: dateSchema, toDate: dateSchema.optional() })
    .parse({
      fromDate: url.searchParams.get("fromDate"),
      toDate: url.searchParams.get("toDate") ?? undefined,
    });

  const dateFilter = query.toDate
    ? between(compassEntries.entryDate, query.fromDate, query.toDate)
    : gte(compassEntries.entryDate, query.fromDate);

  const rows = await db
    .select()
    .from(compassEntries)
    .where(and(eq(compassEntries.userId, user.id), dateFilter))
    .orderBy(asc(compassEntries.entryDate));

  return NextResponse.json(rows.map(toCompassDto));
});

export const POST = withAuth(async (req, user) => {
  const body = upsertSchema.parse(await req.json());

  const values = {
    userId: user.id,
    entryDate: body.creationDate,
    virtue1: body.virtue1,
    virtue2: body.virtue2,
    virtue3: body.virtue3,
    virtue1Score: body.virtue1Score,
    virtue2Score: body.virtue2Score,
    virtue3Score: body.virtue3Score,
    virtue1Note: body.virtue1Note ?? null,
    virtue2Note: body.virtue2Note ?? null,
    virtue3Note: body.virtue3Note ?? null,
    overallScore: body.overallScore,
  };

  const [row] = await db
    .insert(compassEntries)
    .values(values)
    .onConflictDoUpdate({
      target: [compassEntries.userId, compassEntries.entryDate],
      set: {
        virtue1: values.virtue1,
        virtue2: values.virtue2,
        virtue3: values.virtue3,
        virtue1Score: values.virtue1Score,
        virtue2Score: values.virtue2Score,
        virtue3Score: values.virtue3Score,
        virtue1Note: values.virtue1Note,
        virtue2Note: values.virtue2Note,
        virtue3Note: values.virtue3Note,
        overallScore: values.overallScore,
        updatedAt: new Date(),
      },
    })
    .returning();

  return NextResponse.json(toCompassDto(row));
});
