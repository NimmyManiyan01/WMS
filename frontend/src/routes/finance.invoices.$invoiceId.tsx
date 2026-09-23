import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  PauseCircle,
  Loader2,
  FileText,
  Building2,
  Calendar,
  CreditCard,
  Info,
  Layers,
  History,
  Clock,
  DollarSign,
  AlertTriangle,
  Receipt,
  FileSpreadsheet,
} from "lucide-react";
import { AppShell, StatusBadge } from "@/components/wms/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { requireRole } from "@/lib/auth-utils";

export const Route = createFileRoute("/finance/invoices/$invoiceId")({
  beforeLoad: () => requireRole("FINANCE"),
  component: InvoiceDetail,
});

function InvoiceDetail() {
  const { invoiceId } = Route.useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<any>(null);
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Rejection modal
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  // Hold modal
  const [isHolding, setIsHolding] = useState(false);
  const [holdReason, setHoldReason] = useState("PRICE_DISCREPANCY");
  const [holdComment, setHoldComment] = useState("");

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const [invData, auditData] = await Promise.all([
        api.getSupplierInvoice(invoiceId),
        api.getFinanceAuditTrail({
          entity_type: "SUPPLIER_INVOICE",
          entity_id: invoiceId,
        }).catch(() => []),
      ]);
      setInvoice(invData);
      setAuditEvents(auditData || []);
    } catch (e: any) {
      toast.error("Failed to load invoice details: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoice();
  }, [invoiceId]);

  const handleMatch = async () => {
    try {
      setProcessing(true);
      const matchRes = await api.matchSupplierInvoice(invoiceId);
      toast.success(`Matching completed: ${matchRes.match_status}`);
      await fetchInvoice();
    } catch (e: any) {
      toast.error("Match failed: " + e.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleApprove = async () => {
    try {
      setProcessing(true);
      await api.approveSupplierInvoice(invoiceId, {
        approved: true,
        notes: "Approved by Finance Officer for disbursement",
      });
      toast.success("Invoice approved for payment!");
      await fetchInvoice();
    } catch (e: any) {
      toast.error("Approval failed: " + e.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason) {
      toast.error("Please provide rejection reason");
      return;
    }
    try {
      setProcessing(true);
      await api.approveSupplierInvoice(invoiceId, {
        approved: false,
        rejection_reason: rejectionReason,
      });
      toast.success("Invoice rejected");
      setIsRejecting(false);
      await fetchInvoice();
    } catch (e: any) {
      toast.error("Rejection failed: " + e.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleHold = async () => {
    try {
      setProcessing(true);
      await api.holdSupplierInvoice(invoiceId, {
        hold_reason: holdReason,
        hold_comment: holdComment || undefined,
      });
      toast.success("Invoice placed on hold");
      setIsHolding(false);
      await fetchInvoice();
    } catch (e: any) {
      toast.error("Hold action failed: " + e.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <AppShell title="Loading Invoice..." subtitle="Please wait">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (!invoice) return null;

  return (
    <AppShell
      title={`Supplier Invoice: ${invoice.invoice_number}`}
      subtitle={`Billed on ${invoice.invoice_date} · Due ${invoice.due_date}`}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => navigate({ to: "/finance/invoices" })}
          >
            <ArrowLeft className="mr-1.5 size-4" /> Back to Invoices
          </Button>
          {invoice.match_status === "PENDING" && (
            <Button
              className="rounded-xl font-bold bg-sky-600 hover:bg-sky-700 text-white"
              onClick={handleMatch}
              disabled={processing}
            >
              {processing ? (
                <Loader2 className="size-4 animate-spin mr-1.5" />
              ) : (
                <Layers className="size-4 mr-1.5" />
              )}
              Run 3-Way Match
            </Button>
          )}
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Details, Lines & Audit */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header Card */}
          <Card className="border-border/40 shadow-soft">
            <CardHeader className="bg-muted/10 border-b border-border/60 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Receipt className="size-4 text-primary" />
                  <CardTitle className="text-sm font-bold uppercase tracking-wider">
                    Invoice Metadata
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={invoice.match_status} />
                  <StatusBadge status={invoice.status} />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
                <InfoField label="Invoice Number" value={invoice.invoice_number} mono />
                <InfoField
                  label="Supplier"
                  value={invoice.supplier_name || "Supplier"}
                  icon={Building2}
                />
                <InfoField
                  label="Purchase Order"
                  value={invoice.po_number || (invoice.po_id ? invoice.po_id.slice(0, 8) : "Direct")}
                  mono
                />
                <InfoField label="Invoice Date" value={invoice.invoice_date} icon={Calendar} />
                <InfoField label="Due Date" value={invoice.due_date} icon={Calendar} />
                <InfoField
                  label="Payment Terms"
                  value={invoice.payment_terms || "Net 30"}
                  icon={CreditCard}
                />
              </div>

              {invoice.hold_reason && (
                <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs">
                  <p className="font-bold text-amber-700 dark:text-amber-300">
                    Hold Reason: {invoice.hold_reason}
                  </p>
                  {invoice.hold_comment && (
                    <p className="text-muted-foreground mt-0.5">{invoice.hold_comment}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Line Items Table */}
          <Card className="border-border/40 shadow-soft overflow-hidden">
            <CardHeader className="bg-muted/10 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-primary" />
                <CardTitle className="text-sm font-bold uppercase tracking-wider">
                  Billed Line Items
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/40 border-b border-border/60 text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                    <th className="p-3.5">Material</th>
                    <th className="p-3.5 text-right">Qty</th>
                    <th className="p-3.5">UOM</th>
                    <th className="p-3.5 text-right">Unit Price</th>
                    <th className="p-3.5 text-right">Tax</th>
                    <th className="p-3.5 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {invoice.items?.map((it: any) => (
                    <tr key={it.id} className="hover:bg-muted/5 transition-colors">
                      <td className="p-3.5">
                        <p className="font-semibold text-foreground">{it.material_name}</p>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          {it.material_code}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono font-medium">{it.quantity}</td>
                      <td className="p-3.5 text-muted-foreground">{it.uom || "PCS"}</td>
                      <td className="p-3.5 text-right font-mono">
                        ₹{Number(it.unit_price || 0).toLocaleString()}
                      </td>
                      <td className="p-3.5 text-right font-mono text-muted-foreground">
                        ₹{Number(it.tax || 0).toLocaleString()}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-foreground">
                        ₹{Number(it.line_total || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Audit History Timeline */}
          <Card className="border-border/40 shadow-soft overflow-hidden">
            <CardHeader className="bg-muted/10 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <History className="size-4 text-primary" />
                <CardTitle className="text-sm font-bold uppercase tracking-wider">
                  Audit Trail &amp; Life Cycle
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {auditEvents.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground italic">
                  No previous audit actions recorded for this invoice.
                </div>
              ) : (
                <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/60">
                  {auditEvents.map((ev: any) => (
                    <div key={ev.id} className="relative flex items-start gap-4">
                      <div className="absolute -left-6 top-1 size-5 rounded-full border-2 bg-background flex items-center justify-center border-primary text-primary">
                        <Clock className="size-3" />
                      </div>
                      <div className="min-w-0 flex-1 bg-muted/20 border border-border/40 rounded-xl p-3 space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-foreground font-mono">{ev.action}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(ev.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-muted-foreground">
                          By: <span className="font-mono text-primary font-semibold">{ev.user_username}</span> ({ev.user_role})
                        </p>
                        {ev.reason && (
                          <p className="italic text-foreground/80 mt-1">"{ev.reason}"</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Totals, Balances & AP Actions */}
        <div className="space-y-6">
          <Card className="border-border/40 shadow-soft overflow-hidden sticky top-24">
            <CardHeader className="bg-primary text-primary-foreground">
              <div className="flex items-center gap-2">
                <CreditCard className="size-4" />
                <CardTitle className="text-sm font-bold uppercase tracking-wider">
                  Financial Settlement
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              <SummaryRow label="Subtotal" value={invoice.subtotal} />
              <SummaryRow
                label="Discount"
                value={invoice.discount_amount}
                isNegative
              />
              <SummaryRow label="Tax Amount" value={invoice.tax_amount} />
              <SummaryRow label="Freight" value={invoice.freight_charges} />
              {Number(invoice.other_charges || 0) > 0 && (
                <SummaryRow label="Other Charges" value={invoice.other_charges} />
              )}

              <div className="pt-3 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground uppercase tracking-tight">
                    Grand Total
                  </span>
                  <span className="text-lg font-black text-primary font-mono">
                    ₹{Number(invoice.grand_total || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-border/40 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Paid Amount:</span>
                  <span className="font-mono font-bold text-emerald-600">
                    ₹{Number(invoice.paid_amount || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Balance Due:</span>
                  <span className="font-mono font-black text-rose-600">
                    ₹{Number(invoice.outstanding_amount ?? invoice.grand_total ?? 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-border/40 space-y-2">
                {!isRejecting && !isHolding && (
                  <>
                    {(invoice.status === "READY_FOR_APPROVAL" ||
                      invoice.status === "RECEIVED" ||
                      invoice.match_status === "MATCHED" ||
                      invoice.match_status === "OVERRIDDEN") && (
                      <Button
                        className="w-full h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                        onClick={handleApprove}
                        disabled={processing}
                      >
                        {processing ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <CheckCircle2 className="size-4 mr-1.5" />}
                        Approve for Payment
                      </Button>
                    )}

                    {Number(invoice.outstanding_amount || 0) > 0 &&
                      (invoice.status === "APPROVED" || invoice.status === "PARTIALLY_PAID") && (
                        <Button
                          className="w-full h-10 rounded-xl font-bold text-xs"
                          asChild
                        >
                          <Link to="/finance/payments">
                            <DollarSign className="size-4 mr-1.5" /> Record Payment
                          </Link>
                        </Button>
                      )}

                    {invoice.status !== "ON_HOLD" && (
                      <Button
                        variant="outline"
                        className="w-full h-9 rounded-xl border-amber-500/30 text-amber-600 hover:bg-amber-50 font-bold text-xs"
                        onClick={() => setIsHolding(true)}
                        disabled={processing}
                      >
                        <PauseCircle className="size-4 mr-1.5" /> Put On Hold
                      </Button>
                    )}

                    {invoice.status !== "REJECTED" && (
                      <Button
                        variant="outline"
                        className="w-full h-9 rounded-xl border-rose-500/30 text-rose-600 hover:bg-rose-50 font-bold text-xs"
                        onClick={() => setIsRejecting(true)}
                        disabled={processing}
                      >
                        <XCircle className="size-4 mr-1.5" /> Reject Invoice
                      </Button>
                    )}
                  </>
                )}

                {/* Rejecting Form */}
                {isRejecting && (
                  <div className="space-y-2 animate-in slide-in-from-right-4">
                    <Label className="text-xs font-bold text-rose-600">Rejection Reason*</Label>
                    <Textarea
                      placeholder="Specify reason for rejection..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="rounded-xl min-h-[70px] text-xs"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 rounded-xl text-xs"
                        onClick={() => setIsRejecting(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="flex-[2] rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
                        onClick={handleReject}
                        disabled={processing}
                      >
                        Confirm Rejection
                      </Button>
                    </div>
                  </div>
                )}

                {/* Hold Form */}
                {isHolding && (
                  <div className="space-y-2 animate-in slide-in-from-right-4">
                    <Label className="text-xs font-bold text-amber-600">Hold Reason*</Label>
                    <Select value={holdReason} onValueChange={setHoldReason}>
                      <SelectTrigger className="rounded-xl h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PRICE_DISCREPANCY">Price Discrepancy</SelectItem>
                        <SelectItem value="QUANTITY_MISMATCH">Quantity Mismatch</SelectItem>
                        <SelectItem value="TAX_MISMATCH">Tax Mismatch</SelectItem>
                        <SelectItem value="PENDING_GRN">Pending GRN Confirmation</SelectItem>
                        <SelectItem value="OTHER">Other Reason</SelectItem>
                      </SelectContent>
                    </Select>
                    <Textarea
                      placeholder="Hold comment..."
                      value={holdComment}
                      onChange={(e) => setHoldComment(e.target.value)}
                      className="rounded-xl min-h-[70px] text-xs"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 rounded-xl text-xs"
                        onClick={() => setIsHolding(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="flex-[2] rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                        onClick={handleHold}
                        disabled={processing}
                      >
                        Confirm Hold
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function InfoField({ label, value, icon: Icon, mono = false }: any) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1.5">
        {Icon && <Icon className="size-3" />} {label}
      </p>
      <p className={cn("text-xs font-semibold text-foreground", mono && "font-mono")}>
        {value || "—"}
      </p>
    </div>
  );
}

function SummaryRow({ label, value, isNegative = false }: any) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground font-medium">{label}</span>
      <span className={cn("font-mono font-bold", isNegative && "text-rose-500")}>
        {isNegative ? "- " : ""}₹{Number(value || 0).toLocaleString()}
      </span>
    </div>
  );
}
