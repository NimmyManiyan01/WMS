import { createFileRoute } from "@tanstack/react-router";
import { LayoutDashboard } from "lucide-react";
import { AdminSectionPage } from "@/components/wms/admin-section-page";

export const Route = createFileRoute("/admin/")({
  component: () => (
    <AdminSectionPage
      title="Admin Dashboard"
      subtitle="System administration and access control overview."
      icon={LayoutDashboard}
      description="Manage staff accounts, review access, monitor operations and open administrative reports."
      action={{ label: "Manage users", to: "/admin/users" }}
    />
  ),
});
