import {
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
  numeric,
} from "drizzle-orm/pg-core";

export const evaluationsTable = pgTable("evaluations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  type: varchar("type", { length: 32 }).notNull(),
  examDate: timestamp("exam_date", { withTimezone: true }).notNull(),
  maxScore: numeric("max_score", { precision: 6, scale: 2 }).notNull().default("100"),
  weight: numeric("weight", { precision: 6, scale: 2 }).notNull().default("10"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Evaluation = typeof evaluationsTable.$inferSelect;
export type InsertEvaluation = typeof evaluationsTable.$inferInsert;
