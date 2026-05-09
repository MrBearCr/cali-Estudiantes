import {
  pgTable,
  serial,
  integer,
  text,
  timestamp,
  numeric,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { evaluationsTable } from "./evaluations";
import { studentsTable } from "./students";

export const gradesTable = pgTable(
  "grades",
  {
    id: serial("id").primaryKey(),
    evaluationId: integer("evaluation_id")
      .notNull()
      .references(() => evaluationsTable.id, { onDelete: "cascade" }),
    studentId: integer("student_id")
      .notNull()
      .references(() => studentsTable.id, { onDelete: "cascade" }),
    score: numeric("score", { precision: 6, scale: 2 }),
    comment: text("comment"),
    gradedAt: timestamp("graded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("grades_evaluation_student_uq").on(table.evaluationId, table.studentId),
  ],
);

export type Grade = typeof gradesTable.$inferSelect;
export type InsertGrade = typeof gradesTable.$inferInsert;
