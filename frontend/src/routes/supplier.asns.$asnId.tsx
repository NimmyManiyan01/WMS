import { createFileRoute } from "@tanstack/react-router";
import { AsnTracking } from "@/components/wms/asn-tracking";
import { requireRole } from "@/lib/auth-utils";

export const Route = createFileRoute("/supplier/asns/$asnId")({
  beforeLoad: () => requireRole("SUPPLIER"),
  component: SupplierAsnDetails,
});

function SupplierAsnDetails() {
  const { asnId } = Route.useParams();
  return <AsnTracking key={asnId} asnId={asnId} />;
}
