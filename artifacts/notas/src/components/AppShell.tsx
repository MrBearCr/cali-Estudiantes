import { type ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  BookOpenCheck,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Bell,
  ClipboardList,
  Users,
  X,
} from "lucide-react";
import { useLogout } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { initialsOf } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const TEACHER_NAV: NavItem[] = [
  { href: "/admin", label: "Resumen", icon: LayoutDashboard },
  { href: "/admin/estudiantes", label: "Estudiantes", icon: Users },
  { href: "/admin/evaluaciones", label: "Evaluaciones", icon: ClipboardList },
];

const STUDENT_NAV: NavItem[] = [
  { href: "/estudiante", label: "Mi Resumen", icon: LayoutDashboard },
  { href: "/estudiante/notas", label: "Mis Notas", icon: BookOpenCheck },
  { href: "/estudiante/notificaciones", label: "Notificaciones", icon: Bell },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const logout = useLogout({
    mutation: {
      onSuccess: async () => {
        await signOut();
        queryClient.clear();
        setLocation("/login");
      },
    },
  });

  if (!user) return null;
  const nav = user.role === "teacher" ? TEACHER_NAV : STUDENT_NAV;

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar (desktop) */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <Brand />
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </nav>
        <UserBlock onSignOut={() => logout.mutate()} pending={logout.isPending} />
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-foreground/40" />
          <aside
            className="absolute inset-y-0 left-0 w-72 flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pr-2">
              <Brand />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                aria-label="Cerrar menú"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {nav.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  onNavigate={() => setOpen(false)}
                />
              ))}
            </nav>
            <UserBlock
              onSignOut={() => {
                setOpen(false);
                logout.mutate();
              }}
              pending={logout.isPending}
            />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 backdrop-blur px-4 h-14">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <span className="font-serif font-semibold">Sistema de Notas</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {initialsOf(user.fullName)}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2 px-5 py-5">
      <div className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
        <GraduationCap className="h-5 w-5" />
      </div>
      <div>
        <div className="font-serif text-lg leading-tight">Sistema</div>
        <div className="font-serif text-lg leading-tight -mt-1">de Notas</div>
      </div>
    </div>
  );
}

function NavLink({
  item,
  onNavigate,
}: {
  item: NavItem;
  onNavigate?: () => void;
}) {
  const [location] = useLocation();
  const active =
    item.href === location ||
    (item.href !== "/admin" && item.href !== "/estudiante" && location.startsWith(item.href));
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover-elevate",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/80",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{item.label}</span>
    </Link>
  );
}

function UserBlock({
  onSignOut,
  pending,
}: {
  onSignOut: () => void;
  pending: boolean;
}) {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <div className="border-t border-sidebar-border p-3 space-y-2">
      <div className="flex items-center gap-3 px-2 py-2">
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-primary text-primary-foreground text-sm">
            {initialsOf(user.fullName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">{user.fullName}</div>
          <div className="text-xs text-muted-foreground capitalize">
            {user.role === "teacher" ? "Profesor/a" : "Estudiante"}
          </div>
        </div>
      </div>
      <Button
        variant="ghost"
        className="w-full justify-start gap-2 text-sm"
        onClick={onSignOut}
        disabled={pending}
      >
        <LogOut className="h-4 w-4" />
        {pending ? "Cerrando sesión…" : "Cerrar sesión"}
      </Button>
    </div>
  );
}
