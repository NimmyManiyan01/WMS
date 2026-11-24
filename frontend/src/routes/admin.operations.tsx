import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { AdminSectionPage } from "@/components/wms/admin-section-page";

export const Route = createFileRoute("/admin/operations")({
  component: () => <AdminSectionPage title="Operations" subtitle="Monitor warehouse operations across modules." icon={BarChart3} description="Use the warehouse dashboard for live inventory, dock and operational status." action={{ label: "Open operations dashboard", to: "/warehouse-dashboard" }} />,
});
