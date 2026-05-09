import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
      <div>
        {eyebrow ? (
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1 inline-flex items-center gap-2">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="font-serif text-2xl md:text-3xl text-foreground">{title}</h1>
        {description ? (
          <p className="text-muted-foreground mt-1 max-w-2xl">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function PageContainer({ children }: { children: ReactNode }) {
  return <div className="px-4 md:px-8 py-6 md:py-8 max-w-7xl mx-auto w-full">{children}</div>;
}
