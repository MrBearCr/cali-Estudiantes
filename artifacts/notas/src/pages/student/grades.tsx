import {
  useGetMyGrades,
  getGetMyGradesQueryKey,
  GradeWithEvaluation,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { PageContainer, PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  evaluationTypeAccent,
  evaluationTypeLabel,
  formatDateShort,
  formatPercent,
  formatScore,
} from "@/lib/format";

export default function StudentGrades() {
  const { user } = useAuth();
  const { data, isLoading } = useGetMyGrades({
    query: {
      queryKey: getGetMyGradesQueryKey(),
      enabled: user?.role === "student",
    },
  });

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Mis notas"
        title="Calificaciones"
        description="Listado de todas tus evaluaciones y los resultados publicados por tu profesor."
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Aún no hay evaluaciones publicadas.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {data.map((row: GradeWithEvaluation) => {
                const score = row.grade?.score ?? null;
                const max = row.evaluation.maxScore;
                const pct = score == null ? null : (score / max) * 100;
                const classAvg = row.evaluation.averageScore;
                return (
                  <div key={row.evaluation.id} className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3 items-center p-4 hover-elevate">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">{row.evaluation.title}</span>
                        <Badge
                          variant="outline"
                          className={`border-transparent ${evaluationTypeAccent(row.evaluation.type)}`}
                        >
                          {evaluationTypeLabel(row.evaluation.type)}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {formatDateShort(row.evaluation.examDate)} · sobre {max} pts
                        {row.evaluation.weight != null ? ` · peso ${row.evaluation.weight}%` : ""}
                      </div>
                      {row.grade?.comment ? (
                        <div className="text-sm mt-1 italic text-muted-foreground">
                          “{row.grade.comment}”
                        </div>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <div className="font-serif text-xl leading-none">
                        {formatScore(score, max)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {pct == null ? "Pendiente" : formatPercent(pct)}
                      </div>
                    </div>
                    <div className="hidden md:block text-right text-xs text-muted-foreground w-32">
                      Promedio clase
                      <div className="text-sm text-foreground">
                        {classAvg == null ? "—" : `${formatScore(classAvg, max)}`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
