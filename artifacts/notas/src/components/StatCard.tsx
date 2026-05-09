import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "primary",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  accent?: "primary" | "accent" | "warning" | "danger";
}) {
  const accentClass = (() => {
    switch (accent) {
      case "accent":
        return "bg-[hsl(168_36%_38%/_0.14)] text-[hsl(168_36%_30%)] dark:bg-[hsl(168_44%_52%/_0.18)] dark:text-[hsl(168_44%_72%)]";
      case "warning":
        return "bg-[hsl(38_80%_56%/_0.18)] text-[hsl(35_70%_32%)] dark:bg-[hsl(38_86%_64%/_0.20)] dark:text-[hsl(38_86%_78%)]";
      case "danger":
        return "bg-[hsl(0_72%_48%/_0.14)] text-[hsl(0_72%_38%)] dark:bg-[hsl(0_70%_56%/_0.18)] dark:text-[hsl(0_70%_75%)]";
      default:
        return "bg-[hsl(22_78%_46%/_0.14)] text-[hsl(22_78%_36%)] dark:bg-[hsl(22_88%_60%/_0.18)] dark:text-[hsl(22_88%_75%)]";
    }
  })();

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5 flex items-start gap-4">
        <div className={`h-11 w-11 rounded-lg flex items-center justify-center ${accentClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            {label}
          </div>
          <div className="text-2xl font-serif mt-1 leading-tight">{value}</div>
          {hint ? <div className="text-xs text-muted-foreground mt-1">{hint}</div> : null}
        </div>
      </CardContent>
    </Card>
  );
}
