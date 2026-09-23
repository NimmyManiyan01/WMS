import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dispatch-gate-out")({
  beforeLoad: () => {
    throw redirect({ to: "/dispatch" });
  },
  component: () => null,
});
