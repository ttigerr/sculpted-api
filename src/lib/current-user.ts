import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema/users";

export type CurrentUser = { id: string; b2cSub: string };

export async function getOrCreateUserBySub(sub: string): Promise<CurrentUser> {
  const existing = await db
    .select({ id: users.id, b2cSub: users.b2cSub })
    .from(users)
    .where(eq(users.b2cSub, sub))
    .limit(1);

  if (existing.length > 0) return existing[0];

  const [created] = await db
    .insert(users)
    .values({ b2cSub: sub })
    .returning({ id: users.id, b2cSub: users.b2cSub });

  return created;
}
