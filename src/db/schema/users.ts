import { sql } from "drizzle-orm";
import {
  pgTable,
  uuid,
  text,
  date,
  time,
  timestamp,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  b2cSub: text("b2c_sub").notNull().unique(),
  email: text("email"),
  name: text("name"),
  gender: text("gender"),
  birthday: date("birthday"),
  timezone: text("timezone").notNull().default("Asia/Vientiane"),
  reminderTime: time("reminder_time"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});
