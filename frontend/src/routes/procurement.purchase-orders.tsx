import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  Calendar,
  Download,
  Eye,
  FileText,
  Filter,
  Loader2,
  Package,
  Search,
  Info,
  ChevronRight,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  FileCheck2,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { AppShell, StatusBadge } from "@/components/wms/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { requireRole } from "@/lib/auth-utils";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/procurement/purchase-orders")({
  beforeLoad: () => requireRole("PROCUREMENT"),
  component: PurchaseOrders,
});

const statusOptions = [
  { value: "ALL", label: "All Statuses" },
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING_FINANCE", label: "Pending Approval" },
  { value: "APPROVED", label: "Approved" },
  { value: "SENT", label: "Sent" },
  { value: "ACKNOWLEDGED", label: "Acknowledged" },
  { value: "PARTIALLY_RECEIVED", label: "Partially Received" },
  { value: "FULLY_RECEIVED", label: "Fully Received" },
  { value: "CLOSED", label: "Closed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "REJECTED", label: "Rejected" },
];

const poFlow = [
  "DRAFT",
  "PENDING_FINANCE",
  "APPROVED",
  "SENT",
  "ACKNOWLEDGED",
  "PARTIALLY_RECEIVED",
  "FULLY_RECEIVED",
  "CLOSED",
];

function PurchaseOrders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const formatCurrency = (value: unknown) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(value) || 0);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await api.getPurchaseOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch purchase orders:", error);
      toast.error("Failed to load purchase orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // KPIs
  const totalCount = orders.length;
  const totalValue = useMemo(() => {
    return orders.reduce((sum, po) => sum + Number(po.totalAmount ?? po.total_amount ?? 0), 0);
  }, [orders]);

  const pendingCount = useMemo(() => {
    return orders.filter((po) => {
      const s = String(po.status || "").toUpperCase();
      return s.includes("PENDING") || s === "DRAFT";
    }).length;
  }, [orders]);

  const approvedIssuedCount = useMemo(() => {
    return orders.filter((po) => {
      const s = String(po.status || "").toUpperCase();
      return s.includes("APPROV") || s === "SENT" || s === "ACKNOWLEDGED";
    }).length;
  }, [orders]);

  const completedCount = useMemo(() => {
    return orders.filter((po) => {
      const s = String(po.status || "").toUpperCase();
      return s.includes("RECEIV") || s === "CLOSED" || s === "COMPLETED";
    }).length;
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((po) => {
      const status = String(po.status || "").toUpperCase();
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "APPROVED" && status.includes("APPROV")) ||
        (statusFilter === "REJECTED" && status.includes("REJECT")) ||
        status === statusFilter;

      const matchesSearch =
        !q ||
        po.poNumber?.toLowerCase().includes(q) ||
        po.po_number?.toLowerCase().includes(q) ||
        po.supplierName?.toLowerCase().includes(q) ||
        po.supplier_name?.toLowerCase().includes(q) ||
        po.procurementOfficer?.toLowerCase().includes(q) ||
        po.rfqNumber?.toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [orders, search, statusFilter]);

  const downloadPo = async (po: any) => {
    try {
      setDownloadingId(po.id);
      await api.downloadPoPdf(po.id, po.poNumber || po.po_number);
      toast.success("Purchase Order PDF generated and downloaded");
    } catch (e: any) {
      toast.error("Failed to generate PDF", {
        description: e?.message || "Please try again.",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <AppShell mainClassName="bg-[#F5F8FF]">
      <div className="space-y-6 pb-24 max-w-[1536px] mx-auto">
        {/* 1. Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs font-semibold text-[#526580]">
          <Link to="/procurement-dashboard" className="hover:text-[#0866FF] transition-colors">
            Procurement
          </Link>
          <ChevronRight className="size-3 text-[#8FA3BF]" />
          <span className="font-bold text-[#101D3A]">Purchase Orders</span>
        </div>

        {/* 2. Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="size-12 rounded-2xl bg-[#EBF3FF] border border-[#DCE6F3] text-[#0866FF] flex items-center justify-center shadow-xs shrink-0">
              <FileText className="size-6 text-[#0866FF]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-[30px] font-extrabold tracking-tight text-[#101D3A] leading-tight">
                  Purchase Orders
                </h1>
                <TooltipProvider>
                  <Tooltip delayDuration={200}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label="Purchase Orders Info"
                        className="inline-flex items-center text-[#526580] hover:text-[#0866FF] transition-colors cursor-help"
                      >
                        <Info className="size-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs text-xs bg-[#071D3B] text-white border-0 shadow-xl p-3">
                      <p className="font-bold">Purchase Order Management</p>
                      <p className="mt-1 text-slate-300">
                        Legally binding purchase contracts issued to suppliers following quotation approval. Track delivery milestones and download formal PDF orders.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-xs sm:text-sm font-medium text-[#526580] mt-0.5">
                All supplier purchase orders, finance decisions, and downloadable PO PDFs
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
            <Button
              variant="outline"
              onClick={() => void fetchData()}
              disabled={loading}
              className="h-10 rounded-xl border-[#DCE6F3] bg-white text-[#101D3A] hover:bg-[#F5F8FF] hover:border-[#0866FF]/40 font-semibold text-xs sm:text-sm shadow-xs gap-2"
            >
              <RefreshCw className={`size-4 text-[#0866FF] ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              className="h-10 rounded-xl bg-[#0866FF] hover:bg-[#0054D6] text-white font-bold text-xs sm:text-sm shadow-xs gap-1.5"
              asChild
            >
              <Link to="/procurement/rfqs">
                <span>View Active RFQs</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </div>

        {/* 3. 4 KPI Summary Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {/* Total POs */}
          <div className="group relative overflow-hidden rounded-2xl border border-[#DCE6F3] bg-white p-5 shadow-xs transition-all hover:border-[#0866FF]/30 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-[13px] font-bold text-[#526580]">Total Purchase Orders</span>
              <div className="grid size-10 place-items-center rounded-xl bg-[#EBF3FF] text-[#0866FF]">
                <FileText className="size-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-[32px] font-extrabold tracking-tight text-[#101D3A] tabular-nums">
                {totalCount}
              </span>
            </div>
            <p className="mt-1 text-[11px] font-semibold text-[#526580]">
              Value: {formatCurrency(totalValue)}
            </p>
          </div>

          {/* Pending Approval */}
          <div className="group relative overflow-hidden rounded-2xl border border-[#DCE6F3] bg-white p-5 shadow-xs transition-all hover:border-[#F5A623]/30 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-[13px] font-bold text-[#526580]">Pending Approval</span>
              <div className="grid size-10 place-items-center rounded-xl bg-amber-50 text-[#F5A623]">
                <Clock className="size-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-[32px] font-extrabold tracking-tight text-[#101D3A] tabular-nums">
                {pendingCount}
              </span>
            </div>
            <p className="mt-1 text-[11px] font-semibold text-[#526580]">Draft & Finance queue</p>
          </div>

          {/* Approved & Issued */}
          <div className="group relative overflow-hidden rounded-2xl border border-[#DCE6F3] bg-white p-5 shadow-xs transition-all hover:border-[#0866FF]/30 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-[13px] font-bold text-[#526580]">Approved & Issued</span>
              <div className="grid size-10 place-items-center rounded-xl bg-cyan-50 text-[#00A3C4]">
                <FileCheck2 className="size-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-[32px] font-extrabold tracking-tight text-[#101D3A] tabular-nums">
                {approvedIssuedCount}
              </span>
            </div>
            <p className="mt-1 text-[11px] font-semibold text-[#526580]">Sent or acknowledged</p>
          </div>

          {/* Fully Received / Closed */}
          <div className="group relative overflow-hidden rounded-2xl border border-[#DCE6F3] bg-white p-5 shadow-xs transition-all hover:border-[#16C784]/30 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-[13px] font-bold text-[#526580]">Fulfilled & Closed</span>
              <div className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-[#16C784]">
                <CheckCircle2 className="size-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-[32px] font-extrabold tracking-tight text-[#101D3A] tabular-nums">
                {completedCount}
              </span>
            </div>
            <p className="mt-1 text-[11px] font-semibold text-[#526580]">Completed deliveries</p>
          </div>
        </div>

        {/* 4. Search and Filter Toolbar */}
        <div className="rounded-2xl border border-[#DCE6F3] bg-white p-4 shadow-xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#526580]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search PO number, supplier, RFQ, officer..."
                className="h-10 w-full rounded-xl border border-[#DCE6F3] bg-[#F5F8FF] pl-10 pr-10 text-xs sm:text-sm font-medium text-[#101D3A] outline-none transition-all placeholder:text-[#526580]/70 focus:border-[#0866FF] focus:bg-white focus:ring-2 focus:ring-[#0866FF]/20"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#526580] hover:text-[#101D3A]"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Filter className="hidden size-4 text-[#526580] sm:block" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 rounded-xl border border-[#DCE6F3] bg-[#F5F8FF] px-3.5 text-xs font-bold text-[#101D3A] outline-none transition focus:border-[#0866FF] focus:bg-white focus:ring-2 focus:ring-[#0866FF]/20 sm:w-48"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {(search || statusFilter !== "ALL") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("ALL");
                  }}
                  className="h-10 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* 5. Main Content: Empty State vs Orders List */}
        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-[#DCE6F3] bg-white p-8">
            <Loader2 className="size-8 animate-spin text-[#0866FF]" />
            <p className="mt-3 text-sm font-semibold text-[#526580]">Loading purchase orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          /* Redesigned Compact White Empty State with Clear Distinction */
          <div className="flex flex-col items-center justify-center rounded-3xl border border-[#DCE6F3] bg-white p-10 text-center shadow-xs">
            <div className="grid size-16 place-items-center rounded-2xl bg-[#EBF3FF] text-[#0866FF]">
              <FileText className="size-8 text-[#0866FF]" />
            </div>

            {orders.length === 0 ? (
              <>
                <h3 className="mt-4 text-lg font-bold text-[#101D3A]">
                  No Purchase Orders Recorded Yet
                </h3>
                <p className="mt-1.5 max-w-md text-xs sm:text-sm font-medium text-[#526580] leading-relaxed">
                  Purchase orders are created when you select a winning vendor bid from quotation
                  comparisons. Review your active RFQs to evaluate bids and generate orders.
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <Button
                    asChild
                    className="h-11 rounded-xl bg-[#0866FF] hover:bg-[#0054D6] text-white font-bold text-xs sm:text-sm shadow-xs px-6 gap-2"
                  >
                    <Link to="/procurement/rfqs">
                      <span>View Active RFQs</span>
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h3 className="mt-4 text-lg font-bold text-[#101D3A]">
                  No Matching Purchase Orders Found
                </h3>
                <p className="mt-1.5 max-w-sm text-xs sm:text-sm font-medium text-[#526580] leading-relaxed">
                  No purchase orders match your search term "{search}" or selected status filter.
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearch("");
                      setStatusFilter("ALL");
                    }}
                    className="h-10 rounded-xl border-[#DCE6F3] text-xs font-semibold text-[#101D3A] hover:bg-[#F5F8FF]"
                  >
                    Clear Filters
                  </Button>
                  <Button
                    asChild
                    className="h-10 rounded-xl bg-[#0866FF] hover:bg-[#0054D6] text-white font-bold text-xs shadow-xs"
                  >
                    <Link to="/procurement/rfqs">View Active RFQs</Link>
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredOrders.map((po) => {
              const poNumber = po.poNumber || po.po_number || "PO Draft";
              const supplierName = po.supplierName || po.supplier_name || "Independent Supplier";
              const totalAmount = po.totalAmount ?? po.total_amount;
              const itemCount = po.items?.length || po.lines?.length || 0;
              const deliveryDate = po.expectedDeliveryDate || po.expected_delivery_date || "Not scheduled";
              const currentStep = Math.max(0, poFlow.indexOf(String(po.status || "").toUpperCase()));
              const isDownloading = downloadingId === po.id;

              return (
                <div
                  key={po.id}
                  className="group relative overflow-hidden rounded-2xl border border-[#DCE6F3] bg-white p-5 sm:p-6 shadow-xs transition-all hover:border-[#0866FF]/40 hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    {/* Left: Info */}
                    <div className="flex flex-1 items-start gap-4">
                      <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#EBF3FF] to-[#D5E8FF] border border-[#CBE0FC] text-[#0866FF] shadow-xs">
                        <FileText className="size-6 text-[#0866FF]" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h3 className="font-mono text-base sm:text-lg font-extrabold text-[#0866FF] tracking-tight">
                            {poNumber}
                          </h3>
                          <StatusBadge status={po.status || "DRAFT"} />
                        </div>

                        {/* Metadata row */}
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#526580] font-medium">
                          <span className="flex items-center gap-1.5 font-bold text-[#101D3A]">
                            <Building2 className="size-3.5 text-[#0866FF]" />
                            {supplierName}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Package className="size-3.5 text-[#526580]" />
                            {itemCount} line items
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Calendar className="size-3.5 text-amber-500" />
                            {deliveryDate}
                          </span>
                        </div>

                        {/* Amount & Reference Pills */}
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-extrabold text-emerald-700">
                            {formatCurrency(totalAmount)}
                          </span>
                          <span className="inline-flex items-center rounded-lg border border-[#DCE6F3] bg-[#F5F8FF] px-2.5 py-1 text-xs font-semibold text-[#526580]">
                            {po.warehouseId || po.deliveryWarehouseName || "Main Warehouse"}
                          </span>
                          {(po.rfqNumber || po.rfq_id) && (
                            <span className="inline-flex items-center rounded-lg border border-[#CBE0FC] bg-[#EBF3FF] px-2.5 py-1 font-mono text-xs font-bold text-[#0866FF]">
                              Ref: {po.rfqNumber || String(po.rfq_id).substring(0, 8)}
                            </span>
                          )}
                        </div>

                        {/* Process Flow Tracker */}
                        <div className="mt-4 grid grid-cols-4 gap-1 text-[9px] sm:text-[10px] font-bold uppercase sm:grid-cols-8">
                          {poFlow.map((step, index) => {
                            const isReached = index <= currentStep;
                            return (
                              <span
                                key={step}
                                className={cn(
                                  "rounded-lg border px-1.5 py-1 text-center truncate",
                                  isReached
                                    ? "border-[#0866FF]/30 bg-[#EBF3FF] text-[#0866FF] font-bold"
                                    : "border-[#DCE6F3]/60 bg-[#F5F8FF] text-[#526580]/70",
                                )}
                                title={step.replace("PENDING_FINANCE", "Finance Approval").replaceAll("_", " ")}
                              >
                                {step.replace("PENDING_FINANCE", "Approval").replaceAll("_", " ")}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-[#DCE6F3]/60 lg:border-t-0 lg:pt-0">
                      <Button
                        variant="outline"
                        className="h-10 rounded-xl border-[#DCE6F3] bg-white text-[#101D3A] hover:bg-[#F5F8FF] hover:border-[#0866FF]/40 font-bold text-xs shadow-xs"
                        asChild
                      >
                        <Link to="/purchase-order" search={{ poId: po.id }}>
                          <Eye className="mr-1.5 size-3.5 text-[#0866FF]" />
                          View PO
                        </Link>
                      </Button>
                      <Button
                        className="h-10 rounded-xl bg-[#0866FF] hover:bg-[#0054D6] text-white font-bold text-xs shadow-xs"
                        disabled={isDownloading}
                        onClick={() => downloadPo(po)}
                      >
                        {isDownloading ? (
                          <>
                            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Download className="mr-1.5 size-3.5" />
                            Download PDF
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
