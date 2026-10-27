import { NextResponse } from "next/server";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { userVirtues } from "@/db/schema/user-virtues";
import { withAuth } from "@/lib/with-auth";

const putSchema = z.object({
  virtues: z.array(z.string().min(1)).min(1).max(10),
});

export const GET = withAuth(async (_req, user) => {
  const rows = await db
    .select({ virtue: userVirtues.virtue, position: userVirtues.position })
    .from(userVirtues)
    .where(eq(userVirtues.userId, user.id))
    .orderBy(asc(userVirtues.position));

  return NextResponse.json({ virtues: rows.map((r) => r.virtue) });
});

export const PUT = withAuth(async (req, user) => {
  const body = putSchema.parse(await req.json());

  const rows = body.virtues.map((virtue, position) => ({
    userId: user.id,
    virtue,
    position,
  }));

  await db.batch([
    db.delete(userVirtues).where(eq(userVirtues.userId, user.id)),
    db.insert(userVirtues).values(rows),
  ]);

  return NextResponse.json({ virtues: body.virtues });
});
