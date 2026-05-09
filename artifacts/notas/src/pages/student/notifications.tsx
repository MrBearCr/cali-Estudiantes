import { Bell } from "lucide-react";
import { useGetMyNotifications } from "@workspace/api-client-react";
import { PageContainer, PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  evaluationTypeLabel,
  formatDate,
  severityClass,
  severityLabel,
} from "@/lib/format";

export default function StudentNotifications() {
  const { data, isLoading } = useGetMyNotifications();

  const upcoming = (data ?? []).filter((n) => n.daysUntil >= 0);
  const past = (data ?? []).filter((n) => n.daysUntil < 0);

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Avisos"
        title="Notificaciones"
        description="Calendario de evaluaciones que viene y de las que ya pasaron."
      />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="h-12 w-12 rounded-full bg-muted text-muted-foreground flex items-center justify-center mx-auto mb-3">
              <Bell className="h-6 w-6" />
            </div>
            <div className="font-serif text-lg">No hay notificaciones</div>
            <p className="text-sm text-muted-foreground mt-1">
              Cuando tu profesor programe una evaluación, vas a verla acá.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Section title="Por venir" items={upcoming} emptyText="No hay evaluaciones próximas." />
          <Section title="Anteriores" items={past} emptyText="No hay evaluaciones pasadas." />
        </div>
      )}
    </PageContainer>
  );
}

function Section({
  title,
  items,
  emptyText,
}: {
  title: string;
  items: Array<{
    id: number;
    title: string;
    body: string;
    type: string;
    examDate: string;
    severity: string;
    daysUntil: number;
  }>;
  emptyText: string;
}) {
  return (
    <div>
      <h2 className="font-serif text-xl mb-3">{title}</h2>
      {items.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            {emptyText}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-lg border ${severityClass(n.severity)}`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="font-medium">{n.title}</div>
                  <div className="text-xs mt-0.5 opacity-80">
                    {evaluationTypeLabel(n.type)} · {formatDate(n.examDate)}
                  </div>
                </div>
                <span className="text-[10px] uppercase tracking-wider font-semibold">
                  {severityLabel(n.severity)}
                </span>
              </div>
              <p className="text-sm mt-2">{n.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
