import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import { AppShell, StatusBadge } from "@/components/wms/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api-client";
import { requireRole } from "@/lib/auth-utils";

export const Route = createFileRoute("/procurement/quality-issues")({
  beforeLoad: () => requireRole("PROCUREMENT"),
  component: Page,
});

function Page() {
  const [issues, setIssues] = useState<any[]>([]),
    [loading, setLoading] = useState(true),
    [sending, setSending] = useState<string>();
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setIssues(await api.getQualityIssues());
    } catch (e) {
      toast.error("Unable to load quality issues", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  async function send(issue: any) {
    const id = issue.id || issue.gate_entry_id;
    setSending(id);
    try {
      const result =
        issue.type === "DAMAGE_REPORT"
          ? await api.createSupplierDamageClaim(issue.id)
          : await api.forwardQualityIssue(issue.gate_entry_id);
      toast.success(
        issue.type === "DAMAGE_REPORT"
          ? `Supplier claim ${result.claim_number} sent`
          : "Issue emailed to supplier",
        { description: result.recipient },
      );
      await load();
    } catch (e) {
      toast.error("Unable to send to supplier", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setSending(undefined);
    }
  }
  return (
    <AppShell
      title="Supplier Quality Issues"
      subtitle="Review damage reports and send supplier claims"
      actions={
        <Button variant="outline" className="rounded-xl" onClick={() => void load()}>
          <RefreshCw className="size-4" /> Refresh
        </Button>
      }
    >
      {loading ? (
        <div className="grid h-64 place-items-center">
          <Loader2 className="size-6 animate-spin" />
        </div>
      ) : issues.length === 0 ? (
        <Card className="grid h-64 place-items-center rounded-2xl border-[#DCE6F3] text-[#526580] shadow-xs">
          <div className="text-center">
            <AlertTriangle className="mx-auto mb-2 size-8" />
            No quality issues.
          </div>
        </Card>
      ) : (
        <div className="grid items-start gap-5 xl:grid-cols-2">
          {issues.map((issue) => {
            const id = issue.id || issue.gate_entry_id;
            return (
              <Card key={id} className="overflow-hidden rounded-2xl border-[#DCE6F3] p-0 shadow-xs">
                <div className="flex items-start justify-between gap-3 border-b border-[#DCE6F3] px-5 py-4">
                  <div>
                    <h3 className="font-mono font-extrabold text-[#101D3A]">
                      {issue.report_number || issue.asn_number}
                    </h3>
                    <p className="mt-1 text-sm font-medium text-[#526580]">
                      {issue.po_number} · {issue.supplier_name}
                    </p>
                  </div>
                  <StatusBadge status={issue.status} />
                </div>
                {issue.type === "DAMAGE_REPORT" ? (
                  <>
                    <dl className="grid grid-cols-2 gap-x-5 gap-y-3 bg-[#F8FAFD] px-5 py-4 text-sm">
                      <dt className="text-xs font-semibold text-[#526580]">Material</dt>
                      <dd className="text-right font-bold text-[#101D3A]">{issue.material}</dd>
                      <dt className="text-xs font-semibold text-[#526580]">Received</dt>
                      <dd className="text-right font-bold text-[#101D3A]">
                        {issue.received_quantity} {issue.uom}
                      </dd>
                      <dt className="text-xs font-semibold text-[#526580]">Damaged</dt>
                      <dd className="text-right font-bold text-destructive">
                        {issue.damaged_quantity} {issue.uom}
                      </dd>
                      <dt className="text-xs font-semibold text-[#526580]">Reason</dt>
                      <dd className="text-right font-bold text-[#101D3A]">{issue.damage_reason}</dd>
                      <dt className="text-xs font-semibold text-[#526580]">Inspector</dt>
                      <dd className="text-right font-bold text-[#101D3A]">{issue.inspector}</dd>
                    </dl>
                    <div className="grid grid-cols-2 gap-3 border-t border-[#DCE6F3] px-5 py-4">
                      {issue.photos?.map((photo: any, index: number) => (
                        <img
                          key={index}
                          className="h-48 w-full rounded-xl border border-[#DCE6F3] bg-[#F5F8FF] object-contain"
                          src={`data:${photo.content_type};base64,${photo.image_base64}`}
                          alt={`Damage evidence ${index + 1}`}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  issue.image_base64 && (
                    <img
                      className="m-5 max-h-80 w-[calc(100%_-_2.5rem)] rounded-xl border border-[#DCE6F3] bg-[#F5F8FF] object-contain"
                      src={`data:${issue.content_type};base64,${issue.image_base64}`}
                      alt="Failed inspection evidence"
                    />
                  )
                )}
                <Button
                  className="mx-5 mb-5 w-[calc(100%_-_2.5rem)] rounded-xl bg-[#0866FF] hover:bg-[#0054D6]"
                  disabled={Boolean(issue.claim_number) || sending === id}
                  onClick={() => void send(issue)}
                >
                  {sending === id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}{" "}
                  {issue.claim_number
                    ? `Claim ${issue.claim_number} sent`
                    : issue.type === "DAMAGE_REPORT"
                      ? "Create & Send Supplier Claim"
                      : "Send Evidence to Supplier"}
                </Button>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
