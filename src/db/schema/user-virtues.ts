import { pgTable, uuid, text, integer, primaryKey } from "drizzle-orm/pg-core";
import { users } from "./users";

export const userVirtues = pgTable(
  "user_virtues",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    virtue: text("virtue").notNull(),
    position: integer("position").notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.position] })],
);
