import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { AppShell } from "@/components/wms/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function AdminSectionPage({
  title,
  subtitle,
  icon: Icon,
  description,
  action,
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  description: string;
  action?: { label: string; to: string };
}) {
  return (
    <AppShell title={title} subtitle={subtitle}>
      <Card className="rounded-2xl bg-white shadow-sm">
        <CardContent className="flex min-h-72 flex-col items-center justify-center p-10 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="size-6" />
          </span>
          <h2 className="mt-5 text-lg font-semibold">{title}</h2>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground">{description}</p>
          {action && (
            <Button asChild className="mt-6 rounded-xl">
              <Link to={action.to as any}>{action.label}</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
