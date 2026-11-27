import { createFileRoute } from "@tanstack/react-router";
import { AsnTracking } from "@/components/wms/asn-tracking";
import { requireRole } from "@/lib/auth-utils";

export const Route = createFileRoute("/procurement/asns/$asnId")({
  beforeLoad: () => requireRole(["PROCUREMENT", "ADMIN", "SUPERUSER"]),
  component: ProcurementAsnDetails,
});

function ProcurementAsnDetails() {
  const { asnId } = Route.useParams();
  return <AsnTracking key={asnId} asnId={asnId} />;
}
