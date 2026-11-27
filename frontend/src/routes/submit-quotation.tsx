import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { AppShell } from "@/components/wms/app-shell";
import { SectionCard } from "@/components/wms/primitives";
import { isQuotationLocked, QuotationResponse } from "@/components/wms/quotation-response";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { getUserInfo } from "@/lib/auth-utils";

type SupplierRfq = {
  id: string;
  rfqNumber?: string;
  rfq_number?: string;
  requiredDeliveryDate?: string;
  required_delivery_date?: string;
  warehouse?: string;
};

export const Route = createFileRoute("/submit-quotation")({
  validateSearch: (search: Record<string, unknown>) => ({
    rfqId: typeof search.rfqId === "string" ? search.rfqId.trim() : undefined,
    token: typeof search.token === "string" ? search.token.trim() : undefined,
    q: typeof search.q === "string" ? search.q.trim() : undefined,
    t: typeof search.t === "string" ? search.t.trim() : undefined,
  }),
  component: SubmitQuotation,
});

function SubmitQuotation() {
  const search = Route.useSearch();
  const rfqId = search.rfqId || "";
  const token = search.token || search.q || search.t || "";

  if (!rfqId && !token) return <QuotationPortal />;

  return <QuotationResponse key={JSON.stringify([rfqId, token])} rfqId={rfqId} token={token} />;
}

function QuotationPortal() {
  const [rfqs, setRfqs] = useState<SupplierRfq[]>([]);
  const [lockedRfqs, setLockedRfqs] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "no-account">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const supplierId = getUserInfo()?.supplierId;
    if (!supplierId) {
      setStatus("no-account");
      return;
    }

    let active = true;
    Promise.all([api.getRfqs(supplierId), api.getQuotations(undefined, supplierId)])
      .then(([requests, quotations]) => {
        if (!active) return;
        setRfqs(requests);
        setLockedRfqs(
          new Set(
            quotations
              .filter((quote) => isQuotationLocked(quote.status))
              .map((quote) => quote.rfqId ?? quote.rfq_id),
          ),
        );
        setStatus("ready");
      })
      .catch(() => {
        if (active) setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  return (
    <AppShell title="Quotation Portal" subtitle="Fill in quotations for your RFQ invitations">
      <SectionCard title="RFQs Received" icon={FileText}>
        {status === "loading" && <p role="status">Loading RFQs…</p>}
        {status === "no-account" && (
          <p className="text-sm text-muted-foreground">
            Sign in with a supplier account or open your RFQ invitation link.
          </p>
        )}
        {status === "error" && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p role="alert" className="text-sm text-destructive">
              Could not load your RFQs.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setStatus("loading");
                setAttempt((value) => value + 1);
              }}
            >
              Try Again
            </Button>
          </div>
        )}
        {status === "ready" &&
          (rfqs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No RFQ invitations have been received yet.
            </p>
          ) : (
            <ul className="divide-y divide-[#DCE6F3] overflow-hidden rounded-xl border border-[#DCE6F3]">
              {rfqs.map((rfq) => (
                <li
                  key={rfq.id}
                  className="flex flex-wrap items-center justify-between gap-3 bg-[#F5F8FF] p-4"
                >
                  <div>
                    <p className="text-sm font-bold">{rfq.rfqNumber || rfq.rfq_number || "RFQ"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {[rfq.warehouse, rfq.requiredDeliveryDate || rfq.required_delivery_date]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="rounded-xl"
                    variant={lockedRfqs.has(rfq.id) ? "outline" : "default"}
                    asChild
                  >
                    <Link to="/submit-quotation" search={{ rfqId: rfq.id }}>
                      {lockedRfqs.has(rfq.id) ? "View Quotation" : "Fill Quotation"}
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          ))}
      </SectionCard>
    </AppShell>
  );
}
