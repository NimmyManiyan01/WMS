import { createFileRoute } from "@tanstack/react-router";
import { Truck } from "lucide-react";
import { AdminSectionPage } from "@/components/wms/admin-section-page";

export const Route = createFileRoute("/admin/suppliers")({
  component: () => <AdminSectionPage title="Supplier Management" subtitle="Review and manage supplier records." icon={Truck} description="Open the supplier master to review onboarding, status and supplier account information." action={{ label: "Open supplier master", to: "/master-data" }} />,
});
