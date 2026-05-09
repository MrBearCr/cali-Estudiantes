import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { eq, sql, inArray, and, isNotNull } from "drizzle-orm";
import {
  db,
  usersTable,
  studentsTable,
  gradesTable,
  evaluationsTable,
} from "@workspace/db";
import {
  CreateStudentBody,
  UpdateStudentBody,
} from "@workspace/api-zod";
import { requireAuth, requireTeacher } from "../lib/auth";
import { serializeStudent } from "../lib/serializers";

const router: IRouter = Router();

interface AggregateRow {
  studentId: number;
  evaluationsTaken: number;
  averageScore: number | null;
}

async function loadAggregates(studentIds: number[]): Promise<Map<number, AggregateRow>> {
  if (studentIds.length === 0) return new Map();
  const rows = await db
    .select({
      studentId: gradesTable.studentId,
      taken: sql<string>`count(${gradesTable.score})::text`,
      avg: sql<string | null>`avg(${gradesTable.score} / ${evaluationsTable.maxScore} * 100)::text`,
    })
    .from(gradesTable)
    .innerJoin(evaluationsTable, eq(evaluationsTable.id, gradesTable.evaluationId))
    .where(
      and(inArray(gradesTable.studentId, studentIds), isNotNull(gradesTable.score)),
    )
    .groupBy(gradesTable.studentId);

  const map = new Map<number, AggregateRow>();
  for (const r of rows) {
    map.set(r.studentId, {
      studentId: r.studentId,
      evaluationsTaken: Number(r.taken),
      averageScore: r.avg == null ? null : Number(Number(r.avg).toFixed(2)),
    });
  }
  return map;
}

router.get("/students", requireTeacher, async (_req, res) => {
  const rows = await db
    .select({ student: studentsTable, user: usersTable })
    .from(studentsTable)
    .innerJoin(usersTable, eq(usersTable.id, studentsTable.userId))
    .orderBy(usersTable.fullName);
  const ids = rows.map((r) => r.student.id);
  const aggregates = await loadAggregates(ids);
  res.json(
    rows.map((r) => {
      const agg = aggregates.get(r.student.id);
      return serializeStudent(r.student, r.user, {
        averageScore: agg?.averageScore ?? null,
        evaluationsTaken: agg?.evaluationsTaken ?? 0,
      });
    }),
  );
});

router.post("/students", requireTeacher, async (req, res) => {
  const parsed = CreateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Datos inválidos", issues: parsed.error.issues });
    return;
  }
  const { username, password, fullName, email, grade } = parsed.data;
  const normUsername = username.toLowerCase().trim();
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, normUsername))
    .limit(1);
  if (existing) {
    res.status(409).json({ message: "Ese nombre de usuario ya existe" });
    return;
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(usersTable)
    .values({
      username: normUsername,
      passwordHash,
      fullName,
      role: "student",
      email: email ?? null,
    })
    .returning();
  if (!user) {
    res.status(500).json({ message: "No se pudo crear el usuario" });
    return;
  }
  const [student] = await db
    .insert(studentsTable)
    .values({ userId: user.id, grade: grade ?? null })
    .returning();
  if (!student) {
    res.status(500).json({ message: "No se pudo crear el estudiante" });
    return;
  }
  res
    .status(201)
    .json(
      serializeStudent(student, user, { averageScore: null, evaluationsTaken: 0 }),
    );
});

router.get("/students/:studentId", requireAuth, async (req, res) => {
  const studentId = Number(req.params["studentId"]);
  if (!Number.isFinite(studentId)) {
    res.status(400).json({ message: "Id inválido" });
    return;
  }
  const user = req.sessionUser!;
  if (user.role !== "teacher" && user.studentId !== studentId) {
    res.status(403).json({ message: "No autorizado" });
    return;
  }
  const [row] = await db
    .select({ student: studentsTable, user: usersTable })
    .from(studentsTable)
    .innerJoin(usersTable, eq(usersTable.id, studentsTable.userId))
    .where(eq(studentsTable.id, studentId))
    .limit(1);
  if (!row) {
    res.status(404).json({ message: "Estudiante no encontrado" });
    return;
  }
  const aggregates = await loadAggregates([studentId]);
  const agg = aggregates.get(studentId);
  res.json(
    serializeStudent(row.student, row.user, {
      averageScore: agg?.averageScore ?? null,
      evaluationsTaken: agg?.evaluationsTaken ?? 0,
    }),
  );
});

