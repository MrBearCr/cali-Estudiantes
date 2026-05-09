import { Router, type IRouter } from "express";
import { eq, sql, inArray, and, isNotNull, gte } from "drizzle-orm";
import {
  db,
  evaluationsTable,
  studentsTable,
  usersTable,
  gradesTable,
} from "@workspace/db";
import {
  CreateEvaluationBody,
  UpdateEvaluationBody,
  UpsertGradeBody,
} from "@workspace/api-zod";
import { requireAuth, requireTeacher } from "../lib/auth";
import { serializeEvaluation } from "../lib/serializers";

const router: IRouter = Router();

async function getTotalStudents(): Promise<number> {
  const [row] = await db
    .select({ count: sql<string>`count(*)::text` })
    .from(studentsTable);
  return Number(row?.count ?? 0);
}

interface EvalAggregate {
  graded: number;
  avg: number | null;
}

async function loadEvaluationAggregates(
  evaluationIds: number[],
): Promise<Map<number, EvalAggregate>> {
  const map = new Map<number, EvalAggregate>();
  if (evaluationIds.length === 0) return map;
  for (const id of evaluationIds) map.set(id, { graded: 0, avg: null });
  const rows = await db
    .select({
      evaluationId: gradesTable.evaluationId,
      graded: sql<string>`count(${gradesTable.score})::text`,
      avg: sql<string | null>`avg(${gradesTable.score})::text`,
    })
    .from(gradesTable)
    .where(
      and(
        inArray(gradesTable.evaluationId, evaluationIds),
        isNotNull(gradesTable.score),
      ),
    )
    .groupBy(gradesTable.evaluationId);
  for (const r of rows) {
    map.set(r.evaluationId, {
      graded: Number(r.graded),
      avg: r.avg == null ? null : Number(Number(r.avg).toFixed(2)),
    });
  }
  return map;
}

router.get("/evaluations", requireAuth, async (_req, res) => {
  const evaluations = await db
    .select()
    .from(evaluationsTable)
    .orderBy(sql`${evaluationsTable.examDate} desc`);
  const aggregates = await loadEvaluationAggregates(evaluations.map((e) => e.id));
  const totalStudents = await getTotalStudents();
  res.json(
    evaluations.map((ev) => {
      const a = aggregates.get(ev.id) ?? { graded: 0, avg: null };
      return serializeEvaluation(ev, {
        gradedCount: a.graded,
        totalStudents,
        averageScore: a.avg,
      });
    }),
  );
});

router.post("/evaluations", requireTeacher, async (req, res) => {
  const parsed = CreateEvaluationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Datos inválidos", issues: parsed.error.issues });
    return;
  }
  const data = parsed.data;
  const [ev] = await db
    .insert(evaluationsTable)
    .values({
      title: data.title,
      description: data.description ?? null,
      type: data.type,
      examDate: data.examDate,
      maxScore: String(data.maxScore ?? 100),
      weight: String(data.weight ?? 10),
    })
    .returning();
  if (!ev) {
    res.status(500).json({ message: "No se pudo crear" });
    return;
  }
  const totalStudents = await getTotalStudents();
  res.status(201).json(
    serializeEvaluation(ev, {
      gradedCount: 0,
      totalStudents,
      averageScore: null,
    }),
  );
});

router.get("/evaluations/:evaluationId", requireAuth, async (req, res) => {
  const evaluationId = Number(req.params["evaluationId"]);
  if (!Number.isFinite(evaluationId)) {
    res.status(400).json({ message: "Id inválido" });
    return;
  }
  const [ev] = await db
    .select()
    .from(evaluationsTable)
    .where(eq(evaluationsTable.id, evaluationId))
    .limit(1);
  if (!ev) {
    res.status(404).json({ message: "Evaluación no encontrada" });
    return;
  }
  const studentRows = await db
    .select({ student: studentsTable, user: usersTable })
    .from(studentsTable)
    .innerJoin(usersTable, eq(usersTable.id, studentsTable.userId))
    .orderBy(usersTable.fullName);
  const grades = await db
    .select()
    .from(gradesTable)
    .where(eq(gradesTable.evaluationId, evaluationId));
  const gradeMap = new Map(grades.map((g) => [g.studentId, g]));
  const aggregates = await loadEvaluationAggregates([evaluationId]);
  const agg = aggregates.get(evaluationId) ?? { graded: 0, avg: null };
  res.json({
    evaluation: serializeEvaluation(ev, {
      gradedCount: agg.graded,
      totalStudents: studentRows.length,
      averageScore: agg.avg,
    }),
    grades: studentRows.map((r) => {
      const g = gradeMap.get(r.student.id);
      return {
        studentId: r.student.id,
        studentName: r.user.fullName,
        score: g?.score == null ? null : Number(g.score),
        comment: g?.comment ?? null,
        gradedAt: g?.gradedAt ? g.gradedAt.toISOString() : null,
      };
    }),
  });
});

