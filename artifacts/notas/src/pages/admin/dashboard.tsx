import { Link } from "wouter";
import {
  BookOpenCheck,
  CalendarClock,
  ClipboardList,
  GaugeCircle,
  Trophy,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useGetAdminDashboard } from "@workspace/api-client-react";
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
} from "@/lib/format";

export default function AdminDashboard() {
  const { data, isLoading } = useGetAdminDashboard();

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Panel del profesor"
        title="Resumen de tu clase"
        description="Una mirada rápida al rendimiento general, las calificaciones pendientes y las próximas evaluaciones."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/admin/estudiantes">Ver estudiantes</Link>
            </Button>
            <Button asChild>
              <Link href="/admin/evaluaciones">Nueva evaluación</Link>
            </Button>
          </>
        }
      />

      {isLoading || !data ? (
        <DashboardSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              label="Estudiantes"
              value={String(data.totalStudents)}
              icon={Users}
              hint="Total de la clase"
            />
            <StatCard
              label="Evaluaciones"
              value={String(data.totalEvaluations)}
              icon={ClipboardList}
              hint={`${data.upcomingEvaluations} por venir`}
              accent="accent"
            />
            <StatCard
              label="Promedio general"
              value={formatPercent(data.classAverage)}
              icon={GaugeCircle}
              hint="Notas registradas"
              accent="accent"
            />
            <StatCard
              label="Notas pendientes"
              value={String(data.pendingGradings)}
              icon={BookOpenCheck}
              hint="A registrar"
              accent={data.pendingGradings > 0 ? "warning" : "primary"}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="font-serif">Próximas evaluaciones</CardTitle>
              </CardHeader>
              <CardContent>
                {data.upcoming.length === 0 ? (
                  <EmptyState
                    icon={CalendarClock}
                    title="No hay evaluaciones programadas"
                    description="Creá una evaluación para que aparezcan aquí y se notifique a tus estudiantes."
                    action={
                      <Button asChild size="sm">
                        <Link href="/admin/evaluaciones">Crear evaluación</Link>
                      </Button>
                    }
                  />
                ) : (
                  <div className="space-y-2">
                    {data.upcoming.map((ev) => (
                      <Link
                        key={ev.id}
                        href={`/admin/evaluaciones/${ev.id}`}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border hover-elevate"
                      >
                        <div className="hidden sm:flex flex-col items-center justify-center w-14 h-14 rounded-md bg-muted text-foreground">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            {formatDateShort(ev.examDate).split(" ")[1]}
                          </span>
                          <span className="font-serif text-xl leading-none">
                            {formatDateShort(ev.examDate).split(" ")[0]}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium truncate">{ev.title}</span>
                            <Badge
                              variant="outline"
                              className={`border-transparent ${evaluationTypeAccent(ev.type)}`}
                            >
                              {evaluationTypeLabel(ev.type)}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {formatDateShort(ev.examDate)} · sobre {ev.maxScore} pts
                          </div>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          {ev.gradedCount}/{ev.totalStudents} corregidas
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-serif flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-primary" />
                  Mejores promedios
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.topStudents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aún no hay notas suficientes para mostrar un ranking.
                  </p>
                ) : (
                  <ol className="space-y-2">
                    {data.topStudents.map((s, idx) => (
                      <li
                        key={s.studentId}
                        className="flex items-center gap-3 p-2 rounded-md hover-elevate"
                      >
                        <span className="w-6 text-center font-serif text-lg text-muted-foreground">
                          {idx + 1}
                        </span>
                        <Link
                          href={`/admin/estudiantes/${s.studentId}`}
                          className="flex-1 min-w-0 truncate font-medium"
                        >
                          {s.fullName}
                        </Link>
                        <Badge variant="secondary">
                          {formatPercent(s.averageScore)}
                        </Badge>
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="font-serif">Tipos de evaluación</CardTitle>
            </CardHeader>
            <CardContent>
              {data.evaluationTypeBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin evaluaciones aún.</p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.evaluationTypeBreakdown.map((t) => ({
                        type: evaluationTypeLabel(t.type),
                        cantidad: t.count,
                      }))}
                      margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="type"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                      />
                      <YAxis
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                      />
                      <Tooltip
                        cursor={{ fill: "hsl(var(--muted) / 0.5)" }}
                        contentStyle={{
                          background: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Bar
                        dataKey="cantidad"
                        radius={[6, 6, 0, 0]}
                        fill="hsl(var(--primary))"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </PageContainer>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-64" />
      <Skeleton className="h-72" />
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: typeof CalendarClock;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="text-center py-10 px-4">
      <div className="h-12 w-12 rounded-full bg-muted text-muted-foreground flex items-center justify-center mx-auto mb-3">
        <Icon className="h-6 w-6" />
      </div>
      <div className="font-serif text-lg">{title}</div>
      <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
