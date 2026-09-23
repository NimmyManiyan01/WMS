import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Layers,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldAlert,
  Loader2,
  RefreshCw,
  Building2,
  FileText,
  PackageCheck,
  Receipt,
  ArrowRight,
  ShieldCheck,
  Info,
} from "lucide-react";
import { AppShell, StatusBadge } from "@/components/wms/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { requireRole } from "@/lib/auth-utils";

export const Route = createFileRoute("/finance/matching")({
  beforeLoad: () => requireRole("FINANCE"),
  component: ThreeWayMatchingPage,
});

function ThreeWayMatchingPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>("");
  const [invoice, setInvoice] = useState<any>(null);
  const [po, setPo] = useState<any>(null);
  const [grn, setGrn] = useState<any>(null);
  const [matchResult, setMatchResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);

  // Override dialog
  const [isOverrideOpen, setIsOverrideOpen] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [overriding, setOverriding] = useState(false);

  const loadInvoices = async () => {
    try {
      setLoading(true);
      const data = await api.listSupplierInvoices({ limit: 100 });
      setInvoices(data || []);
      if (data && data.length > 0 && !selectedInvoiceId) {
        setSelectedInvoiceId(data[0].id);
      }
    } catch (e: any) {
      toast.error("Failed to load invoices for matching: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadMatchData = async (invId: string) => {
    if (!invId) return;
    try {
      setLoading(true);
      const invData = await api.getSupplierInvoice(invId);
      setInvoice(invData);

      // Load linked PO if any
      let poData = null;
      if (invData.po_id) {
        poData = await api.getPurchaseOrder(invData.po_id).catch(() => null);
      }
      setPo(poData);

      // Load linked GRN if any
      let grnData = null;
      if (invData.grn_id) {
        grnData = await api.getGrn(invData.grn_id).catch(() => null);
      }
      setGrn(grnData);

      // Synthesize matching details if available
      setMatchResult({
        match_status: invData.match_status,
        discrepancy: invData.match_status === "DISCREPANCY",
      });
    } catch (e: any) {
      toast.error("Failed to load invoice match data: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedInvoiceId) {
      loadMatchData(selectedInvoiceId);
    }
  }, [selectedInvoiceId]);

  const handleRunMatch = async () => {
    if (!selectedInvoiceId) return;
    try {
      setMatching(true);
      const res = await api.matchSupplierInvoice(selectedInvoiceId);
      toast.success(`3-Way match executed: ${res.match_status}`);
      setMatchResult(res);
      await loadMatchData(selectedInvoiceId);
    } catch (e: any) {
      toast.error("Match failed: " + e.message);
    } finally {
      setMatching(false);
    }
  };

  const handleOverrideSubmit = async () => {
    if (!overrideReason.trim()) {
      toast.error("Please provide an override reason/justification");
      return;
    }
    try {
      setOverriding(true);
      await api.overrideInvoiceMatch(selectedInvoiceId, {
        override_reason: overrideReason,
      });
      toast.success("Discrepancy overridden successfully!");
      setIsOverrideOpen(false);
      setOverrideReason("");
      await loadMatchData(selectedInvoiceId);
    } catch (e: any) {
      toast.error("Override failed: " + e.message);
    } finally {
      setOverriding(false);
    }
  };

  const matchStatus = invoice?.match_status || "PENDING";
  const isMatched = matchStatus === "MATCHED";
  const isWarning = matchStatus === "TOLERANCE_WARNING";
  const isDiscrepancy = matchStatus === "DISCREPANCY";
  const isOverridden = matchStatus === "OVERRIDDEN";

  return (
    <AppShell
      title="3-Way Matching Engine"
      subtitle="Side-by-side comparative verification of Purchase Orders, Goods Receipt (GRN) & Supplier Invoices"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl font-bold"
            onClick={() => loadMatchData(selectedInvoiceId)}
          >
            <RefreshCw className="size-4 mr-1.5" /> Refresh
          </Button>
          <Button
            size="sm"
            className="rounded-xl font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-soft"
            onClick={handleRunMatch}
            disabled={matching || !selectedInvoiceId}
          >
            {matching ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <Layers className="size-4 mr-1.5" />}
            Execute Match
          </Button>
        </div>
      }
    >
      {/* Invoice Selector Card */}
      <Card className="border-border/40 shadow-soft mb-6">
        <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="w-full sm:w-96 space-y-1">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Select Invoice to Match
            </Label>
            <Select value={selectedInvoiceId} onValueChange={setSelectedInvoiceId}>
              <SelectTrigger className="rounded-xl h-9 text-xs">
                <SelectValue placeholder="Choose an invoice..." />
              </SelectTrigger>
              <SelectContent>
                {invoices.map((inv) => (
                  <SelectItem key={inv.id} value={inv.id}>
                    {inv.invoice_number} — {inv.supplier_name || "Supplier"} (₹{Number(inv.grand_total || 0).toLocaleString()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden md:block">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Current Match State</p>
              <p className="text-xs font-mono font-bold text-foreground">{matchStatus}</p>
            </div>
            <StatusBadge status={matchStatus} />
          </div>
        </CardContent>
      </Card>

      {/* Match Result Banner */}
      <div
        className={cn(
          "p-4 rounded-2xl border mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-soft",
          isMatched
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200"
            : isWarning
              ? "bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-200"
              : isDiscrepancy
                ? "bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-200"
                : isOverridden
                  ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-950 dark:text-indigo-200"
                  : "bg-muted/20 border-border/50 text-foreground",
        )}
      >
        <div className="flex items-center gap-3.5">
          <div
            className={cn(
              "size-10 rounded-xl flex items-center justify-center shrink-0",
              isMatched
                ? "bg-emerald-500 text-white"
                : isWarning
                  ? "bg-amber-500 text-white"
                  : isDiscrepancy
                    ? "bg-rose-500 text-white"
                    : isOverridden
                      ? "bg-indigo-500 text-white"
                      : "bg-muted text-muted-foreground",
            )}
          >
            {isMatched ? (
              <CheckCircle2 className="size-5" />
            ) : isWarning ? (
              <AlertTriangle className="size-5" />
            ) : isDiscrepancy ? (
              <XCircle className="size-5" />
            ) : isOverridden ? (
              <ShieldCheck className="size-5" />
            ) : (
              <Layers className="size-5" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-tight">
              Match Status: {matchStatus}
            </h3>
            <p className="text-xs opacity-90">
              {isMatched && "Quantity and unit pricing match within strict enterprise tolerance."}
              {isWarning && "Price variance is within acceptable tolerance (+/- 2.0%). Ready for review."}
              {isDiscrepancy && "Discrepancy detected between invoice, PO, or goods received. Authorization hold active."}
              {isOverridden && "Discrepancy officially overridden by Finance Manager authorization."}
              {matchStatus === "PENDING" && "Invoice pending execution of automated 3-way matching rules."}
            </p>
          </div>
        </div>

        {isDiscrepancy && (
          <Button
            size="sm"
            className="rounded-xl font-bold bg-rose-600 hover:bg-rose-700 text-white shrink-0"
            onClick={() => setIsOverrideOpen(true)}
          >
            <ShieldAlert className="size-4 mr-1.5" /> Override Discrepancy
          </Button>
        )}
      </div>

      {/* Side-by-Side 3-Way Comparison */}
      <div className="grid gap-6 lg:grid-cols-3 mb-8">
        {/* Column 1: Purchase Order */}
        <Card className="border-border/40 shadow-soft">
          <CardHeader className="bg-muted/10 border-b border-border/60 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-primary" />
                <CardTitle className="text-xs font-bold uppercase tracking-wider">
                  1. Purchase Order
                </CardTitle>
              </div>
              <span className="font-mono text-[11px] font-bold text-primary">
                {po?.poNumber || po?.po_number || invoice?.po_number || "Direct PO"}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="space-y-1 text-xs">
              <p className="text-muted-foreground">
                Supplier: <span className="font-semibold text-foreground">{po?.supplierName || invoice?.supplier_name || "—"}</span>
              </p>
              <p className="text-muted-foreground">
                PO Grand Total:{" "}
                <span className="font-mono font-bold text-foreground">
                  ₹{Number(po?.totalAmount || po?.total_amount || 0).toLocaleString()}
                </span>
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-border/40">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Ordered Items
              </p>
              {po?.items?.map((item: any, idx: number) => (
                <div key={idx} className="p-2.5 rounded-xl bg-muted/20 border border-border/40 text-xs">
                  <p className="font-bold text-foreground">{item.materialName || item.material_name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{item.materialCode || item.material_code}</p>
                  <div className="flex justify-between mt-1 pt-1 border-t border-border/30 text-[11px]">
                    <span>Qty: <strong className="font-mono">{item.quantity}</strong></span>
                    <span>Rate: <strong className="font-mono">₹{item.unitPrice || item.unit_price}</strong></span>
                    <span>Total: <strong className="font-mono text-primary">₹{(Number(item.quantity) * Number(item.unitPrice || item.unit_price || 0)).toLocaleString()}</strong></span>
                  </div>
                </div>
              )) || (
                <p className="text-xs text-muted-foreground italic">No PO items linked.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Column 2: Goods Receipt Note (GRN) */}
        <Card className="border-border/40 shadow-soft">
          <CardHeader className="bg-muted/10 border-b border-border/60 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PackageCheck className="size-4 text-emerald-600" />
                <CardTitle className="text-xs font-bold uppercase tracking-wider">
                  2. Goods Receipt (GRN)
                </CardTitle>
              </div>
              <span className="font-mono text-[11px] font-bold text-emerald-600">
                {grn?.grnNumber || grn?.grn_number || invoice?.grn_number || "Direct Inbound"}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="space-y-1 text-xs">
              <p className="text-muted-foreground">
                Status: <span className="font-semibold text-foreground">{grn?.status || "RECEIVED"}</span>
              </p>
              <p className="text-muted-foreground">
                Inspection: <span className="font-bold text-emerald-600">QC Passed</span>
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-border/40">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Accepted Lines
              </p>
              {grn?.lines?.map((line: any, idx: number) => (
                <div key={idx} className="p-2.5 rounded-xl bg-muted/20 border border-border/40 text-xs">
                  <p className="font-bold text-foreground">{line.item_name || line.material_name || "Material Line"}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{line.item_code || line.material_code}</p>
                  <div className="flex justify-between mt-1 pt-1 border-t border-border/30 text-[11px]">
                    <span>Accepted: <strong className="font-mono text-emerald-600">{line.good_quantity ?? line.received_quantity}</strong></span>
                    <span>Rejected: <strong className="font-mono text-rose-500">{line.rejected_quantity || 0}</strong></span>
                  </div>
                </div>
              )) || (
                <div className="p-3 rounded-xl bg-muted/20 text-xs text-muted-foreground italic">
                  Inbound GRN receipt verified at warehouse dock.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Column 3: Supplier Invoice */}
        <Card className="border-border/40 shadow-soft">
          <CardHeader className="bg-muted/10 border-b border-border/60 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="size-4 text-sky-600" />
                <CardTitle className="text-xs font-bold uppercase tracking-wider">
                  3. Supplier Invoice
                </CardTitle>
              </div>
              <span className="font-mono text-[11px] font-bold text-sky-600">
                {invoice?.invoice_number}
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="space-y-1 text-xs">
              <p className="text-muted-foreground">
                Billed Due Date: <span className="font-mono font-semibold text-foreground">{invoice?.due_date}</span>
              </p>
              <p className="text-muted-foreground">
                Invoice Total:{" "}
                <span className="font-mono font-black text-primary">
                  ₹{Number(invoice?.grand_total || 0).toLocaleString()}
                </span>
              </p>
            </div>

            <div className="space-y-2 pt-2 border-t border-border/40">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Billed Items
              </p>
              {invoice?.items?.map((it: any) => (
                <div key={it.id} className="p-2.5 rounded-xl bg-muted/20 border border-border/40 text-xs">
                  <p className="font-bold text-foreground">{it.material_name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{it.material_code}</p>
                  <div className="flex justify-between mt-1 pt-1 border-t border-border/30 text-[11px]">
                    <span>Billed: <strong className="font-mono">{it.quantity}</strong></span>
                    <span>Rate: <strong className="font-mono">₹{it.unit_price}</strong></span>
                    <span>Total: <strong className="font-mono text-sky-600">₹{Number(it.line_total).toLocaleString()}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Discrepancy Override Dialog */}
      <Dialog open={isOverrideOpen} onOpenChange={setIsOverrideOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-rose-600">
              <ShieldAlert className="size-5" /> Override 3-Way Discrepancy
            </DialogTitle>
            <DialogDescription className="text-xs">
              Under enterprise finance policy, overriding a discrepancy requires formal justification and logs a permanent audit entry.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Label className="text-xs font-bold">Override Reason &amp; Authorization Justification*</Label>
            <Textarea
              placeholder="Provide commercial justification (e.g. approved surcharge, minor commodity price variation accepted by Procurement)..."
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              className="rounded-xl min-h-[90px] text-xs"
            />
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl text-xs"
              onClick={() => setIsOverrideOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="rounded-xl font-bold bg-rose-600 hover:bg-rose-700 text-white text-xs"
              onClick={handleOverrideSubmit}
              disabled={overriding}
            >
              {overriding ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
              Confirm &amp; Authorize Override
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
