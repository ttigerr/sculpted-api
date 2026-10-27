import { createRealtime, rawSql } from "@neon/realtime/server";
import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

type HealthRow = { id: number; note: string };

export async function GET() {
  const sql = neon(process.env.DATABASE_URL!);
  await sql`CREATE TABLE IF NOT EXISTS health_check (id serial PRIMARY KEY, note text NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`;

  const dbName = new URL(process.env.DATABASE_URL!).pathname.replace(/^\//, "");

  const realtime = createRealtime({
    secret: process.env.NEON_REALTIME_SECRET!,
    db: dbName,
  });

  const sealed = await realtime.seal({
    query: rawSql<HealthRow>(
      "SELECT id, note FROM health_check ORDER BY id DESC LIMIT 5",
      [],
    ),
  });

  return NextResponse.json({
    ok: true,
    realtime_url: process.env.NEON_REALTIME_URL,
    db: dbName,
    sealed_query_present: Boolean(sealed),
  });
}
