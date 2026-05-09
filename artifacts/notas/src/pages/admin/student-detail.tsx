import { Link, useParams } from "wouter";
import { ArrowLeft, BookOpenCheck, GaugeCircle, Loader2 } from "lucide-react";
import {
  useGetStudent,
  useGetStudentGrades,
} from "@workspace/api-client-react";
import { PageContainer, PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  evaluationTypeAccent,
  evaluationTypeLabel,
  formatDateShort,
  formatPercent,
  formatScore,
} from "@/lib/format";

export default function AdminStudentDetail() {
  const params = useParams<{ id: string }>();
  const studentId = Number(params.id);
  const studentQuery = useGetStudent(studentId);
  const gradesQuery = useGetStudentGrades(studentId);

  if (!Number.isFinite(studentId)) return null;

  const student = studentQuery.data;
  const grades = gradesQuery.data ?? [];

  return (
    <PageContainer>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link href="/admin/estudiantes">
          <ArrowLeft className="h-4 w-4" />
          Volver a estudiantes
        </Link>
      </Button>
      {studentQuery.isLoading || !student ? (
        <Skeleton className="h-12 w-72 mb-6" />
      ) : (
        <PageHeader
          eyebrow={student.grade ?? "Estudiante"}
          title={student.fullName}
          description={`Usuario: ${student.username}${student.email ? ` · ${student.email}` : ""}`}
        />
      )}

      {student && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatCard
            label="Promedio general"
            value={formatPercent(student.averageScore)}
            icon={GaugeCircle}
          />
          <StatCard
            label="Notas registradas"
            value={String(student.evaluationsTaken)}
            icon={BookOpenCheck}
            accent="accent"
          />
          <StatCard
            label="Pendientes"
            value={String(grades.filter((g) => g.grade == null || g.grade.score == null).length)}
            icon={Loader2}
            accent="warning"
          />
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="font-serif">Calificaciones</CardTitle>
        </CardHeader>
        <CardContent>
          {gradesQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : grades.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              Este estudiante todavía no tiene evaluaciones asignadas.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {grades.map((row) => {
                const score = row.grade?.score ?? null;
                const max = row.evaluation.maxScore;
                const pct = score == null ? null : (score / max) * 100;
                return (
                  <div
                    key={row.evaluation.id}
                    className="flex items-center gap-3 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/admin/evaluaciones/${row.evaluation.id}`}
                          className="font-medium truncate hover:underline"
                        >
                          {row.evaluation.title}
                        </Link>
                        <Badge
                          variant="outline"
                          className={`border-transparent ${evaluationTypeAccent(row.evaluation.type)}`}
                        >
                          {evaluationTypeLabel(row.evaluation.type)}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {formatDateShort(row.evaluation.examDate)}
                        {row.grade?.comment ? ` · ${row.grade.comment}` : ""}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-serif text-lg leading-tight">
                        {formatScore(score, max)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {pct == null ? "Sin nota" : formatPercent(pct)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
