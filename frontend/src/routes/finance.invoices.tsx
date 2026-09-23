import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/finance/invoices")({
  component: () => <Outlet />,
});
