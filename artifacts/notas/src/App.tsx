import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import LoginPage from "@/pages/login";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminStudents from "@/pages/admin/students";
import AdminStudentDetail from "@/pages/admin/student-detail";
import AdminEvaluations from "@/pages/admin/evaluations";
import AdminEvaluationDetail from "@/pages/admin/evaluation-detail";
import StudentDashboard from "@/pages/student/dashboard";
import StudentGrades from "@/pages/student/grades";
import StudentNotifications from "@/pages/student/notifications";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Redirect to="/login" />;
  return user.role === "teacher" ? <Redirect to="/admin" /> : <Redirect to="/estudiante" />;
}

function ProtectedRoutes() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Cargando…
      </div>
    );
  }
  if (!user) return <Redirect to="/login" />;
  return (
    <AppShell>
      <Switch>
        {user.role === "teacher" ? (
          <>
            <Route path="/admin" component={AdminDashboard} />
            <Route path="/admin/estudiantes" component={AdminStudents} />
            <Route path="/admin/estudiantes/:id" component={AdminStudentDetail} />
            <Route path="/admin/evaluaciones" component={AdminEvaluations} />
            <Route path="/admin/evaluaciones/:id" component={AdminEvaluationDetail} />
            <Route path="/estudiante/:rest*">
              {() => <Redirect to="/admin" />}
            </Route>
          </>
        ) : (
          <>
            <Route path="/estudiante" component={StudentDashboard} />
            <Route path="/estudiante/notas" component={StudentGrades} />
            <Route path="/estudiante/notificaciones" component={StudentNotifications} />
            <Route path="/admin/:rest*">
              {() => <Redirect to="/estudiante" />}
            </Route>
          </>
        )}
        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/login" component={LoginPage} />
      <Route component={ProtectedRoutes} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
            <Toaster />
          </AuthProvider>
        </WouterRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
