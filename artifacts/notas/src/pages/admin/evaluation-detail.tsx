import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { ArrowLeft, Save, GaugeCircle, Users, BookOpenCheck } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetEvaluation,
  useUpsertGrade,
  getGetEvaluationQueryKey,
  getGetAdminDashboardQueryKey,
  getListEvaluationsQueryKey,
  getListStudentsQueryKey,
} from "@workspace/api-client-react";
import { PageContainer, PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  evaluationTypeAccent,
  evaluationTypeLabel,
  formatDate,
  formatPercent,
  initialsOf,
} from "@/lib/format";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface RowDraft {
  scoreInput: string;
  commentInput: string;
  saving: boolean;
}

export default function AdminEvaluationDetail() {
  const params = useParams<{ id: string }>();
  const evaluationId = Number(params.id);
  const { data, isLoading } = useGetEvaluation(evaluationId);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<Record<number, RowDraft>>({});

  useEffect(() => {
    if (!data) return;
    setDrafts((prev) => {
      const next: Record<number, RowDraft> = { ...prev };
      for (const g of data.grades) {
        if (next[g.studentId]) continue;
        next[g.studentId] = {
          scoreInput: g.score == null ? "" : String(g.score),
          commentInput: g.comment ?? "",
          saving: false,
        };
      }
      return next;
    });
  }, [data]);

  const upsert = useUpsertGrade();

  if (!Number.isFinite(evaluationId)) return null;

  function setDraft(studentId: number, patch: Partial<RowDraft>) {
    setDrafts((prev) => ({
      ...prev,
      [studentId]: {
        scoreInput: prev[studentId]?.scoreInput ?? "",
        commentInput: prev[studentId]?.commentInput ?? "",
        saving: prev[studentId]?.saving ?? false,
        ...patch,
      },
    }));
  }

  async function saveRow(studentId: number) {
    if (!data) return;
    const draft = drafts[studentId];
    if (!draft) return;
    const trimmed = draft.scoreInput.trim();
    let score: number | null = null;
    if (trimmed !== "") {
      const n = Number(trimmed);
      if (!Number.isFinite(n) || n < 0 || n > data.evaluation.maxScore) {
        toast({
          title: "Nota inválida",
          description: `Debe estar entre 0 y ${data.evaluation.maxScore}.`,
          variant: "destructive",
        });
        return;
      }
      score = n;
    }
    setDraft(studentId, { saving: true });
    try {
      await upsert.mutateAsync({
        evaluationId,
        data: {
          studentId,
          score,
          comment: draft.commentInput.trim() || undefined,
        },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getGetEvaluationQueryKey(evaluationId) }),
        queryClient.invalidateQueries({ queryKey: getListEvaluationsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() }),
        queryClient.invalidateQueries({ queryKey: getGetAdminDashboardQueryKey() }),
      ]);
      toast({ title: "Nota guardada" });
    } catch {
      toast({ title: "No se pudo guardar", variant: "destructive" });
    } finally {
      setDraft(studentId, { saving: false });
    }
  }

  const ev = data?.evaluation;

  return (
    <PageContainer>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link href="/admin/evaluaciones">
          <ArrowLeft className="h-4 w-4" />
          Volver a evaluaciones
        </Link>
      </Button>
      {isLoading || !ev ? (
        <Skeleton className="h-12 w-72 mb-6" />
      ) : (
        <PageHeader
          eyebrow={
            <span className={`px-2 py-0.5 rounded-md text-xs normal-case tracking-normal ${evaluationTypeAccent(ev.type)}`}>
              {evaluationTypeLabel(ev.type)}
            </span>
          }
          title={ev.title}
          description={`${formatDate(ev.examDate)} · sobre ${ev.maxScore} pts · peso ${ev.weight}%`}
        />
      )}

      {ev && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatCard
            label="Estudiantes"
            value={String(ev.totalStudents)}
            icon={Users}
          />
          <StatCard
            label="Notas registradas"
            value={`${ev.gradedCount}/${ev.totalStudents}`}
            icon={BookOpenCheck}
            accent="accent"
          />
          <StatCard
            label="Promedio"
            value={formatPercent(ev.averageScore == null ? null : (ev.averageScore / ev.maxScore) * 100)}
            icon={GaugeCircle}
            accent="primary"
          />
        </div>
      )}

      {ev?.description ? (
        <Card className="mb-4">
          <CardContent className="py-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1">
              Descripción
            </div>
            <p className="text-sm whitespace-pre-line">{ev.description}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="font-serif">Calificaciones</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading || !data ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : data.grades.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">
              No hay estudiantes registrados todavía.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {data.grades.map((g) => {
                const draft = drafts[g.studentId];
                const max = data.evaluation.maxScore;
                return (
                  <div
                    key={g.studentId}
                    className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto] items-center gap-3 py-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                          {initialsOf(g.studentName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="font-medium truncate">{g.studentName}</div>
                        {g.gradedAt ? (
                          <div className="text-xs text-muted-foreground">
                            Guardado · {new Date(g.gradedAt).toLocaleDateString("es")}
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground">Sin nota</div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={max}
                        step={0.5}
                        placeholder="Nota"
                        value={draft?.scoreInput ?? ""}
                        onChange={(e) => setDraft(g.studentId, { scoreInput: e.target.value })}
                        className="w-24"
                      />
                      <span className="text-sm text-muted-foreground">/ {max}</span>
                    </div>

                    <Input
                      placeholder="Comentario (opcional)"
                      value={draft?.commentInput ?? ""}
                      onChange={(e) => setDraft(g.studentId, { commentInput: e.target.value })}
                    />

                    <Button
                      size="sm"
                      onClick={() => saveRow(g.studentId)}
                      disabled={draft?.saving}
                    >
                      <Save className="h-4 w-4" />
                      {draft?.saving ? "Guardando" : "Guardar"}
                    </Button>
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
