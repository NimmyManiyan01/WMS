import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dispatch-gate-exit")({
  beforeLoad: () => {
    throw redirect({ to: "/dispatch" });
  },
  component: () => null,
});
