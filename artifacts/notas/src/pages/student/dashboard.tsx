import { Link } from "wouter";
import { useGetMyDashboard } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { PageContainer, PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  evaluationTypeAccent,
  evaluationTypeLabel,
  formatDateShort,
  formatPercent,
  formatScore,
} from "@/lib/format";

export default function StudentDashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useGetMyDashboard();

  const gradedRows = (data?.recentGrades ?? []).filter(
    (row) => row.grade?.score != null,
  );

  return (
    <PageContainer>
      <PageHeader
        eyebrow={`Hola, ${user?.fullName.split(" ")[0] ?? ""}`}
        title="Tus notas"
        description="Estas son las calificaciones que tu profesor publicó para vos."
      />

      {isLoading || !data ? (
        <DashboardSkeleton />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="font-serif">Notas publicadas</CardTitle>
          </CardHeader>
          <CardContent>
            {gradedRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Cuando tu profesor publique notas, las verás aquí.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {gradedRows.map((row) => {
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
                            href="/estudiante/notas"
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
                          {pct == null ? "Pendiente" : formatPercent(pct)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/*
        Próximas versiones — secciones que dejamos pausadas:
        - KPIs (promedio, próximas evaluaciones, mejor nota, para mejorar)
        - Tarjeta lateral "Próximas fechas" con notificaciones
        - Botones de acceso rápido a "Ver todas las notas" y "Notificaciones"
        Ver el historial de Git para recuperarlas cuando se reactiven.
      */}
    </PageContainer>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-72" />
    </div>
  );
}
