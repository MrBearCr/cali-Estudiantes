import { useState } from "react";
import { Link } from "wouter";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ClipboardList, Plus, ArrowRight, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListEvaluations,
  useCreateEvaluation,
  useDeleteEvaluation,
  getListEvaluationsQueryKey,
  getGetAdminDashboardQueryKey,
  getGetUpcomingEvaluationsQueryKey,
  ApiError,
} from "@workspace/api-client-react";
import { PageContainer, PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  evaluationTypeAccent,
  evaluationTypeLabel,
  formatDateShort,
  formatPercent,
} from "@/lib/format";

const TYPES = [
  "parcial",
  "recuperativo",
  "rezagado",
  "examen_final",
  "quiz",
  "tarea",
] as const;

const schema = z.object({
  title: z.string().min(2, "Ingresá un título"),
  description: z.string().optional(),
  type: z.enum(TYPES),
  examDate: z.string().min(1, "Elegí una fecha"),
  examTime: z.string().min(1, "Elegí una hora"),
  maxScore: z.coerce.number().positive("Debe ser mayor a 0"),
  weight: z.coerce.number().nonnegative("No puede ser negativo"),
});

type FormValues = z.infer<typeof schema>;

export default function AdminEvaluations() {
  const { data, isLoading } = useListEvaluations();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const remove = useDeleteEvaluation({
    mutation: {
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getListEvaluationsQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getGetAdminDashboardQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getGetUpcomingEvaluationsQueryKey() }),
        ]);
        toast({ title: "Evaluación eliminada" });
        setDeleteId(null);
      },
      onError: () => {
        toast({
          title: "No se pudo eliminar",
          variant: "destructive",
        });
      },
    },
  });

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Administración"
        title="Evaluaciones"
        description="Programá parciales, recuperativos, finales y tareas. Cargá las notas desde el detalle de cada una."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Nueva evaluación
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="h-12 w-12 rounded-full bg-muted text-muted-foreground flex items-center justify-center mx-auto mb-3">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div className="font-serif text-lg">Aún no hay evaluaciones</div>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Programá la primera evaluación para que tus estudiantes la vean en sus notificaciones.
            </p>
            <Button className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Nueva evaluación
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {data.map((ev) => (
                <div key={ev.id} className="flex items-center gap-4 p-4 hover-elevate">
                  <div className="hidden sm:flex flex-col items-center justify-center w-14 h-14 rounded-md bg-muted">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {formatDateShort(ev.examDate).split(" ")[1]}
                    </span>
                    <span className="font-serif text-xl leading-none">
                      {formatDateShort(ev.examDate).split(" ")[0]}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/admin/evaluaciones/${ev.id}`}
                        className="font-medium truncate hover:underline"
                      >
                        {ev.title}
                      </Link>
                      <Badge
                        variant="outline"
                        className={`border-transparent ${evaluationTypeAccent(ev.type)}`}
                      >
                        {evaluationTypeLabel(ev.type)}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {formatDateShort(ev.examDate)} · sobre {ev.maxScore} pts ·{" "}
                      peso {ev.weight}%
                    </div>
                  </div>
                  <div className="hidden md:flex flex-col items-end">
                    <div className="text-sm font-medium">
                      {ev.gradedCount}/{ev.totalStudents} corregidas
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Promedio {formatPercent(ev.averageScore == null ? null : (ev.averageScore / ev.maxScore) * 100)}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteId(ev.id)}
                    aria-label="Eliminar"
                    className="text-muted-foreground"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button asChild variant="ghost" size="icon" aria-label="Ver detalle">
                    <Link href={`/admin/evaluaciones/${ev.id}`}>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <CreateEvaluationDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => toast({ title: "Evaluación creada" })}
      />

      <AlertDialog open={deleteId != null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar evaluación?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción es permanente. Se borrarán también todas las notas asociadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteId != null) remove.mutate({ evaluationId: deleteId });
              }}
              disabled={remove.isPending}
            >
              {remove.isPending ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}

function CreateEvaluationDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: () => void;
}) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      type: "parcial",
      examDate: defaultDate(),
      examTime: "13:00",
      maxScore: 100,
      weight: 10,
    },
  });

  const create = useCreateEvaluation({
    mutation: {
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getListEvaluationsQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getGetAdminDashboardQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getGetUpcomingEvaluationsQueryKey() }),
        ]);
        form.reset();
        onOpenChange(false);
        onCreated();
      },
      onError: (err) => {
        if (err instanceof ApiError) {
          const data = err.data as { message?: string } | null;
          setServerError(data?.message ?? "No se pudo crear");
        } else {
          setServerError("Error inesperado");
        }
      },
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    setServerError(null);
    const iso = new Date(`${values.examDate}T${values.examTime}:00`).toISOString();
    create.mutate({
      data: {
        title: values.title.trim(),
        description: values.description?.trim() || undefined,
        type: values.type,
        examDate: iso,
        maxScore: values.maxScore,
        weight: values.weight,
      },
    });
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) {
          form.reset();
          setServerError(null);
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif">Nueva evaluación</DialogTitle>
          <DialogDescription>
            Programá parcial, recuperativo, rezagado, examen final, quiz o tarea.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Título</Label>
            <Input id="title" {...form.register("title")} placeholder="ej. Segundo parcial - Matemática" />
            {form.formState.errors.title && (
              <p className="text-xs text-destructive">{form.formState.errors.title.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Controller
                control={form.control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {evaluationTypeLabel(t)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="weight">Peso (%)</Label>
              <Input id="weight" type="number" min={0} step={1} {...form.register("weight")} />
              {form.formState.errors.weight && (
                <p className="text-xs text-destructive">{form.formState.errors.weight.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5 col-span-1">
              <Label htmlFor="examDate">Fecha</Label>
              <Input id="examDate" type="date" {...form.register("examDate")} />
              {form.formState.errors.examDate && (
                <p className="text-xs text-destructive">{form.formState.errors.examDate.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="examTime">Hora</Label>
              <Input id="examTime" type="time" {...form.register("examTime")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="maxScore">Puntaje máximo</Label>
              <Input id="maxScore" type="number" min={1} step={1} {...form.register("maxScore")} />
              {form.formState.errors.maxScore && (
                <p className="text-xs text-destructive">{form.formState.errors.maxScore.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Textarea
              id="description"
              {...form.register("description")}
              placeholder="Temas que entran, instrucciones, etc."
              rows={3}
            />
          </div>

          {serverError && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">
              {serverError}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Creando…" : "Crear evaluación"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function defaultDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}
