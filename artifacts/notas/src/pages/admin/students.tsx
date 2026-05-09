import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Search, Trash2, Users, ArrowRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListStudents,
  useCreateStudent,
  useDeleteStudent,
  getListStudentsQueryKey,
  getGetAdminDashboardQueryKey,
  ApiError,
} from "@workspace/api-client-react";
import { PageContainer, PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPercent, initialsOf } from "@/lib/format";

const createSchema = z.object({
  fullName: z.string().min(2, "Ingresá el nombre completo"),
  username: z
    .string()
    .min(3, "Mínimo 3 caracteres")
    .regex(/^[a-zA-Z0-9_.-]+$/, "Sólo letras, números, '.', '_' o '-'"),
  password: z.string().min(4, "Mínimo 4 caracteres"),
  grade: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
});

type CreateValues = z.infer<typeof createSchema>;

export default function AdminStudents() {
  const { data, isLoading } = useListStudents();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.username.toLowerCase().includes(q) ||
        (s.grade ?? "").toLowerCase().includes(q),
    );
  }, [data, search]);

  const deleteMutation = useDeleteStudent({
    mutation: {
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getGetAdminDashboardQueryKey() }),
        ]);
        toast({ title: "Estudiante eliminado" });
        setDeleteId(null);
      },
      onError: () => {
        toast({
          title: "No se pudo eliminar",
          description: "Intentá de nuevo en un momento.",
          variant: "destructive",
        });
      },
    },
  });

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Administración"
        title="Estudiantes"
        description="Registrá nuevos alumnos, revisá sus promedios y gestioná sus cuentas."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Agregar estudiante
          </Button>
        }
      />

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, usuario o curso…"
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="h-12 w-12 rounded-full bg-muted text-muted-foreground flex items-center justify-center mx-auto mb-3">
              <Users className="h-6 w-6" />
            </div>
            <div className="font-serif text-lg">
              {search ? "Sin resultados" : "Aún no hay estudiantes"}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {search
                ? "Probá con otro término de búsqueda."
                : "Agregá el primer estudiante para empezar."}
            </p>
            {!search && (
              <Button className="mt-4" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Agregar estudiante
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {filtered.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-4 p-4 hover-elevate"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                      {initialsOf(s.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/admin/estudiantes/${s.id}`}
                        className="font-medium truncate hover:underline"
                      >
                        {s.fullName}
                      </Link>
                      {s.grade ? (
                        <Badge variant="secondary" className="text-xs">
                          {s.grade}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Usuario: <code>{s.username}</code>
                      {s.email ? ` · ${s.email}` : ""}
                    </div>
                  </div>
                  <div className="hidden sm:flex flex-col items-end">
                    <div className="text-sm font-medium">
                      {formatPercent(s.averageScore)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {s.evaluationsTaken} {s.evaluationsTaken === 1 ? "nota" : "notas"}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteId(s.id)}
                    aria-label="Eliminar"
                    className="text-muted-foreground"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button asChild variant="ghost" size="icon" aria-label="Ver detalle">
                    <Link href={`/admin/estudiantes/${s.id}`}>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <CreateStudentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          toast({ title: "Estudiante creado" });
        }}
      />

      <AlertDialog open={deleteId != null} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar estudiante?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción es permanente. Se borrarán también todas sus calificaciones.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteId != null) deleteMutation.mutate({ studentId: deleteId });
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Eliminando…" : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}

function CreateStudentDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: () => void;
}) {
  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { fullName: "", username: "", password: "", grade: "", email: "" },
  });
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const create = useCreateStudent({
    mutation: {
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() }),
          queryClient.invalidateQueries({ queryKey: getGetAdminDashboardQueryKey() }),
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
    create.mutate({
      data: {
        fullName: values.fullName.trim(),
        username: values.username.trim(),
        password: values.password,
        grade: values.grade || undefined,
        email: values.email || undefined,
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">Nuevo estudiante</DialogTitle>
          <DialogDescription>
            Completá los datos. El estudiante usará el usuario y contraseña para ingresar.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Nombre completo</Label>
            <Input id="fullName" {...form.register("fullName")} placeholder="ej. Lucía Hernández" />
            {form.formState.errors.fullName && (
              <p className="text-xs text-destructive">{form.formState.errors.fullName.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="username">Usuario</Label>
              <Input id="username" {...form.register("username")} placeholder="ej. lucia" />
              {form.formState.errors.username && (
                <p className="text-xs text-destructive">{form.formState.errors.username.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <Input id="password" type="text" {...form.register("password")} placeholder="ej. alumno123" />
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="grade">Curso (opcional)</Label>
              <Input id="grade" {...form.register("grade")} placeholder="ej. 5to A" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email (opcional)</Label>
              <Input id="email" type="email" {...form.register("email")} placeholder="lucia@…" />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
          </div>
          {serverError ? (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">
              {serverError}
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? "Creando…" : "Crear estudiante"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
