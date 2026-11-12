import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  FileBadge,
  ArrowLeft,
  CheckCircle2,
  Download,
  Trophy,
  Loader2,
  Table as TableIcon,
  MessageSquare,
  Sparkles,
  Eye,
  CheckCircle,
  X,
  XCircle,
  ArrowRight,
  FileCheck2,
  Package,
  Wallet,
  Clock,
  ShieldCheck,
  TrendingDown,
  AlertCircle,
  Truck,
  Info,
  ChevronRight,
  Building2,
} from "lucide-react";
import { AppShell, StatusBadge } from "@/components/wms/app-shell";
import { requireRole } from "@/lib/auth-utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type QuotationsSearch = {
  rfqId?: string;
};

const OTHER_SELECTION_REASON = "Other - Requires Justification";

const selectionReasons = [
  { value: "L1 Cost Effective Bid", detail: "Lowest evaluated commercial cost" },
  { value: "Best Overall Value", detail: "Best combination of cost, quality, delivery, and terms" },
  { value: "Technical Compliance", detail: "Meets all required technical specifications" },
  { value: "Quality Performance", detail: "Strong quality and low rejection history" },
  { value: "Delivery Performance", detail: "Best delivery lead time or on-time performance" },
  { value: "Commercial Terms", detail: "Better payment, warranty, freight, or other commercial terms" },
  { value: "Total Cost Advantage", detail: "Lower overall cost including logistics and service" },
  { value: "Approved Preferred Supplier", detail: "Existing preferred or strategic supplier" },
  { value: "Supplier Performance History", detail: "Strong previous procurement performance" },
  { value: "Capacity & Availability", detail: "Supplier can meet the required quantity or capacity" },
  { value: "Urgent Requirement", detail: "Supplier can meet the required timeline" },
  { value: "Compliance & Certification", detail: "Meets required compliance or certification requirements" },
  { value: "Single / Limited Source", detail: "Limited qualified suppliers are available" },
  { value: "Contract / Rate Agreement", detail: "Supplier is covered by an existing agreement" },
  { value: "After-Sales / Support Advantage", detail: "Better service, warranty, or support" },
  { value: "Negotiated Best Offer", detail: "Supplier provided the best result after negotiation" },
  { value: "Multi-Criteria Evaluation Winner", detail: "Highest weighted evaluation score" },
  { value: OTHER_SELECTION_REASON, detail: "A written business justification is required" },
] as const;

const rejectionReasons = [
  "Price Exceeds Approved Budget",
  "Higher Than Other Qualified Bids",
  "Technical Non-Compliance",
  "Quality Requirements Not Met",
  "Delivery Timeline Not Acceptable",
  "Insufficient Supplier Capacity",
  "Compliance / Certification Issue",
  "Commercial Terms Not Acceptable",
  "Payment Terms Not Acceptable",
  "Supplier Performance Concerns",
  "Incomplete Quotation",
  "Quotation Expired",
  "Supplier Disqualified",
  "Duplicate / Invalid Quotation",
  "Requirement Cancelled",
  "Budget Not Available",
  OTHER_SELECTION_REASON,
] as const;

export const Route = createFileRoute("/procurement/quotations")({
  beforeLoad: () => requireRole(["PROCUREMENT", "MANAGER", "ADMIN", "SUPERUSER"]),
  component: Quotations,
  validateSearch: (search: Record<string, unknown>): QuotationsSearch => {
    return {
      rfqId: (search.rfqId as string) || undefined,
    };
  },
});

