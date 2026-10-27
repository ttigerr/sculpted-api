import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";

export async function GET() {
  const sql = neon(process.env.DATABASE_URL!);
  await sql`CREATE TABLE IF NOT EXISTS health_check (id serial PRIMARY KEY, note text NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`;
  const inserted = await sql`INSERT INTO health_check (note) VALUES (${"pinged at " + new Date().toISOString()}) RETURNING id, note, created_at`;
  const [{ now }] = (await sql`SELECT now() as now`) as Array<{ now: string }>;
  const rows = await sql`SELECT id, note, created_at FROM health_check ORDER BY id DESC LIMIT 3`;
  return NextResponse.json({ ok: true, now, inserted: inserted[0], recent: rows });
}
