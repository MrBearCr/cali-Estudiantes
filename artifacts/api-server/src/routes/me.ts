import { Router, type IRouter } from "express";
import { eq, sql, and, isNotNull, inArray } from "drizzle-orm";
import {
  db,
  evaluationsTable,
  gradesTable,
  studentsTable,
} from "@workspace/db";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

function buildNotification(ev: {
  id: number;
  title: string;
  type: string;
  examDate: Date;
  description: string | null;
}) {
  const now = Date.now();
  const days = Math.round((ev.examDate.getTime() - now) / (1000 * 60 * 60 * 24));
  let severity: "info" | "warning" | "urgent" | "past" = "info";
  if (days < 0) severity = "past";
  else if (days < 3) severity = "urgent";
  else if (days <= 7) severity = "warning";
  const typeLabel = labelForType(ev.type);
  let body: string;
  if (days < 0) body = `Esta ${typeLabel.toLowerCase()} ya finalizó.`;
  else if (days === 0) body = `${typeLabel} programada para hoy.`;
  else if (days === 1) body = `${typeLabel} programada para mañana.`;
  else body = `${typeLabel} en ${days} días.`;
  return {
    id: ev.id,
    evaluationId: ev.id,
    title: ev.title,
    body,
    type: ev.type,
    examDate: ev.examDate.toISOString(),
    daysUntil: days,
    severity,
  };
}

function labelForType(type: string): string {
  switch (type) {
    case "parcial":
      return "Parcial";
    case "recuperativo":
      return "Recuperativo";
    case "rezagado":
      return "Rezagado";
    case "examen_final":
      return "Examen final";
    case "quiz":
      return "Quiz";
    case "tarea":
      return "Tarea";
    default:
      return "Evaluación";
  }
}

router.get("/me/grades", requireAuth, async (req, res) => {
  const user = req.sessionUser!;
  if (user.role !== "student" || user.studentId == null) {
    res.json([]);
    return;
  }
  const studentId = user.studentId;
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
  const aggMap = new Map<number, { graded: number; avg: number | null }>();
  let totalStudents = 0;
  if (evIds.length > 0) {
    const [tot] = await db
      .select({ count: sql<string>`count(*)::text` })
      .from(studentsTable);
    totalStudents = Number(tot?.count ?? 0);
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
    for (const id of evIds) aggMap.set(id, { graded: 0, avg: null });
    for (const g of grouped) {
      aggMap.set(g.evaluationId, {
        graded: Number(g.graded),
        avg: g.avg == null ? null : Number(Number(g.avg).toFixed(2)),
      });
    }
  }

  res.json(
    rows.map((r) => {
      const a = aggMap.get(r.evaluation.id) ?? { graded: 0, avg: null };
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
          totalStudents,
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

router.get("/me/notifications", requireAuth, async (_req, res) => {
  const evaluations = await db
    .select()
    .from(evaluationsTable)
    .orderBy(sql`${evaluationsTable.examDate} asc`);
  const notifications = evaluations
    .map((ev) => buildNotification(ev))
    .sort((a, b) => {
      // upcoming first (positive days asc), then past (negative days desc)
      if (a.daysUntil >= 0 && b.daysUntil < 0) return -1;
      if (b.daysUntil >= 0 && a.daysUntil < 0) return 1;
      if (a.daysUntil >= 0) return a.daysUntil - b.daysUntil;
      return b.daysUntil - a.daysUntil;
    });
  res.json(notifications);
});

router.get("/me/dashboard", requireAuth, async (req, res) => {
  const user = req.sessionUser!;
  if (user.role !== "student" || user.studentId == null) {
    res.status(403).json({ message: "Sólo disponible para estudiantes" });
    return;
  }
  const studentId = user.studentId;

  const evaluations = await db
    .select()
    .from(evaluationsTable)
    .orderBy(sql`${evaluationsTable.examDate} desc`);
  const grades = await db
    .select()
    .from(gradesTable)
    .where(eq(gradesTable.studentId, studentId));
  const gradeMap = new Map(grades.map((g) => [g.evaluationId, g]));

  const evalMap = new Map(evaluations.map((e) => [e.id, e]));

  const scoredPercents: number[] = [];
  for (const g of grades) {
    if (g.score == null) continue;
    const ev = evalMap.get(g.evaluationId);
    if (!ev) continue;
    const max = Number(ev.maxScore) || 100;
    scoredPercents.push((Number(g.score) / max) * 100);
  }
  const avg = scoredPercents.length === 0
    ? null
    : Number(
        (scoredPercents.reduce((a, b) => a + b, 0) / scoredPercents.length).toFixed(2),
      );
  const best = scoredPercents.length === 0
    ? null
    : Number(Math.max(...scoredPercents).toFixed(2));
  const worst = scoredPercents.length === 0
    ? null
    : Number(Math.min(...scoredPercents).toFixed(2));

  const now = Date.now();
  let upcoming = 0;
  let pending = 0;
  for (const ev of evaluations) {
    const isPast = ev.examDate.getTime() < now;
    const g = gradeMap.get(ev.id);
    if (!isPast) upcoming++;
    if (isPast && (!g || g.score == null)) pending++;
  }

  const recentGrades = evaluations
    .slice(0, 5)
    .map((ev) => {
      const g = gradeMap.get(ev.id);
      return {
        evaluation: {
          id: ev.id,
          title: ev.title,
          description: ev.description,
          type: ev.type,
          examDate: ev.examDate.toISOString(),
          maxScore: Number(ev.maxScore),
          weight: Number(ev.weight),
          createdAt: ev.createdAt.toISOString(),
          gradedCount: 0,
          totalStudents: 0,
          averageScore: null,
        },
        grade: g
          ? {
              id: g.id,
              evaluationId: g.evaluationId,
              studentId: g.studentId,
              score: g.score == null ? null : Number(g.score),
              comment: g.comment,
              gradedAt: g.gradedAt ? g.gradedAt.toISOString() : null,
            }
          : null,
      };
    });

  const upcomingNotifications = evaluations
    .map((ev) => buildNotification(ev))
    .filter((n) => n.daysUntil >= 0)
    .slice(0, 5);

  res.json({
    studentId,
    fullName: user.fullName,
    averageScore: avg,
    evaluationsTaken: scoredPercents.length,
    evaluationsPending: pending,
    upcomingCount: upcoming,
    bestScore: best,
    worstScore: worst,
    recentGrades,
    notifications: upcomingNotifications,
  });
});

export default router;