function Quotations() {
  const navigate = useNavigate();
  const { rfqId } = Route.useSearch();
  const [quotations, setQuotations] = useState<any[]>([]);
  const [rfq, setRfq] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOlderQuotations, setShowOlderQuotations] = useState(false);
  const [inspectQuotation, setInspectQuotation] = useState<any | null>(null);

  // Selection Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"SELECT" | "REJECT">("SELECT");
  const [submitting, setSubmitting] = useState(false);
  const [targetQuotationId, setTargetQuotationId] = useState("");
  const [targetSupplierId, setTargetSupplierId] = useState("");
  const [reason, setReason] = useState("");
  const [procurementComments, setProcurementComments] = useState("");
  const [rejectionJustification, setRejectionJustification] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [quotesData, rfqData] = await Promise.all([
        api.getQuotations(rfqId),
        rfqId ? api.getRfq(rfqId) : Promise.resolve(null),
      ]);

      setQuotations(Array.isArray(quotesData) ? quotesData : []);
      setRfq(rfqData);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      toast.error("Failed to load quotations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [rfqId]);

  const selectionFinalized = quotations.some((quotation) => quotation.status === "Selected");
  const latestQuotationIds = new Set<string>();
  const latestQuotationsBySupplier = new Map<string, any>();

  quotations.forEach((quotation) => {
    const supplierKey =
      quotation.supplierId ||
      quotation.supplier_id ||
      quotation.supplierInfo?.supplierName ||
      quotation.supplierName ||
      quotation.id;
    const existingQuotation = latestQuotationsBySupplier.get(supplierKey);
    const quotationDate = new Date(quotation.createdAt || quotation.created_at || 0).getTime() || 0;
    const existingDate = existingQuotation
      ? new Date(existingQuotation.createdAt || existingQuotation.created_at || 0).getTime() || 0
      : -1;

    if (!existingQuotation || quotationDate >= existingDate) {
      latestQuotationsBySupplier.set(supplierKey, quotation);
    }
  });

  latestQuotationsBySupplier.forEach((quotation) => latestQuotationIds.add(quotation.id));
  const olderQuotationCount = quotations.length - latestQuotationIds.size;
  const comparisonQuotations = quotations.filter(
    (quotation) => showOlderQuotations || latestQuotationIds.has(quotation.id),
  );
  const selectedReasonDetail = selectionReasons.find((selectionReason) => selectionReason.value === reason)?.detail;

  const handleOpenModal = (quotationId: string, supplierId: string, mode: "SELECT" | "REJECT") => {
    setTargetQuotationId(quotationId);
    setTargetSupplierId(supplierId);
    setModalMode(mode);
    setReason(mode === "SELECT" ? "Best Overall Value" : "");
    setProcurementComments("");
    setRejectionJustification("");
    setIsModalOpen(true);
  };

  const handleAction = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const effectiveRfqId = rfqId || quotations.find((q) => q.id === targetQuotationId)?.rfqId;

    if (!targetQuotationId) {
      toast.error("Required selection IDs are missing.");
      return;
    }

    if (!reason.trim()) {
      toast.error(`Please select a ${modalMode === "SELECT" ? "selection" : "rejection"} reason.`);
      return;
    }

    if (modalMode === "SELECT" && reason === OTHER_SELECTION_REASON && !procurementComments.trim()) {
      toast.error("Please provide a justification for the other selection reason.");
      return;
    }

    if (modalMode === "REJECT" && reason === OTHER_SELECTION_REASON && !rejectionJustification.trim()) {
      toast.error("Please provide a justification for the other rejection reason.");
      return;
    }

    try {
      setSubmitting(true);

      if (modalMode === "SELECT") {
        if (!effectiveRfqId || !targetSupplierId) {
          toast.error("Missing RFQ or Supplier ID for selection");
          return;
        }

        const result = await api.selectSupplier(effectiveRfqId, {
          supplier_id: targetSupplierId,
          quotation_id: targetQuotationId,
          selection_reason: reason,
          selection_comments: procurementComments,
        });
        toast.success(
          result.status === "already_saved"
            ? `Selection already saved as ${result.po_number}`
            : "Supplier selected and PO proposal generated",
        );
      } else {
        await api.rejectQuotation(
          targetQuotationId,
          reason === OTHER_SELECTION_REASON
            ? `${reason}: ${rejectionJustification.trim()}`
            : reason,
        );
        toast.success("Quotation rejected");
      }

      setIsModalOpen(false);
      fetchData(); // Refresh to show updated statuses

      // Reset form
      setReason("");
      setProcurementComments("");
      setRejectionJustification("");
    } catch (error: any) {
      toast.error(`Action failed: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // Group line items by code to compare pricing
  const uniqueItemCodes = Array.from(
    new Set(
      comparisonQuotations.flatMap((q) =>
        q.lines?.map((l: any) => l.itemCode || l.item_code) || [],
      ),
    ),
  ).filter(Boolean);

  const calculateTotal = (q: any) => {
    let total = parseFloat(q.totalAmount || q.total_amount || 0);
    if (total === 0 && q.lines && q.lines.length > 0) {
      const lineTotal = q.lines.reduce(
        (sum: number, l: any) =>
          sum +
          parseFloat(l.quantity) * parseFloat(l.unitPrice || l.unit_price || 0),
        0,
      );
      const disc = parseFloat(q.discount || 0);
      const tx = parseFloat(q.tax || 0);
      const fr = parseFloat(q.freightCharges || q.freight_charges || 0);
      const base = lineTotal - disc;
      total = base + base * (tx / 100) + fr;
    }
    return total;
  };

  const formatMoney = (value: number) =>
    `INR ${Number.isFinite(value) ? value.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "0"}`;

  const calculateLowestUnitRate = (q: any) => {
    const rates = (q.lines || [])
      .map((line: any) => parseFloat(line.unitPrice || line.unit_price || 0))
      .filter((rate: number) => Number.isFinite(rate) && rate > 0);
    return rates.length > 0 ? Math.min(...rates) : 0;
  };

  const bestQuotationId =
    comparisonQuotations.length > 0
      ? comparisonQuotations.reduce(
          (prev, curr) => (calculateTotal(curr) < calculateTotal(prev) ? curr : prev),
          comparisonQuotations[0],
        )?.id
      : null;

  return (
    <AppShell mainClassName="bg-[#F5F8FF]">
      <div className="space-y-6 pb-24 max-w-[1536px] mx-auto">
        {/* 1. Breadcrumbs */}
        {/* 2. Page Header */}
        <div className="flex flex-col gap-4 rounded-2xl bg-[#0B2A55] p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-100/75">
            <Link to="/procurement-dashboard" className="hover:text-white transition-colors">Procurement</Link>
            <ChevronRight className="size-3 text-blue-200/70" />
            <Link to="/procurement/rfqs" className="hover:text-white transition-colors">Request for Quotations</Link>
            <ChevronRight className="size-3 text-blue-200/70" />
            <span className="font-bold text-white">Quotations</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="size-12 rounded-2xl bg-white/10 border border-white/20 text-white flex items-center justify-center shadow-xs shrink-0">
              <FileBadge className="size-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-[30px] font-extrabold tracking-tight text-white leading-tight">
                  Quotations
                </h1>
                <TooltipProvider>
                  <Tooltip delayDuration={200}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label="Quotations Info"
                        className="inline-flex items-center text-blue-100/75 hover:text-white transition-colors cursor-help"
                      >
                        <Info className="size-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs text-xs bg-[#071D3B] text-white border-0 shadow-xl p-3">
                      <p className="font-bold">Supplier Quotations</p>
                      <p className="mt-1 text-slate-300">
                        Detailed commercial and technical offers submitted by suppliers in response to an RFQ. Compare pricing, delivery terms, tax rates, and warranty before approving supplier selection.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-xs sm:text-sm font-medium text-blue-100/85 mt-0.5">
                {rfqId ? (
                  <>
                    Comparing bids for RFQ:{" "}
                    <strong className="font-mono text-[#0866FF] font-bold">
                      {rfq?.rfqNumber || rfqId}
                    </strong>{" "}
                    ({quotations.length} {quotations.length === 1 ? "quotation" : "quotations"} received)
                  </>
                ) : (
                  "Select an RFQ from the RFQs list to view side-by-side supplier bidding comparisons"
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
            <Button
              variant="outline"
              className="h-10 rounded-xl border-[#DCE6F3] bg-white text-[#101D3A] hover:bg-[#F5F8FF] hover:border-[#0866FF]/40 font-bold text-xs sm:text-sm shadow-xs gap-1.5"
              onClick={() => navigate({ to: "/procurement/rfqs" })}
            >
              <ArrowLeft className="mr-1 size-4 text-[#0866FF]" /> Back to RFQs
            </Button>
          </div>
          </div>
        </div>

        {/* 3. Main Content: Empty State vs Comparison Matrix */}
        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-3xl border border-[#DCE6F3] bg-white p-8">
            <Loader2 className="size-8 animate-spin text-[#0866FF]" />
            <p className="mt-3 text-sm font-semibold text-[#526580]">Loading quotations comparison...</p>
          </div>
        ) : quotations.length === 0 ? (
          /* Rule 4: Beautiful, friendly enterprise empty state */
          <div className="flex flex-col items-center justify-center rounded-3xl border border-[#DCE6F3] bg-white p-12 text-center shadow-xs">
            <div className="grid size-20 place-items-center rounded-3xl bg-gradient-to-br from-[#EBF3FF] to-[#D5E8FF] border border-[#CBE0FC] text-[#0866FF] shadow-xs">
              <FileBadge className="size-10 text-[#0866FF]" />
            </div>
            <h2 className="mt-6 text-xl sm:text-2xl font-extrabold tracking-tight text-[#101D3A]">
              No Supplier Quotations Received Yet
            </h2>
            <p className="mt-2 max-w-md text-sm font-medium text-[#526580] leading-relaxed">
              Supplier quotations will appear here once they are submitted through the supplier portal
              or recorded by your procurement team for side-by-side evaluation.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button
                asChild
                className="h-11 rounded-xl bg-[#0866FF] hover:bg-[#0054D6] text-white font-bold text-xs sm:text-sm shadow-xs px-6 gap-2"
              >
                <Link to="/procurement/rfqs">
                  <span>View Open RFQs</span>
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                variant="outline"
                className="h-11 rounded-xl border-[#DCE6F3] bg-white text-[#101D3A] hover:bg-[#F5F8FF] font-semibold text-xs sm:text-sm"
                onClick={() => void fetchData()}
              >
                Check for Updates
              </Button>
            </div>
          </div>
        ) : (
          /* Bidding Comparison Matrix */
          <div className="space-y-6">
            <div className="rounded-3xl border border-[#DCE6F3] bg-white shadow-xs overflow-hidden">
              {/* Matrix Top Header */}
              <div className="bg-[#F5F8FF] p-5 sm:p-6 border-b border-[#DCE6F3] flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="size-11 rounded-xl bg-[#EBF3FF] border border-[#DCE6F3] text-[#0866FF] flex items-center justify-center shrink-0">
                    <TableIcon className="size-5 text-[#0866FF]" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-[#101D3A] uppercase">
                      Bidding Comparison Matrix
                    </h2>
                    <p className="text-xs sm:text-sm text-[#526580] font-medium">
                      Side-by-side analysis of price, delivery, terms, warranty, and total value
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {olderQuotationCount > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 rounded-xl text-xs font-bold text-[#0866FF] hover:bg-[#EBF3FF] px-3.5 border border-[#CBE0FC]"
                      onClick={() => setShowOlderQuotations((current) => !current)}
                    >
                      {showOlderQuotations ? "Hide History" : `Quotation History (${olderQuotationCount})`}
                    </Button>
                  )}
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
                    <Trophy className="size-4 text-[#16C784]" />
                    <span className="text-xs font-bold tracking-tight">
                      Lowest Total Flagged
                    </span>
                  </div>
                </div>
              </div>

              {/* Table Container */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[840px]">
                  <thead>
                    <tr>
                      <th className="p-5 bg-[#F5F8FF] w-[240px] border-r border-[#DCE6F3] sticky left-0 z-10">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#526580]">
                          Bidding Factors
                        </span>
                      </th>
                      {comparisonQuotations.map((q, idx) => {
                        const isL1 = bestQuotationId === q.id;
                        const isSelected = q.status === "Selected";
                        return (
                          <th
                            key={q.id || `q-head-${idx}`}
                            className={cn(
                              "p-5 min-w-[280px] border-r border-[#DCE6F3] relative group transition-colors",
                              isSelected
                                ? "bg-emerald-50/40"
                                : isL1
                                  ? "bg-blue-50/30"
                                  : "bg-white",
                            )}
                          >
                            {isSelected ? (
                              <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#16C784]" />
                            ) : isL1 ? (
                              <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#0866FF]" />
                            ) : null}

                            <div className="flex flex-col gap-2.5">
                              <div className="flex items-center justify-between">
                                <StatusBadge status={q.status} />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setInspectQuotation(q)}
                                  className="rounded-lg text-[11px] h-7 font-bold gap-1 border-[#DCE6F3] bg-white hover:bg-[#F5F8FF] text-[#101D3A]"
                                >
                                  <Eye className="size-3 text-[#0866FF]" /> Final Review
                                </Button>
                              </div>

                              <div className="flex items-center justify-between">
                                {isSelected ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 uppercase bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-300">
                                    <Sparkles className="size-3" /> Selected Supplier
                                  </span>
                                ) : isL1 ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-[#0866FF] uppercase bg-blue-100/80 px-2.5 py-0.5 rounded-full border border-blue-300">
                                    <Trophy className="size-3" /> Lowest Total (L1)
                                  </span>
                                ) : null}
                              </div>

                              <div>
                                <h3 className="font-extrabold text-base text-[#101D3A] leading-tight">
                                  {q.supplierInfo?.supplierName || q.supplierName || `Supplier ${idx + 1}`}
                                </h3>
                                <p className="text-[11px] font-mono font-bold text-[#526580] mt-0.5">
                                  {q.supplierInfo?.supplierCode || q.id.substring(0, 8)}
                                </p>
                              </div>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-[#DCE6F3] text-xs">
                    {/* Section 1: Decision Criteria */}
                    <tr className="bg-[#EBF3FF]/70 border-y border-[#CBE0FC]">
                      <td className="p-3.5 px-5 border-r border-[#DCE6F3] sticky left-0 z-10 bg-[#EBF3FF] font-bold text-[#0866FF]">
                        <div className="flex items-center gap-2">
                          <TableIcon className="size-4" />
                          <span className="text-[11px] font-extrabold uppercase tracking-wider">
                            Decision Criteria
                          </span>
                        </div>
                      </td>
                      {comparisonQuotations.map((q) => (
                        <td
                          key={`cat-criteria-${q.id}`}
                          className={cn(
                            "p-3.5 border-r border-[#DCE6F3]",
                            (bestQuotationId === q.id || q.status === "Selected") && "bg-[#EBF3FF]/40",
                          )}
                        />
                      ))}
                    </tr>

                    {/* Unit Price */}
                    <tr className="hover:bg-[#F5F8FF]/80 transition-colors">
                      <td className="p-4 px-5 border-r border-[#DCE6F3] sticky left-0 z-10 bg-white font-bold text-[#101D3A]">
                        Lowest Unit Rate
                      </td>
                      {comparisonQuotations.map((q) => (
                        <td
                          key={`${q.id}-criteria-unit-price`}
                          className={cn(
                            "p-4 border-r border-[#DCE6F3] text-sm font-extrabold text-[#101D3A] tabular-nums",
                            (bestQuotationId === q.id || q.status === "Selected") && "bg-blue-50/20",
                          )}
                        >
                          {formatMoney(calculateLowestUnitRate(q))}
                        </td>
                      ))}
                    </tr>

                    {/* Delivery */}
                    <tr className="hover:bg-[#F5F8FF]/80 transition-colors">
                      <td className="p-4 px-5 border-r border-[#DCE6F3] sticky left-0 z-10 bg-white font-bold text-[#101D3A]">
                        Delivery Lead Time
                      </td>
                      {comparisonQuotations.map((q) => (
                        <td
                          key={`${q.id}-criteria-delivery`}
                          className={cn(
                            "p-4 border-r border-[#DCE6F3] text-xs font-semibold text-[#101D3A]",
                            (bestQuotationId === q.id || q.status === "Selected") && "bg-blue-50/20",
                          )}
                        >
                          {q.deliveryTime || q.delivery_time || q.expectedDeliveryDate || q.expected_delivery_date || "—"}
                        </td>
                      ))}
                    </tr>

                    {/* Payment Terms */}
                    <tr className="hover:bg-[#F5F8FF]/80 transition-colors">
                      <td className="p-4 px-5 border-r border-[#DCE6F3] sticky left-0 z-10 bg-white font-bold text-[#101D3A]">
                        Payment Terms
                      </td>
                      {comparisonQuotations.map((q) => (
                        <td
                          key={`${q.id}-criteria-payment`}
                          className={cn(
                            "p-4 border-r border-[#DCE6F3] text-xs font-medium text-[#526580]",
                            (bestQuotationId === q.id || q.status === "Selected") && "bg-blue-50/20",
                          )}
                        >
                          {q.paymentTerms || q.payment_terms || "—"}
                        </td>
                      ))}
                    </tr>

                    {/* Warranty */}
                    <tr className="hover:bg-[#F5F8FF]/80 transition-colors">
                      <td className="p-4 px-5 border-r border-[#DCE6F3] sticky left-0 z-10 bg-white font-bold text-[#101D3A]">
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="size-3.5 text-[#0866FF]" />
                          <span>Warranty</span>
                        </div>
                      </td>
                      {comparisonQuotations.map((q) => (
                        <td
                          key={`${q.id}-criteria-warranty`}
                          className={cn(
                            "p-4 border-r border-[#DCE6F3] text-xs font-semibold text-[#101D3A]",
                            (bestQuotationId === q.id || q.status === "Selected") && "bg-blue-50/20",
                          )}
                        >
                          {q.warranty || "Standard 12 Months"}
                        </td>
                      ))}
                    </tr>

                    {/* Section 2: Items & Rates */}
                    <tr className="bg-[#EBF3FF]/70 border-y border-[#CBE0FC]">
                      <td className="p-3.5 px-5 border-r border-[#DCE6F3] sticky left-0 z-10 bg-[#EBF3FF] font-bold text-[#0866FF]">
                        <div className="flex items-center gap-2">
                          <Package className="size-4" />
                          <span className="text-[11px] font-extrabold uppercase tracking-wider">
                            Item Rates & Quantities
                          </span>
                        </div>
                      </td>
                      {comparisonQuotations.map((q) => (
                        <td
                          key={`cat-m-${q.id}`}
                          className={cn(
                            "p-3.5 border-r border-[#DCE6F3]",
                            (bestQuotationId === q.id || q.status === "Selected") && "bg-[#EBF3FF]/40",
                          )}
                        />
                      ))}
                    </tr>

                    {uniqueItemCodes.map((code) => (
                      <tr key={`row-item-${code}`} className="hover:bg-[#F5F8FF]/80 transition-colors">
                        <td className="p-4 px-5 border-r border-[#DCE6F3] sticky left-0 z-10 bg-white">
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-[#101D3A]">
                              {comparisonQuotations
                                .flatMap((q) => q.lines || [])
                                .find((l) => l.itemCode === code || l.item_code === code)?.material_name || "Material Line"}
                            </p>
                            <code className="text-[10px] text-[#0866FF] font-bold bg-[#EBF3FF] px-2 py-0.5 rounded border border-[#CBE0FC] uppercase font-mono">
                              {code}
                            </code>
                          </div>
                        </td>
                        {comparisonQuotations.map((q) => {
                          const line = q.lines?.find((l: any) => l.itemCode === code || l.item_code === code);
                          return (
                            <td
                              key={`${q.id}-${code}`}
                              className={cn(
                                "p-4 border-r border-[#DCE6F3]",
                                (bestQuotationId === q.id || q.status === "Selected") && "bg-blue-50/20",
                              )}
                            >
                              {line ? (
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-[#526580] font-bold uppercase">Rate</span>
                                    <span className="text-sm font-extrabold text-[#101D3A] tabular-nums">
                                      {formatMoney(parseFloat(line.unitPrice || line.unit_price))}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-[#526580] font-bold uppercase">Quantity</span>
                                    <span className="text-xs font-semibold text-[#526580]">
                                      {Math.floor(parseFloat(line.quantity))} {line.uom || "Units"}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center italic text-[#526580] text-[11px]">No Quote</div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}

                    {/* Section 3: Commercial Adjustments */}
                    <tr className="bg-[#EBF3FF]/70 border-y border-[#CBE0FC]">
                      <td className="p-3.5 px-5 border-r border-[#DCE6F3] sticky left-0 z-10 bg-[#EBF3FF] font-bold text-[#0866FF]">
                        <div className="flex items-center gap-2">
                          <Wallet className="size-4" />
                          <span className="text-[11px] font-extrabold uppercase tracking-wider">
                            Commercial Adjustments
                          </span>
                        </div>
                      </td>
                      {comparisonQuotations.map((q) => (
                        <td
                          key={`cat-f-${q.id}`}
                          className={cn(
                            "p-3.5 border-r border-[#DCE6F3]",
                            (bestQuotationId === q.id || q.status === "Selected") && "bg-[#EBF3FF]/40",
                          )}
                        />
                      ))}
                    </tr>

                    {/* Discount */}
                    <tr className="hover:bg-[#F5F8FF]/80 transition-colors">
                      <td className="p-4 px-5 border-r border-[#DCE6F3] sticky left-0 z-10 bg-white font-bold text-[#101D3A]">
                        <div className="flex items-center gap-1.5 text-emerald-700">
                          <TrendingDown className="size-3.5" />
                          <span>Discount Offered</span>
                        </div>
                      </td>
                      {comparisonQuotations.map((q) => (
                        <td
                          key={`${q.id}-discount`}
                          className={cn(
                            "p-4 border-r border-[#DCE6F3] font-extrabold text-sm text-emerald-700 tabular-nums",
                            (bestQuotationId === q.id || q.status === "Selected") && "bg-blue-50/20",
                          )}
                        >
                          {formatMoney(parseFloat(q.discount || 0))}
                        </td>
                      ))}
                    </tr>

                    {/* GST / Tax */}
                    <tr className="hover:bg-[#F5F8FF]/80 transition-colors">
                      <td className="p-4 px-5 border-r border-[#DCE6F3] sticky left-0 z-10 bg-white font-bold text-[#101D3A]">
                        <div className="flex items-center gap-1.5">
                          <AlertCircle className="size-3.5 text-[#526580]" />
                          <span>Tax (GST %)</span>
                        </div>
                      </td>
                      {comparisonQuotations.map((q) => {
                        const baseTotal = (q.lines || []).reduce(
                          (sum: number, l: any) =>
                            sum +
                            parseFloat(l.quantity || 1) *
                              parseFloat(l.unitPrice || l.unit_price || 0),
                          0,
                        );
                        const disc = parseFloat(q.discount || 0);
                        const afterDisc = Math.max(0, baseTotal - disc);
                        const taxRate = parseFloat(q.tax || 0);
                        const taxMoney = afterDisc * (taxRate / 100);

                        return (
                          <td
                            key={`${q.id}-tax`}
                            className={cn(
                              "p-4 border-r border-[#DCE6F3] font-bold text-sm text-[#101D3A] tabular-nums",
                              (bestQuotationId === q.id || q.status === "Selected") && "bg-blue-50/20",
                            )}
                          >
                            {formatMoney(taxMoney)}
                            <span className="text-xs font-semibold text-[#526580] ml-1.5">
                              ({taxRate}%)
                            </span>
                          </td>
                        );
                      })}
                    </tr>

                    {/* Freight */}
                    <tr className="hover:bg-[#F5F8FF]/80 transition-colors">
                      <td className="p-4 px-5 border-r border-[#DCE6F3] sticky left-0 z-10 bg-white font-bold text-[#101D3A]">
                        <div className="flex items-center gap-1.5">
                          <Truck className="size-3.5 text-[#526580]" />
                          <span>Freight Charges</span>
                        </div>
                      </td>
                      {comparisonQuotations.map((q) => (
                        <td
                          key={`${q.id}-freight`}
                          className={cn(
                            "p-4 border-r border-[#DCE6F3] font-bold text-sm text-[#101D3A] tabular-nums",
                            (bestQuotationId === q.id || q.status === "Selected") && "bg-blue-50/20",
                          )}
                        >
                          {formatMoney(parseFloat(q.freightCharges || q.freight_charges || 0))}
                        </td>
                      ))}
                    </tr>

                    {/* Section 4: Logistics & Attachments */}
                    <tr className="bg-[#EBF3FF]/70 border-y border-[#CBE0FC]">
                      <td className="p-3.5 px-5 border-r border-[#DCE6F3] sticky left-0 z-10 bg-[#EBF3FF] font-bold text-[#0866FF]">
                        <div className="flex items-center gap-2">
                          <Clock className="size-4" />
                          <span className="text-[11px] font-extrabold uppercase tracking-wider">
                            Logistics & Mode
                          </span>
                        </div>
                      </td>
                      {comparisonQuotations.map((q) => (
                        <td
                          key={`cat-l-${q.id}`}
                          className={cn(
                            "p-3.5 border-r border-[#DCE6F3]",
                            (bestQuotationId === q.id || q.status === "Selected") && "bg-[#EBF3FF]/40",
                          )}
                        />
                      ))}
                    </tr>

                    {/* Mode of Payment */}
                    <tr className="hover:bg-[#F5F8FF]/80 transition-colors">
                      <td className="p-4 px-5 border-r border-[#DCE6F3] sticky left-0 z-10 bg-white font-bold text-[#101D3A]">
                        Mode of Payment
                      </td>
                      {comparisonQuotations.map((q) => (
                        <td
                          key={`${q.id}-mode`}
                          className={cn(
                            "p-4 border-r border-[#DCE6F3] text-xs font-semibold text-[#101D3A]",
                            (bestQuotationId === q.id || q.status === "Selected") && "bg-blue-50/20",
                          )}
                        >
                          {q.modeOfPayment || q.mode_of_payment || "Bank Transfer (NEFT/RTGS)"}
                        </td>
                      ))}
                    </tr>

                    {/* Supporting Documents */}
                    <tr className="hover:bg-[#F5F8FF]/80 transition-colors">
                      <td className="p-4 px-5 border-r border-[#DCE6F3] sticky left-0 z-10 bg-white font-bold text-[#101D3A]">
                        Supporting PDF Docs
                      </td>
                      {comparisonQuotations.map((q) => (
                        <td
                          key={`${q.id}-docs`}
                          className={cn(
                            "p-4 border-r border-[#DCE6F3]",
                            (bestQuotationId === q.id || q.status === "Selected") && "bg-blue-50/20",
                          )}
                        >
                          {q.documents && q.documents.length > 0 ? (
                            q.documents.map((d: any, dIdx: number) => (
                              <a
                                key={`${q.id}-doc-${dIdx}`}
                                href={d.file_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-[#0866FF] font-bold hover:underline"
                              >
                                <Download className="size-3.5" /> PDF Attachment
                              </a>
                            ))
                          ) : (
                            <span className="text-[#526580] text-xs italic">No Attachments</span>
                          )}
                        </td>
                      ))}
                    </tr>

                    {/* Grand Total Row */}
                    <tr className="bg-gradient-to-r from-[#071D3B] via-[#0E284D] to-[#102D57] text-white">
                      <td className="p-5 px-5 border-r border-white/20 sticky left-0 z-10 bg-[#071D3B] text-white">
                        <div className="flex items-center gap-2.5">
                          <Wallet className="size-5 text-[#00D4FF]" />
                          <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-white">
                            Net Quotation Total
                          </span>
                        </div>
                      </td>
                      {comparisonQuotations.map((q) => {
                        const total = calculateTotal(q);
                        const isSelected = q.status === "Selected";
                        const isL1 = bestQuotationId === q.id;
                        return (
                          <td
                            key={`${q.id}-total`}
                            className={cn(
                              "p-5 border-r border-white/20 font-extrabold text-xl sm:text-2xl tabular-nums tracking-tight",
                              (isSelected || isL1) && "bg-[#0866FF]/40 text-[#00D4FF]",
                            )}
                          >
                            {formatMoney(total)}
                          </td>
                        );
                      })}
                    </tr>

                    {/* Authorize Decision Actions */}
                    <tr className="bg-white">
                      <td className="p-5 px-5 border-r border-[#DCE6F3] sticky left-0 z-10 bg-white">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#526580]">
                          Authorize Decision
                        </span>
                      </td>
                      {comparisonQuotations.map((q) => {
                        const isSelected = q.status === "Selected";
                        const isRejected = q.status === "Rejected";
                        return (
                          <td
                            key={`${q.id}-actions`}
                            className={cn(
                              "p-5 border-r border-[#DCE6F3]",
                              (bestQuotationId === q.id || isSelected) && "bg-blue-50/20",
                            )}
                          >
                            {isSelected ? (
                              <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 text-center">
                                <span className="flex items-center justify-center gap-2 text-xs font-bold uppercase text-emerald-700 tracking-wider">
                                  <CheckCircle2 className="size-4" /> Selected & PO Generated
                                </span>
                              </div>
                            ) : isRejected ? (
                              <div className="space-y-2.5">
                                <div className="bg-red-50 border border-red-300 rounded-2xl p-4 text-center">
                                  <span className="flex items-center justify-center gap-2 text-xs font-bold uppercase text-[#E5484D] tracking-wider">
                                    <XCircle className="size-4" /> Quotation Rejected
                                  </span>
                                </div>
                                {!selectionFinalized && (
                                  <Button
                                    variant="ghost"
                                    className="w-full text-[#0866FF] hover:bg-[#EBF3FF] font-bold text-xs rounded-xl"
                                    onClick={() => handleOpenModal(q.id, q.supplierId || q.supplier_id, "SELECT")}
                                  >
                                    Re-evaluate Selection
                                  </Button>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-2.5">
                                <Button
                                  className="w-full h-11 rounded-xl bg-[#16C784] hover:bg-[#13ab71] text-white font-bold text-xs shadow-xs"
                                  onClick={() => handleOpenModal(q.id, q.supplierId || q.supplier_id, "SELECT")}
                                  disabled={submitting}
                                >
                                  <CheckCircle className="size-4 mr-1.5" /> Select Vendor
                                </Button>
                                <Button
                                  variant="ghost"
                                  className="w-full h-9 rounded-xl text-[#E5484D] hover:bg-red-50 font-bold text-xs"
                                  onClick={() => handleOpenModal(q.id, q.supplierId || q.supplier_id, "REJECT")}
                                  disabled={submitting}
                                >
                                  <XCircle className="size-4 mr-1.5" /> Reject Quote
                                </Button>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom PO CTA */}
            {quotations.some((q) => q.status === "Selected") && (
              <div className="flex justify-end pt-2">
                <Button
                  className="h-12 rounded-xl bg-[#0866FF] hover:bg-[#0054D6] text-white font-extrabold text-sm shadow-md px-8 gap-2"
                  onClick={() => navigate({ to: "/procurement/purchase-orders" })}
                >
                  Proceed to PO Queue <ArrowRight className="size-4" />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Selection / Rejection Dialog */}
        <Dialog open={isModalOpen} onOpenChange={(open) => !submitting && setIsModalOpen(open)}>
          <DialogContent className="max-h-[90vh] w-[calc(100%-2rem)] max-w-xl overflow-hidden rounded-2xl border-[#DCE6F3] p-0 shadow-2xl">
            <DialogHeader className="border-b border-[#DCE6F3] bg-[#F5F8FF] px-6 py-5 pr-12 text-left">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "grid size-10 shrink-0 place-items-center rounded-xl",
                    modalMode === "SELECT" ? "bg-[#EBF3FF] text-[#0866FF]" : "bg-red-100 text-[#E5484D]",
                  )}
                >
                  {modalMode === "SELECT" ? <FileCheck2 className="size-5" /> : <XCircle className="size-5" />}
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-lg font-bold text-[#101D3A]">
                    {modalMode === "SELECT" ? "Select Supplier & Generate PO Proposal" : "Reject Quotation"}
                  </DialogTitle>
                  <DialogDescription className="mt-0.5 text-xs text-[#526580]">
                    {modalMode === "SELECT"
                      ? "Confirm the winning supplier bid and record the evaluation reason."
                      : "Provide a documented reason for rejecting this supplier's quotation."}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <form onSubmit={handleAction} className="flex min-h-0 flex-col">
              <div className="max-h-[60vh] space-y-4 overflow-y-auto px-6 py-5">
                {(() => {
                  const quotation = quotations.find((entry) => entry.id === targetQuotationId);
                  if (!quotation) return null;
                  const quotationReference = `QTN-${String(
                    quotations.findIndex((entry) => entry.id === targetQuotationId) + 1,
                  ).padStart(4, "0")}`;
                  return (
                    <div className="grid gap-3 rounded-xl border border-[#DCE6F3] bg-[#F5F8FF] p-4 sm:grid-cols-2">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#526580]">
                          Selected Supplier
                        </p>
                        <p className="mt-1 truncate text-sm font-bold text-[#101D3A]">
                          {quotation.supplierInfo?.supplierName || quotation.supplierName || "Supplier"}
                          {quotation.supplierInfo?.supplierCode && (
                            <span className="ml-1.5 text-xs font-mono text-[#526580]">
                              ({quotation.supplierInfo.supplierCode})
                            </span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#526580]">
                          Quotation Ref
                        </p>
                        <p className="mt-1 font-mono text-sm font-bold text-[#0866FF]">
                          {quotation.quotationNumber || quotationReference}
                        </p>
                      </div>
                    </div>
                  );
                })()}

                <div className="space-y-1.5">
                  <Label htmlFor="selection-reason" className="text-xs font-bold text-[#101D3A]">
                    {modalMode === "SELECT" ? "Selection Reason" : "Rejection Reason"}
                    <span className="ml-1 text-[#E5484D]">*</span>
                  </Label>
                  {modalMode === "SELECT" ? (
                    <Select value={reason} onValueChange={(value) => setReason(value)}>
                      <SelectTrigger id="selection-reason" className="h-11 rounded-xl bg-white border-[#DCE6F3] text-sm font-semibold">
                        <span className="truncate">{reason || "Choose a selection reason"}</span>
                      </SelectTrigger>
                      <SelectContent className="z-[60] max-h-80 rounded-xl">
                        {selectionReasons.map((selectionReason) => (
                          <SelectItem
                            key={selectionReason.value}
                            value={selectionReason.value}
                            textValue={selectionReason.value}
                            className="whitespace-nowrap py-2 text-xs"
                          >
                            <span className="font-bold text-[#101D3A]">{selectionReason.value}</span>
                            <span className="text-[#526580]"> — {selectionReason.detail}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Select value={reason} onValueChange={(value) => setReason(value)}>
                      <SelectTrigger id="selection-reason" className="h-11 rounded-xl bg-white border-[#DCE6F3] text-sm font-semibold">
                        <span className="truncate">{reason || "Choose a rejection reason"}</span>
                      </SelectTrigger>
                      <SelectContent className="z-[60] max-h-80 rounded-xl">
                        {rejectionReasons.map((rejectionReason) => (
                          <SelectItem key={rejectionReason} value={rejectionReason}>
                            {rejectionReason}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {modalMode === "SELECT" && selectedReasonDetail && (
                    <p className="text-[11px] font-medium text-[#526580]">{selectedReasonDetail}</p>
                  )}
                </div>

                {modalMode === "SELECT" && reason === OTHER_SELECTION_REASON && (
                  <div className="space-y-1.5">
                    <Label htmlFor="evaluation-comments" className="text-xs font-bold text-[#101D3A]">
                      Procurement Evaluation Justification <span className="text-[#E5484D]">*</span>
                    </Label>
                    <Textarea
                      id="evaluation-comments"
                      placeholder="Explain why this supplier was selected..."
                      className="min-h-24 resize-y rounded-xl text-sm border-[#DCE6F3]"
                      value={procurementComments}
                      onChange={(e) => setProcurementComments(e.target.value)}
                      required
                    />
                  </div>
                )}

                {modalMode === "REJECT" && reason === OTHER_SELECTION_REASON && (
                  <div className="space-y-1.5">
                    <Label htmlFor="rejection-justification" className="text-xs font-bold text-[#101D3A]">
                      Rejection Justification <span className="text-[#E5484D]">*</span>
                    </Label>
                    <Textarea
                      id="rejection-justification"
                      placeholder="Explain why this quotation was rejected..."
                      className="min-h-24 resize-y rounded-xl text-sm border-[#DCE6F3]"
                      value={rejectionJustification}
                      onChange={(e) => setRejectionJustification(e.target.value)}
                      required
                    />
                  </div>
                )}
              </div>

              <DialogFooter className="border-t border-[#DCE6F3] bg-[#F5F8FF] px-6 py-4 sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border-[#DCE6F3] text-xs font-semibold"
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className={cn(
                    "min-w-44 rounded-xl font-bold text-xs shadow-xs text-white",
                    modalMode === "SELECT"
                      ? "bg-[#0866FF] hover:bg-[#0054D6]"
                      : "bg-[#E5484D] hover:bg-red-700",
                  )}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" /> Processing...
                    </>
                  ) : modalMode === "SELECT" ? (
                    <>
                      <FileCheck2 className="mr-2 size-4" /> Generate PO Proposal
                    </>
                  ) : (
                    "Confirm Rejection"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Supplier Quotation Final Review Inspection Dialog */}
        <Dialog open={Boolean(inspectQuotation)} onOpenChange={(open) => !open && setInspectQuotation(null)}>
          <DialogContent className="max-w-2xl gap-0 overflow-hidden rounded-2xl border-none p-0 shadow-2xl [&>button]:right-4 [&>button]:top-4 [&>button]:text-white/75 [&>button]:hover:text-white">
            {inspectQuotation && (() => {
              const baseTotal = (inspectQuotation.lines || []).reduce(
                (sum: number, l: any) =>
                  sum + parseFloat(l.quantity || 1) * parseFloat(l.unitPrice || l.unit_price || 0),
                0,
              );
              const disc = parseFloat(inspectQuotation.discount || 0);
              const netTaxable = Math.max(0, baseTotal - disc);
              const taxRate = parseFloat(inspectQuotation.tax || 0);
              const taxAmount = netTaxable * (taxRate / 100);
              const freight = parseFloat(inspectQuotation.freightCharges || inspectQuotation.freight_charges || 0);
              const other = parseFloat(inspectQuotation.additional_charges || inspectQuotation.additionalCharges || 0);
              const grandTotal =
                parseFloat(inspectQuotation.totalAmount || inspectQuotation.total_amount || 0) ||
                netTaxable + taxAmount + freight + other;
              const quotedItemsCount = (inspectQuotation.lines || []).filter(
                (l: any) => parseFloat(l.unitPrice || l.unit_price || 0) > 0,
              ).length;

              return (
                <>
                  <div className="bg-gradient-to-r from-[#071D3B] via-[#0E284D] to-[#102D57] px-6 py-5 text-white">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-white">
                        <span className="grid size-8 place-items-center rounded-lg bg-white/15">
                          <ShieldCheck className="size-5 text-[#00D4FF]" />
                        </span>
                        Quotation Final Review
                      </DialogTitle>
                      <DialogDescription className="mt-0.5 text-xs text-white/80">
                        RFQ: <span className="font-mono font-bold text-white">{rfq?.rfqNumber || rfq?.rfq_number || "RFQ"}</span> | Supplier:{" "}
                        <span className="font-bold text-white">
                          {inspectQuotation.supplierInfo?.supplierName || inspectQuotation.supplierName || "Supplier"}
                        </span>
                      </DialogDescription>
                    </DialogHeader>
                  </div>

                  <div className="space-y-4 p-6 max-h-[70vh] overflow-y-auto">
                    {/* Taxable-Value Breakdown */}
                    <div className="rounded-2xl border border-[#DCE6F3] bg-[#F5F8FF] p-5">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-[#526580]">
                          Taxable-Value Breakdown
                        </h4>
                        <span className="text-[10px] font-bold text-emerald-700 uppercase bg-emerald-100 px-2 py-0.5 rounded">
                          Live Sync
                        </span>
                      </div>
                      <div className="space-y-2.5 text-sm">
                        <div className="grid grid-cols-[1fr_auto] items-center gap-6">
                          <span className="text-[#526580] font-medium">Subtotal (Gross Items)</span>
                          <span className="font-bold text-[#101D3A] tabular-nums">{formatMoney(baseTotal)}</span>
                        </div>
                        <div className="grid grid-cols-[1fr_auto] items-center gap-6">
                          <span className="text-[#526580] font-medium">Discount ({inspectQuotation.discount || 0}%)</span>
                          <span className="font-bold text-emerald-700 tabular-nums">− {formatMoney(disc)}</span>
                        </div>
                        <div className="grid grid-cols-[1fr_auto] items-center gap-6 border-t border-[#DCE6F3] pt-2">
                          <span className="font-bold text-[#101D3A]">Net Taxable Amount</span>
                          <span className="font-bold text-[#101D3A] tabular-nums">{formatMoney(netTaxable)}</span>
                        </div>
                        <div className="grid grid-cols-[1fr_auto] items-center gap-6">
                          <span className="text-[#526580] font-medium">GST / Tax ({taxRate}%)</span>
                          <span className="font-bold text-[#101D3A] tabular-nums">{formatMoney(taxAmount)}</span>
                        </div>
                        <div className="grid grid-cols-[1fr_auto] items-center gap-6">
                          <div>
                            <span className="text-[#526580] font-medium block">Freight Charges</span>
                            <span className="text-[10px] text-[#526580]/70 italic">(*Exclusive of item GST)</span>
                          </div>
                          <span className="font-bold text-[#101D3A] tabular-nums">{formatMoney(freight)}</span>
                        </div>
                        {other > 0 && (
                          <div className="grid grid-cols-[1fr_auto] items-center gap-6">
                            <span className="text-[#526580] font-medium">Additional Charges</span>
                            <span className="font-bold text-[#101D3A] tabular-nums">{formatMoney(other)}</span>
                          </div>
                        )}
                        <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-6 border-t border-[#DCE6F3] pt-3">
                          <span className="text-sm font-extrabold uppercase tracking-wide text-[#101D3A]">
                            Final Grand Total
                          </span>
                          <span className="text-2xl font-extrabold tracking-tight text-[#0866FF] tabular-nums">
                            {formatMoney(grandTotal)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Logistics & Commercials Grid */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-[#DCE6F3] bg-white p-3.5 shadow-2xs">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-[#526580]">
                          Delivery Duration
                        </Label>
                        <p className="mt-1 text-sm font-bold text-[#101D3A]">
                          {inspectQuotation.deliveryTime || inspectQuotation.delivery_time || "Not Specified"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-[#DCE6F3] bg-white p-3.5 shadow-2xs">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-[#526580]">
                          Expected Delivery Date
                        </Label>
                        <p className="mt-1 text-sm font-bold text-[#101D3A] tabular-nums">
                          {inspectQuotation.expectedDeliveryDate || inspectQuotation.expected_delivery_date || "Not Specified"}
                        </p>
                      </div>
                      <div className="rounded-xl border border-[#DCE6F3] bg-white p-3.5 shadow-2xs">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-[#526580]">
                          Payment Terms & Mode
                        </Label>
                        <p className="mt-1 text-sm font-bold text-[#101D3A]">
                          {inspectQuotation.paymentTerms || inspectQuotation.payment_terms || "Net 30"} (
                          {inspectQuotation.modeOfPayment || inspectQuotation.mode_of_payment || "Bank Transfer"})
                        </p>
                      </div>
                      <div className="rounded-xl border border-[#DCE6F3] bg-white p-3.5 shadow-2xs">
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-[#526580]">
                          Items Quoted
                        </Label>
                        <p className="mt-1 text-sm font-bold text-[#101D3A]">
                          {quotedItemsCount} of {(inspectQuotation.lines || []).length} Items Quoted
                        </p>
                      </div>
                    </div>

                    {/* Remarks */}
                    {inspectQuotation.remarks && (
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase font-bold text-[#526580]">
                          Special Remarks / Commercial Conditions
                        </Label>
                        <div className="rounded-xl border border-[#DCE6F3] bg-[#F5F8FF] p-3 text-xs italic text-[#101D3A]">
                          {inspectQuotation.remarks}
                        </div>
                      </div>
                    )}
                  </div>

                  <DialogFooter className="border-t border-[#DCE6F3] bg-[#F5F8FF] p-4">
                    <Button
                      onClick={() => setInspectQuotation(null)}
                      className="h-11 rounded-xl bg-[#0866FF] hover:bg-[#0054D6] px-8 text-xs font-bold text-white shadow-xs w-full"
                    >
                      Close Review
                    </Button>
                  </DialogFooter>
                </>
              );
            })()}
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
