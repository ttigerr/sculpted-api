import { sql } from "drizzle-orm";
import {
  pgTable,
  serial,
  uuid,
  date,
  text,
  integer,
  timestamp,
  unique,
  check,
} from "drizzle-orm/pg-core";
import { users } from "./users";

// Score columns are 0-10. Confirm the range with the mobile developer before shipping.
const SCORE_MIN = 0;
const SCORE_MAX = 10;

export const compassEntries = pgTable(
  "compass_entries",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    entryDate: date("entry_date").notNull(),
    virtue1: text("virtue1"),
    virtue2: text("virtue2"),
    virtue3: text("virtue3"),
    virtue1Score: integer("virtue1_score"),
    virtue2Score: integer("virtue2_score"),
    virtue3Score: integer("virtue3_score"),
    virtue1Note: text("virtue1_note"),
    virtue2Note: text("virtue2_note"),
    virtue3Note: text("virtue3_note"),
    overallScore: integer("overall_score"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique("compass_entries_user_date_key").on(t.userId, t.entryDate),
    check(
      "compass_entries_virtue1_score_range",
      sql`${t.virtue1Score} IS NULL OR (${t.virtue1Score} BETWEEN ${sql.raw(String(SCORE_MIN))} AND ${sql.raw(String(SCORE_MAX))})`,
    ),
    check(
      "compass_entries_virtue2_score_range",
      sql`${t.virtue2Score} IS NULL OR (${t.virtue2Score} BETWEEN ${sql.raw(String(SCORE_MIN))} AND ${sql.raw(String(SCORE_MAX))})`,
    ),
    check(
      "compass_entries_virtue3_score_range",
      sql`${t.virtue3Score} IS NULL OR (${t.virtue3Score} BETWEEN ${sql.raw(String(SCORE_MIN))} AND ${sql.raw(String(SCORE_MAX))})`,
    ),
    check(
      "compass_entries_overall_score_range",
      sql`${t.overallScore} IS NULL OR (${t.overallScore} BETWEEN ${sql.raw(String(SCORE_MIN))} AND ${sql.raw(String(SCORE_MAX))})`,
    ),
  ],
);