router.patch("/students/:studentId", requireTeacher, async (req, res) => {
  const studentId = Number(req.params["studentId"]);
  if (!Number.isFinite(studentId)) {
    res.status(400).json({ message: "Id inválido" });
    return;
  }
  const parsed = UpdateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Datos inválidos" });
    return;
  }
  const [row] = await db
    .select({ student: studentsTable, user: usersTable })
    .from(studentsTable)
    .innerJoin(usersTable, eq(usersTable.id, studentsTable.userId))
    .where(eq(studentsTable.id, studentId))
    .limit(1);
  if (!row) {
    res.status(404).json({ message: "Estudiante no encontrado" });
    return;
  }
  const userUpdates: Record<string, unknown> = {};
  if (parsed.data.fullName != null) userUpdates["fullName"] = parsed.data.fullName;
  if (parsed.data.email !== undefined) userUpdates["email"] = parsed.data.email ?? null;
  if (parsed.data.password) {
    userUpdates["passwordHash"] = await bcrypt.hash(parsed.data.password, 10);
  }
  if (Object.keys(userUpdates).length > 0) {
    await db.update(usersTable).set(userUpdates).where(eq(usersTable.id, row.user.id));
  }
  const studentUpdates: Record<string, unknown> = {};
  if (parsed.data.grade !== undefined) studentUpdates["grade"] = parsed.data.grade ?? null;
  if (Object.keys(studentUpdates).length > 0) {
    await db.update(studentsTable).set(studentUpdates).where(eq(studentsTable.id, studentId));
  }
  const [updated] = await db
    .select({ student: studentsTable, user: usersTable })
    .from(studentsTable)
    .innerJoin(usersTable, eq(usersTable.id, studentsTable.userId))
    .where(eq(studentsTable.id, studentId))
    .limit(1);
  if (!updated) {
    res.status(404).json({ message: "Estudiante no encontrado" });
    return;
  }
  const aggregates = await loadAggregates([studentId]);
  const agg = aggregates.get(studentId);
  res.json(
    serializeStudent(updated.student, updated.user, {
      averageScore: agg?.averageScore ?? null,
      evaluationsTaken: agg?.evaluationsTaken ?? 0,
    }),
  );
});

router.delete("/students/:studentId", requireTeacher, async (req, res) => {
  const studentId = Number(req.params["studentId"]);
  if (!Number.isFinite(studentId)) {
    res.status(400).json({ message: "Id inválido" });
    return;
  }
  const [row] = await db
    .select()
    .from(studentsTable)
    .where(eq(studentsTable.id, studentId))
    .limit(1);
  if (!row) {
    res.status(404).json({ message: "Estudiante no encontrado" });
    return;
  }
  await db.delete(usersTable).where(eq(usersTable.id, row.userId));
  res.status(204).end();
});

router.get("/students/:studentId/grades", requireAuth, async (req, res) => {
  const studentId = Number(req.params["studentId"]);
  if (!Number.isFinite(studentId)) {
    res.status(400).json({ message: "Id inválido" });
    return;
  }
  const user = req.sessionUser!;
  if (user.role !== "teacher" && user.studentId !== studentId) {
    res.status(403).json({ message: "No autorizado" });
    return;
  }
  const rows = await db
    .select({ evaluation: evaluationsTable, grade: gradesTable })
    .from(evaluationsTable)
    .leftJoin(
      gradesTable,
      and(
        eq(gradesTable.evaluationId, evaluationsTable.id),
        eq(gradesTable.studentId, studentId),
      ),
    )
    .orderBy(sql`${evaluationsTable.examDate} desc`);

  const evIds = rows.map((r) => r.evaluation.id);
  const aggMap = new Map<number, { graded: number; total: number; avg: number | null }>();
  if (evIds.length > 0) {
    const totalStudentsResult = await db
      .select({ count: sql<string>`count(*)::text` })
      .from(studentsTable);
    const totalStudents = Number(totalStudentsResult[0]?.count ?? 0);
    const grouped = await db
      .select({
        evaluationId: gradesTable.evaluationId,
        graded: sql<string>`count(${gradesTable.score})::text`,
        avg: sql<string | null>`avg(${gradesTable.score})::text`,
      })
      .from(gradesTable)
      .where(
        and(inArray(gradesTable.evaluationId, evIds), isNotNull(gradesTable.score)),
      )
      .groupBy(gradesTable.evaluationId);
    for (const id of evIds) {
      aggMap.set(id, { graded: 0, total: totalStudents, avg: null });
    }
    for (const g of grouped) {
      aggMap.set(g.evaluationId, {
        graded: Number(g.graded),
        total: totalStudents,
        avg: g.avg == null ? null : Number(Number(g.avg).toFixed(2)),
      });
    }
  }

  res.json(
    rows.map((r) => {
      const a = aggMap.get(r.evaluation.id) ?? { graded: 0, total: 0, avg: null };
      return {
        evaluation: {
          id: r.evaluation.id,
          title: r.evaluation.title,
          description: r.evaluation.description,
          type: r.evaluation.type,
          examDate: r.evaluation.examDate.toISOString(),
          maxScore: Number(r.evaluation.maxScore),
          weight: Number(r.evaluation.weight),
          createdAt: r.evaluation.createdAt.toISOString(),
          gradedCount: a.graded,
          totalStudents: a.total,
          averageScore: a.avg,
        },
        grade: r.grade
          ? {
              id: r.grade.id,
              evaluationId: r.grade.evaluationId,
              studentId: r.grade.studentId,
              score: r.grade.score == null ? null : Number(r.grade.score),
              comment: r.grade.comment,
              gradedAt: r.grade.gradedAt ? r.grade.gradedAt.toISOString() : null,
            }
          : null,
      };
    }),
  );
});

export default router;
