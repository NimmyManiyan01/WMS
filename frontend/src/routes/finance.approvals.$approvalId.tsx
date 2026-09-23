import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  Building2,
  Warehouse,
  User,
  Calendar,
  CreditCard,
  Info,
  MessageSquare,
  History,
  Clock,
  PauseCircle,
  PlayCircle,
  AlertTriangle,
  PieChart,
} from "lucide-react";
import { AppShell, StatusBadge } from "@/components/wms/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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

export const Route = createFileRoute("/finance/approvals/$approvalId")({
  component: ApprovalDetail,
});

function ApprovalDetail() {
  const { approvalId } = Route.useParams();
  const navigate = useNavigate();
  const [po, setPo] = useState<any>(null);
  const [budget, setBudget] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // Rejection modal state
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  // Hold modal state
  const [isHolding, setIsHolding] = useState(false);
  const [holdReason, setHoldReason] = useState("BUDGET_EXCEEDED");
  const [holdComment, setHoldComment] = useState("");

  // Release hold state
  const [isReleasing, setIsReleasing] = useState(false);
  const [releaseNotes, setReleaseNotes] = useState("");

  const fetchPo = async () => {
    try {
      setLoading(true);
      const [poData, budgetData] = await Promise.all([
        api.getPurchaseOrder(approvalId),
        api.checkPoBudget(approvalId).catch(() => null),
      ]);
      setPo(poData);
      setBudget(budgetData);
    } catch (error) {
      console.error("Failed to fetch PO or Budget:", error);
      toast.error("Failed to load purchase order details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPo();
  }, [approvalId]);

  const handleApprove = async () => {
    try {
      setProcessing(true);
      await api.approvePurchaseOrder(approvalId);
      toast.success("Purchase order approved successfully!");
      navigate({ to: "/finance/approvals" });
    } catch (error: any) {
      toast.error("Approval failed: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    try {
      setProcessing(true);
      await api.rejectPurchaseOrder(approvalId, rejectionReason);
      toast.success("Purchase order rejected");
      navigate({ to: "/finance/approvals" });
    } catch (error: any) {
      toast.error("Rejection failed: " + error.message);
    } finally {
      setProcessing(false);
      setIsRejecting(false);
    }
  };

  const handlePutOnHold = async () => {
    if (!holdReason) {
      toast.error("Please select a hold reason");
      return;
    }
    try {
      setProcessing(true);
      await api.putPoOnHold(approvalId, {
        hold_reason: holdReason,
        hold_comment: holdComment || undefined,
      });
      toast.success("Purchase order placed on hold");
      setIsHolding(false);
      await fetchPo();
    } catch (error: any) {
      toast.error("Failed to put PO on hold: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReleaseHold = async () => {
    try {
      setProcessing(true);
      await api.releasePoHold(approvalId, {
        notes: releaseNotes || "Hold released by Finance Officer",
      });
      toast.success("Purchase order released from hold");
      setIsReleasing(false);
      await fetchPo();
    } catch (error: any) {
      toast.error("Failed to release hold: " + error.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <AppShell title="Loading Proposal..." subtitle="Please wait">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (!po) return null;

  const isPoOnHold = po.status === "FINANCE_HOLD" || po.status === "ON_HOLD";

  // Backend authoritative calculation values
  const subtotal = Number(po.subtotal || 0);
  const discountAmount = Number(po.discountAmount ?? po.discount_amount ?? 0);
  const discountPercentage = Number(po.discountPercentage ?? po.discount_percentage ?? (subtotal > 0 ? (discountAmount / subtotal) * 100 : 0));
  const taxAmount = Number(po.taxAmount ?? po.tax_amount ?? 0);
  const taxPercentage = Number(po.taxPercentage ?? po.tax_percentage ?? 0);
  const freightCharges = Number(po.freightCharges ?? po.freight_charges ?? 0);
  const additionalCharges = Number(po.additionalCharges ?? po.additional_charges ?? 0);
  const grandTotal = Number(po.totalAmount ?? po.total_amount ?? 0);

  // Budget calculations
  const budgetStatus = budget?.status || (budget?.remaining_after_po < 0 ? "EXCEEDED" : "AVAILABLE");

  return (
    <AppShell
      title={`Review PO Proposal: ${po.poNumber || po.po_number}`}
      subtitle={`Submitted on ${po.createdAt || po.created_at ? new Date(po.createdAt || po.created_at).toLocaleString() : "—"}`}
      actions={
        <Button
          variant="outline"
          className="rounded-xl"
          onClick={() => navigate({ to: "/finance/approvals" })}
        >
          <ArrowLeft className="mr-2 size-4" /> Back to Queue
        </Button>
      }
    >
      {/* On-Hold Alert Banner */}
      {isPoOnHold && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <PauseCircle className="size-6 text-amber-500 shrink-0" />
            <div>
              <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                Purchase Order Placed On Finance Hold
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Reason: <span className="font-semibold">{po.holdReason || po.hold_reason || "Finance Review"}</span>
                {po.holdComment || po.hold_comment ? ` — "${po.holdComment || po.hold_comment}"` : ""}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold"
            onClick={() => setIsReleasing(true)}
          >
            <PlayCircle className="size-4 mr-1.5" /> Release Hold
          </Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: PO Info, Budget Check & Materials */}
        <div className="lg:col-span-2 space-y-6">
          {/* PO Information */}
          <Card className="border-border/40 shadow-soft">
            <CardHeader className="bg-muted/10 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Info className="size-4 text-primary" />
                  <CardTitle className="text-sm font-bold uppercase tracking-wider">
                    PO Information
                  </CardTitle>
                </div>
                <StatusBadge status={po.status} />
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <InfoField label="PO Number" value={po.poNumber || po.po_number} mono />
                <InfoField
                  label="PO Date"
                  value={po.createdAt || po.created_at ? new Date(po.createdAt || po.created_at).toLocaleDateString() : "—"}
                />
                <InfoField label="Supplier" value={po.supplierName || po.supplier_name} icon={Building2} />
                <InfoField label="Warehouse" value={po.warehouseId || po.warehouse_id} icon={Warehouse} />
                <InfoField label="Procurement Officer" value={po.procurementOfficer || po.procurement_officer || "Procurement Team"} icon={User} />
                <InfoField
                  label="Expected Delivery"
                  value={po.expectedDeliveryDate || po.expected_delivery_date || "Not Specified"}
                  icon={Calendar}
                />
              </div>
            </CardContent>
          </Card>

          {/* Department Budget Check Card */}
          <Card className="border-border/40 shadow-soft overflow-hidden">
            <CardHeader className="bg-muted/10 border-b border-border/60">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PieChart className="size-4 text-primary" />
                  <CardTitle className="text-sm font-bold uppercase tracking-wider">
                    Department Budget Check
                  </CardTitle>
                </div>
                <span
                  className={cn(
                    "text-[10px] font-black uppercase px-2.5 py-1 rounded-full border",
                    budgetStatus === "AVAILABLE" || budgetStatus === "SUFFICIENT"
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                      : budgetStatus === "WARNING"
                        ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                        : "bg-rose-500/10 text-rose-600 border-rose-500/30",
                  )}
                >
                  Budget Status: {budgetStatus}
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {budget ? (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="p-3.5 rounded-xl bg-muted/20 border border-border/50">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Approved Budget</p>
                      <p className="text-base font-black text-foreground font-mono mt-1">
                        ₹{Number(budget.allocated_amount || 0).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{budget.department} ({budget.financial_year})</p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-muted/20 border border-border/50">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Utilized Budget</p>
                      <p className="text-base font-black text-amber-600 font-mono mt-1">
                        ₹{(Number(budget.committed_amount || 0) + Number(budget.consumed_amount || 0)).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Committed + Consumed
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-muted/20 border border-border/50">
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">Available Budget</p>
                      <p className="text-base font-black text-emerald-600 font-mono mt-1">
                        ₹{Number(budget.available_amount || 0).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Before current PO</p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-border/40">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/10">
                      <span className="text-xs font-bold text-muted-foreground">Current PO Amount:</span>
                      <span className="text-sm font-black font-mono text-primary">
                        ₹{grandTotal.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/40">
                      <span className="text-xs font-bold text-muted-foreground">Remaining After PO:</span>
                      <span
                        className={cn(
                          "text-sm font-black font-mono",
                          budget.remaining_after_po < 0 ? "text-rose-600" : "text-emerald-600",
                        )}
                      >
                        ₹{Number(budget.remaining_after_po || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground italic py-2">
                  Department budget details are automatically calculated upon PO submission.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Material Details */}
          <Card className="border-border/40 shadow-soft overflow-hidden">
            <CardHeader className="bg-muted/10 border-b border-border/60">
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-primary" />
                <CardTitle className="text-sm font-bold uppercase tracking-wider">
                  Material Details
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="bg-muted/40 border-b border-border/60 text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                    <th className="p-4">Material</th>
                    <th className="p-4 text-right">Quantity</th>
                    <th className="p-4">UOM</th>
                    <th className="p-4 text-right">Unit Price</th>
                    <th className="p-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {po.items?.map((item: any, idx: number) => {
                    const q = Number(item.quantity || 0);
                    const p = Number(item.unitPrice || item.unit_price || 0);
                    return (
                      <tr key={idx} className="hover:bg-muted/5 transition-colors">
                        <td className="p-4">
                          <p className="font-semibold text-foreground">{item.materialName || item.material_name}</p>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {item.materialCode || item.material_code}
                          </span>
                        </td>
                        <td className="p-4 text-right font-mono font-medium">{q}</td>
                        <td className="p-4 text-muted-foreground">{item.uom || "PCS"}</td>
                        <td className="p-4 text-right font-mono">₹{p.toLocaleString()}</td>
                        <td className="p-4 text-right font-mono font-bold text-foreground">
                          ₹{(q * p).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Supporting Information */}
          <Card className="border-border/40 shadow-soft">
            <CardHeader className="bg-muted/10 border-b border-border/60">
              <div className="flex items-center gap-2">
                <MessageSquare className="size-4 text-primary" />
                <CardTitle className="text-sm font-bold uppercase tracking-wider">
                  Supporting Information
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div>
                <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                  Procurement Selection Reason
                </Label>
                <p className="mt-1 text-sm font-medium text-foreground bg-primary/5 p-3 rounded-xl border border-primary/10">
                  {po.selectionReason || po.selection_reason || "Competitive quotation matching quality specs"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* PO Approval History & Audit Trail */}
          <Card className="border-border/40 shadow-soft overflow-hidden">
            <CardHeader className="bg-muted/10 border-b border-border/60">
              <div className="flex items-center gap-2">
                <History className="size-4 text-primary" />
                <CardTitle className="text-sm font-bold uppercase tracking-wider">
                  PO Approval History &amp; Audit Trail
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {!po.history || po.history.length === 0 ? (
                <div className="p-4 rounded-xl bg-muted/20 border border-border/40 text-center text-xs text-muted-foreground italic">
                  No approval history events recorded yet.
                </div>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/60">
                  {po.history.map((h: any, idx: number) => {
                    const status = String(h.status || "").toUpperCase();
                    const isApproved = status.includes("APPROV");
                    const isRejected = status.includes("REJECT");
                    const isHold = status.includes("HOLD");

                    return (
                      <div key={h.id || idx} className="relative flex items-start gap-4">
                        <div
                          className={cn(
                            "absolute -left-6 top-1 size-5 rounded-full border-2 bg-background flex items-center justify-center",
                            isApproved
                              ? "border-emerald-600 text-emerald-600"
                              : isRejected
                                ? "border-rose-600 text-rose-600"
                                : isHold
                                  ? "border-amber-500 text-amber-500"
                                  : "border-primary text-primary",
                          )}
                        >
                          {isApproved ? (
                            <CheckCircle2 className="size-3" />
                          ) : isRejected ? (
                            <XCircle className="size-3" />
                          ) : isHold ? (
                            <PauseCircle className="size-3" />
                          ) : (
                            <Clock className="size-3" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1 bg-muted/20 border border-border/40 rounded-xl p-3.5 space-y-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span
                              className={cn(
                                "text-[10px] font-black uppercase px-2 py-0.5 rounded-md",
                                isApproved
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : isRejected
                                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                                    : isHold
                                      ? "bg-amber-50 text-amber-700 border border-amber-200"
                                      : "bg-muted text-muted-foreground",
                              )}
                            >
                              {h.status}
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground">
                              {h.createdAt || h.created_at
                                ? new Date(h.createdAt || h.created_at).toLocaleString()
                                : "—"}
                            </span>
                          </div>

                          <p className="text-xs font-bold text-foreground">
                            Action by:{" "}
                            <span className="text-primary font-mono">
                              {h.actorName || h.actor_name || "System / Officer"}
                            </span>
                          </p>

                          {h.comments && (
                            <p className="text-xs text-muted-foreground leading-relaxed italic bg-background/60 p-2.5 rounded-lg border border-border/30 mt-1">
                              "{h.comments}"
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Financial Summary & Actions */}
        <div className="space-y-6">
          <Card className="border-border/40 shadow-soft overflow-hidden sticky top-24">
            <CardHeader className="bg-primary text-primary-foreground">
              <div className="flex items-center gap-2">
                <CreditCard className="size-4" />
                <CardTitle className="text-sm font-bold uppercase tracking-wider">
                  Authoritative Financial Summary
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <p className="text-xs text-muted-foreground">
                Authoritative single-source calculations from backend
              </p>
              <SummaryRow label="Subtotal" value={subtotal} />
              <SummaryRow
                label={`Discount (${discountPercentage.toFixed(2)}%)`}
                value={discountAmount}
                isNegative
              />
              <SummaryRow
                label={`Taxable Amount`}
                value={subtotal - discountAmount}
              />
              <SummaryRow
                label={`Tax (GST ${taxPercentage.toFixed(2)}%)`}
                value={taxAmount}
              />
              <SummaryRow label="Freight" value={freightCharges} />
              {additionalCharges > 0 && (
                <SummaryRow label="Additional Charges" value={additionalCharges} />
              )}

              <div className="pt-4 border-t border-border mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-foreground uppercase tracking-tight">
                    Grand Total
                  </span>
                  <span className="text-xl font-black text-primary font-mono">
                    ₹ {grandTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              {po.paymentTerms || po.payment_terms ? (
                <div className="mt-4 p-3 rounded-xl bg-muted/30 border border-border/60">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                    Payment Terms
                  </p>
                  <p className="text-sm font-semibold">{po.paymentTerms || po.payment_terms}</p>
                </div>
              ) : null}

              {/* Action Buttons */}
              <div className="space-y-3 pt-6 border-t border-border/40">
                {!isRejecting && !isHolding && !isReleasing && (
                  <>
                    <Button
                      className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-soft font-bold text-xs"
                      onClick={handleApprove}
                      disabled={processing || isPoOnHold}
                    >
                      {processing ? (
                        <Loader2 className="size-4 animate-spin mr-2" />
                      ) : (
                        <CheckCircle2 className="size-4 mr-2" />
                      )}
                      Approve PO Proposal
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full h-10 rounded-xl border-amber-500/30 text-amber-600 hover:bg-amber-500/10 font-bold text-xs"
                      onClick={() => (isPoOnHold ? setIsReleasing(true) : setIsHolding(true))}
                      disabled={processing}
                    >
                      <PauseCircle className="size-4 mr-2" />
                      {isPoOnHold ? "Release Hold" : "Put On Hold"}
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full h-10 rounded-xl border-rose-500/30 text-rose-600 hover:bg-rose-500/10 font-bold text-xs"
                      onClick={() => setIsRejecting(true)}
                      disabled={processing}
                    >
                      <XCircle className="size-4 mr-2" />
                      Reject Proposal
                    </Button>
                  </>
                )}

                {/* Rejection Form */}
                {isRejecting && (
                  <div className="space-y-3 animate-in slide-in-from-right-4">
                    <Label className="text-xs font-bold text-rose-600">
                      Rejection Reason*
                    </Label>
                    <Textarea
                      placeholder="Please specify why this PO is being rejected..."
                      className="rounded-xl min-h-[90px] border-rose-500/30 text-xs"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
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
                  <div className="space-y-3 animate-in slide-in-from-right-4">
                    <Label className="text-xs font-bold text-amber-600">
                      Reason for Hold*
                    </Label>
                    <Select value={holdReason} onValueChange={setHoldReason}>
                      <SelectTrigger className="rounded-xl h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BUDGET_EXCEEDED">Budget Exceeded</SelectItem>
                        <SelectItem value="PRICE_DISCREPANCY">Price Discrepancy</SelectItem>
                        <SelectItem value="TAX_MISMATCH">Tax / GST Mismatch</SelectItem>
                        <SelectItem value="VENDOR_HOLD">Vendor Compliance Hold</SelectItem>
                        <SelectItem value="DOCUMENTATION_PENDING">Documentation Pending</SelectItem>
                        <SelectItem value="OTHER">Other Reason</SelectItem>
                      </SelectContent>
                    </Select>
                    <Textarea
                      placeholder="Add detailed comment explaining hold justification..."
                      className="rounded-xl min-h-[80px] border-amber-500/30 text-xs"
                      value={holdComment}
                      onChange={(e) => setHoldComment(e.target.value)}
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
                        onClick={handlePutOnHold}
                        disabled={processing}
                      >
                        Confirm Put On Hold
                      </Button>
                    </div>
                  </div>
                )}

                {/* Release Hold Form */}
                {isReleasing && (
                  <div className="space-y-3 animate-in slide-in-from-right-4">
                    <Label className="text-xs font-bold text-amber-600">
                      Resolution Notes / Justification
                    </Label>
                    <Textarea
                      placeholder="Notes for releasing hold..."
                      className="rounded-xl min-h-[80px] border-amber-500/30 text-xs"
                      value={releaseNotes}
                      onChange={(e) => setReleaseNotes(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="flex-1 rounded-xl text-xs"
                        onClick={() => setIsReleasing(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="flex-[2] rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                        onClick={handleReleaseHold}
                        disabled={processing}
                      >
                        Confirm Release
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
        {isNegative ? "- " : ""}₹ {Number(value || 0).toLocaleString()}
      </span>
    </div>
  );
}
