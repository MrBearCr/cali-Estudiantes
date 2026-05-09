import { Router, type IRouter } from "express";
import { eq, sql, isNotNull, and, lt, gte } from "drizzle-orm";
import {
  db,
  evaluationsTable,
  gradesTable,
  studentsTable,
  usersTable,
} from "@workspace/db";
import { requireTeacher } from "../lib/auth";
import { serializeEvaluation } from "../lib/serializers";

const router: IRouter = Router();

router.get("/admin/dashboard", requireTeacher, async (_req, res) => {
  const [studentCountRow] = await db
    .select({ count: sql<string>`count(*)::text` })
    .from(studentsTable);
  const totalStudents = Number(studentCountRow?.count ?? 0);

  const evaluations = await db.select().from(evaluationsTable);
  const totalEvaluations = evaluations.length;

  const now = new Date();
  const upcomingEvaluations = evaluations.filter((e) => e.examDate > now).length;

  const grades = await db.select().from(gradesTable).where(isNotNull(gradesTable.score));
  const gradesByEval = new Map<number, number[]>();
  for (const g of grades) {
    if (g.score == null) continue;
    const list = gradesByEval.get(g.evaluationId) ?? [];
    list.push(Number(g.score));
    gradesByEval.set(g.evaluationId, list);
  }

  // pending gradings: past evaluations with missing grades
  let pendingGradings = 0;
  for (const ev of evaluations) {
    if (ev.examDate > now) continue;
    const graded = gradesByEval.get(ev.id)?.length ?? 0;
    pendingGradings += Math.max(0, totalStudents - graded);
  }

  // class average across all scored grades, normalized to %
  const evalMap = new Map(evaluations.map((e) => [e.id, e]));
  const percents: number[] = [];
  for (const g of grades) {
    if (g.score == null) continue;
    const ev = evalMap.get(g.evaluationId);
    if (!ev) continue;
    const max = Number(ev.maxScore) || 100;
    percents.push((Number(g.score) / max) * 100);
  }
  const classAverage = percents.length === 0
    ? null
    : Number((percents.reduce((a, b) => a + b, 0) / percents.length).toFixed(2));

  // breakdown by type
  const typeCounts = new Map<string, number>();
  for (const ev of evaluations) {
    typeCounts.set(ev.type, (typeCounts.get(ev.type) ?? 0) + 1);
  }
  const evaluationTypeBreakdown = Array.from(typeCounts.entries()).map(
    ([type, count]) => ({ type, count }),
  );

  // top students by % average
  const studentRows = await db
    .select({ student: studentsTable, user: usersTable })
    .from(studentsTable)
    .innerJoin(usersTable, eq(usersTable.id, studentsTable.userId));
  const topStudents = studentRows
    .map((r) => {
      const studentGrades = grades.filter((g) => g.studentId === r.student.id);
      const ps: number[] = [];
      for (const g of studentGrades) {
        if (g.score == null) continue;
        const ev = evalMap.get(g.evaluationId);
        if (!ev) continue;
        const max = Number(ev.maxScore) || 100;
        ps.push((Number(g.score) / max) * 100);
      }
      const avg = ps.length === 0 ? null : ps.reduce((a, b) => a + b, 0) / ps.length;
      return {
        studentId: r.student.id,
        fullName: r.user.fullName,
        averageScore: avg,
      };
    })
    .filter((r): r is { studentId: number; fullName: string; averageScore: number } => r.averageScore != null)
    .sort((a, b) => b.averageScore - a.averageScore)
    .slice(0, 5)
    .map((r) => ({ ...r, averageScore: Number(r.averageScore.toFixed(2)) }));

  // upcoming evaluations (next 5)
  const upcomingRows = await db
    .select()
    .from(evaluationsTable)
    .where(gte(evaluationsTable.examDate, now))
    .orderBy(sql`${evaluationsTable.examDate} asc`)
    .limit(5);
  const upcoming = upcomingRows.map((ev) => {
    const evGrades = gradesByEval.get(ev.id) ?? [];
    const avg = evGrades.length === 0
      ? null
      : Number(
          (evGrades.reduce((a, b) => a + b, 0) / evGrades.length).toFixed(2),
        );
    return serializeEvaluation(ev, {
      gradedCount: evGrades.length,
      totalStudents,
      averageScore: avg,
    });
  });

  res.json({
    totalStudents,
    totalEvaluations,
    upcomingEvaluations,
    pendingGradings,
    classAverage,
    evaluationTypeBreakdown,
    topStudents,
    upcoming,
  });
});

export default router;
