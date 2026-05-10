import { useState } from "react";
import { Redirect, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
// import { motion } from "framer-motion";
import { GraduationCap, Loader2 } from "lucide-react";
import { useLogin, ApiError } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

const schema = z.object({
  username: z.string().min(2, "Ingresá tu usuario"),
  password: z.string().min(4, "Ingresá tu contraseña"),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const { user, loading, refresh } = useAuth();
  const [, setLocation] = useLocation();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: "", password: "" },
  });

  const login = useLogin({
    mutation: {
      onSuccess: async (data) => {
        await refresh();
        if (data.role === "teacher") setLocation("/admin");
        else setLocation("/estudiante");
      },
      onError: (err) => {
        if (err instanceof ApiError) {
          const data = err.data as { message?: string } | null;
          setError(data?.message ?? "No se pudo iniciar sesión");
        } else {
          setError("Error de conexión. Intentá de nuevo.");
        }
      },
    },
  });

  if (!loading && user) {
    return <Redirect to={user.role === "teacher" ? "/admin" : "/estudiante"} />;
  }

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    login.mutate({ data: values });
  });

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      <div className="hidden lg:flex flex-1 relative items-center justify-center bg-sidebar text-sidebar-foreground paper-grain overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-accent/10" />
        <div
          className="relative z-10 max-w-md px-12"
        >
          <div className="h-12 w-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg mb-6">
            <GraduationCap className="h-6 w-6" />
          </div>
          <h1 className="font-serif text-4xl leading-tight mb-3">
            Lleve las calificaciones de su clase con orden y claridad.
          </h1>
          <p className="text-sidebar-foreground/80 text-base">
            Registre estudiantes, programe parciales y exámenes, y comparta las notas
            con cada alumno apenas estén listas.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4 text-sm text-sidebar-foreground/80">
            <Bullet label="Parciales y recuperativos" />
            <Bullet label="Quizzes y tareas" />
            <Bullet label="Exámenes finales" />
            <Bullet label="Notificaciones a estudiantes" />
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex items-center gap-2 mb-6">
            <div className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <div className="font-serif text-xl leading-tight">Sistema</div>
              <div className="font-serif text-xl leading-tight -mt-1">de Notas</div>
            </div>
          </div>

          <Card>
            <CardContent className="p-6 md:p-8">
              <h2 className="font-serif text-2xl mb-1">Bienvenido/a</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Iniciá sesión con el usuario que te entregó tu profesor.
              </p>

              <form className="space-y-4" onSubmit={onSubmit}>
                <div className="space-y-1.5">
                  <Label htmlFor="username">Usuario</Label>
                  <Input
                    id="username"
                    placeholder="ej. lucia"
                    autoComplete="username"
                    autoFocus
                    {...form.register("username")}
                  />
                  {form.formState.errors.username ? (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.username.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password">Contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    {...form.register("password")}
                  />
                  {form.formState.errors.password ? (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.password.message}
                    </p>
                  ) : null}
                </div>

                {error ? (
                  <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">
                    {error}
                  </div>
                ) : null}

                <Button type="submit" className="w-full" disabled={login.isPending}>
                  {login.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Ingresando…
                    </>
                  ) : (
                    "Ingresar"
                  )}
                </Button>
              </form>

              <div className="mt-6 rounded-md bg-muted/60 border border-border px-3 py-2 text-xs text-muted-foreground">
                <div className="font-medium text-foreground mb-1">Cuentas de prueba</div>
                <div>Profesor/a — usuario: <code>profesor</code> · clave: <code>profesor123</code></div>
                <div>Estudiante — usuario: <code>lucia</code> · clave: <code>alumno123</code></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Bullet({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
      <span>{label}</span>
    </div>
  );
}
