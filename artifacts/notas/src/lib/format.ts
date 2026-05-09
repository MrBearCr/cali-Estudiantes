import { format, formatDistanceToNow, isPast, parseISO } from "date-fns";
import { es } from "date-fns/locale";

export function formatDate(iso: string): string {
  return format(parseISO(iso), "EEEE d 'de' MMMM, yyyy", { locale: es });
}

export function formatDateShort(iso: string): string {
  return format(parseISO(iso), "d MMM yyyy", { locale: es });
}

export function formatDateTime(iso: string): string {
  return format(parseISO(iso), "d MMM yyyy · HH:mm", { locale: es });
}

export function formatRelative(iso: string): string {
  const date = parseISO(iso);
  if (isPast(date)) {
    return `hace ${formatDistanceToNow(date, { locale: es })}`;
  }
  return `en ${formatDistanceToNow(date, { locale: es })}`;
}

export function formatScore(score: number | null | undefined, max: number): string {
  if (score == null) return "—";
  return `${score} / ${max}`;
}

export function formatPercent(p: number | null | undefined): string {
  if (p == null) return "—";
  return `${Math.round(p)}%`;
}

export function evaluationTypeLabel(type: string): string {
  switch (type) {
    case "parcial":
      return "Parcial";
    case "recuperativo":
      return "Recuperativo";
    case "rezagado":
      return "Rezagado";
    case "examen_final":
      return "Examen Final";
    case "quiz":
      return "Quiz";
    case "tarea":
      return "Tarea";
    default:
      return type;
  }
}

export function evaluationTypeAccent(type: string): string {
  switch (type) {
    case "parcial":
      return "bg-[hsl(22_78%_46%/_0.14)] text-[hsl(22_78%_36%)] dark:bg-[hsl(22_88%_60%/_0.18)] dark:text-[hsl(22_88%_75%)]";
    case "recuperativo":
      return "bg-[hsl(0_72%_48%/_0.12)] text-[hsl(0_72%_42%)] dark:bg-[hsl(0_70%_56%/_0.18)] dark:text-[hsl(0_70%_75%)]";
    case "rezagado":
      return "bg-[hsl(38_80%_56%/_0.18)] text-[hsl(35_70%_36%)] dark:bg-[hsl(38_86%_64%/_0.22)] dark:text-[hsl(38_86%_75%)]";
    case "examen_final":
      return "bg-[hsl(320_38%_52%/_0.14)] text-[hsl(320_38%_42%)] dark:bg-[hsl(320_50%_64%/_0.20)] dark:text-[hsl(320_50%_78%)]";
    case "quiz":
      return "bg-[hsl(200_60%_44%/_0.14)] text-[hsl(200_60%_36%)] dark:bg-[hsl(200_70%_56%/_0.20)] dark:text-[hsl(200_70%_75%)]";
    case "tarea":
      return "bg-[hsl(168_36%_38%/_0.16)] text-[hsl(168_36%_30%)] dark:bg-[hsl(168_44%_52%/_0.22)] dark:text-[hsl(168_44%_72%)]";
    default:
      return "bg-secondary text-secondary-foreground";
  }
}

export function severityClass(severity: string): string {
  switch (severity) {
    case "urgent":
      return "bg-[hsl(0_72%_48%/_0.14)] text-[hsl(0_72%_38%)] border-[hsl(0_72%_48%/_0.30)] dark:bg-[hsl(0_70%_56%/_0.18)] dark:text-[hsl(0_70%_75%)] dark:border-[hsl(0_70%_56%/_0.40)]";
    case "warning":
      return "bg-[hsl(38_80%_56%/_0.18)] text-[hsl(35_70%_32%)] border-[hsl(38_80%_56%/_0.34)] dark:bg-[hsl(38_86%_64%/_0.20)] dark:text-[hsl(38_86%_78%)] dark:border-[hsl(38_86%_64%/_0.40)]";
    case "info":
      return "bg-[hsl(168_36%_38%/_0.14)] text-[hsl(168_36%_28%)] border-[hsl(168_36%_38%/_0.30)] dark:bg-[hsl(168_44%_52%/_0.18)] dark:text-[hsl(168_44%_75%)] dark:border-[hsl(168_44%_52%/_0.40)]";
    case "past":
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function severityLabel(severity: string): string {
  switch (severity) {
    case "urgent":
      return "Urgente";
    case "warning":
      return "Próximo";
    case "info":
      return "Programado";
    case "past":
      return "Finalizado";
    default:
      return severity;
  }
}

export function initialsOf(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