router.patch("/evaluations/:evaluationId", requireTeacher, async (req, res) => {
  const evaluationId = Number(req.params["evaluationId"]);
  if (!Number.isFinite(evaluationId)) {
    res.status(400).json({ message: "Id inválido" });
    return;
  }
  const parsed = UpdateEvaluationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Datos inválidos" });
    return;
  }
  const updates: Record<string, unknown> = {};
  if (parsed.data.title != null) updates["title"] = parsed.data.title;
  if (parsed.data.description !== undefined) updates["description"] = parsed.data.description ?? null;
  if (parsed.data.type != null) updates["type"] = parsed.data.type;
  if (parsed.data.examDate != null) updates["examDate"] = parsed.data.examDate;
  if (parsed.data.maxScore != null) updates["maxScore"] = String(parsed.data.maxScore);
  if (parsed.data.weight != null) updates["weight"] = String(parsed.data.weight);
  if (Object.keys(updates).length > 0) {
    await db
      .update(evaluationsTable)
      .set(updates)
      .where(eq(evaluationsTable.id, evaluationId));
  }
  const [ev] = await db
    .select()
    .from(evaluationsTable)
    .where(eq(evaluationsTable.id, evaluationId))
    .limit(1);
  if (!ev) {
    res.status(404).json({ message: "Evaluación no encontrada" });
    return;
  }
  const totalStudents = await getTotalStudents();
  const aggregates = await loadEvaluationAggregates([evaluationId]);
  const agg = aggregates.get(evaluationId) ?? { graded: 0, avg: null };
  res.json(
    serializeEvaluation(ev, {
      gradedCount: agg.graded,
      totalStudents,
      averageScore: agg.avg,
    }),
  );
});

router.delete("/evaluations/:evaluationId", requireTeacher, async (req, res) => {
  const evaluationId = Number(req.params["evaluationId"]);
  if (!Number.isFinite(evaluationId)) {
    res.status(400).json({ message: "Id inválido" });
    return;
  }
  await db.delete(evaluationsTable).where(eq(evaluationsTable.id, evaluationId));
  res.status(204).end();
});

router.put("/evaluations/:evaluationId/grades", requireTeacher, async (req, res) => {
  const evaluationId = Number(req.params["evaluationId"]);
  if (!Number.isFinite(evaluationId)) {
    res.status(400).json({ message: "Id inválido" });
    return;
  }
  const parsed = UpsertGradeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Datos inválidos" });
    return;
  }
  const { studentId, score, comment } = parsed.data;
  const [ev] = await db
    .select()
    .from(evaluationsTable)
    .where(eq(evaluationsTable.id, evaluationId))
    .limit(1);
  if (!ev) {
    res.status(404).json({ message: "Evaluación no encontrada" });
    return;
  }
  const [student] = await db
    .select()
    .from(studentsTable)
    .where(eq(studentsTable.id, studentId))
    .limit(1);
  if (!student) {
    res.status(404).json({ message: "Estudiante no encontrado" });
    return;
  }
  const now = new Date();
  const scoreStr = score == null ? null : String(score);
  const [existing] = await db
    .select()
    .from(gradesTable)
    .where(
      and(
        eq(gradesTable.evaluationId, evaluationId),
        eq(gradesTable.studentId, studentId),
      ),
    )
    .limit(1);
  let row;
  if (existing) {
    [row] = await db
      .update(gradesTable)
      .set({
        score: scoreStr,
        comment: comment ?? null,
        gradedAt: score == null ? null : now,
      })
      .where(eq(gradesTable.id, existing.id))
      .returning();
  } else {
    [row] = await db
      .insert(gradesTable)
      .values({
        evaluationId,
        studentId,
        score: scoreStr,
        comment: comment ?? null,
        gradedAt: score == null ? null : now,
      })
      .returning();
  }
  if (!row) {
    res.status(500).json({ message: "No se pudo guardar" });
    return;
  }
  res.json({
    id: row.id,
    evaluationId: row.evaluationId,
    studentId: row.studentId,
    score: row.score == null ? null : Number(row.score),
    comment: row.comment,
    gradedAt: row.gradedAt ? row.gradedAt.toISOString() : null,
  });
});

router.get("/admin/upcoming", requireTeacher, async (_req, res) => {
  const now = new Date();
  const evaluations = await db
    .select()
    .from(evaluationsTable)
    .where(gte(evaluationsTable.examDate, now))
    .orderBy(sql`${evaluationsTable.examDate} asc`);
  const aggregates = await loadEvaluationAggregates(evaluations.map((e) => e.id));
  const totalStudents = await getTotalStudents();
  res.json(
    evaluations.map((ev) => {
      const a = aggregates.get(ev.id) ?? { graded: 0, avg: null };
      return serializeEvaluation(ev, {
        gradedCount: a.graded,
        totalStudents,
        averageScore: a.avg,
      });
    }),
  );
});

export default router;
