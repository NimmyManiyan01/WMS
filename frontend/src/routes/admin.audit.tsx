import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList } from "lucide-react";
import { AdminSectionPage } from "@/components/wms/admin-section-page";

export const Route = createFileRoute("/admin/audit")({
  component: () => <AdminSectionPage title="Audit Log" subtitle="Review administrative and account activity." icon={ClipboardList} description="Audit events will appear here as administrators create users, change access and update account status." />,
});
