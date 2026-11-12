import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Search,
  Mail,
  ArrowRight,
  Loader2,
  Calendar,
  X,
  Send,
  Eye,
  Building2,
  Package,
  Info,
  ChevronRight,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Filter,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { AppShell, StatusBadge } from "@/components/wms/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/lib/api-client";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { requireRole } from "@/lib/auth-utils";

export const Route = createFileRoute("/procurement/rfqs")({
  beforeLoad: () => requireRole("PROCUREMENT"),
  component: Rfqs,
});

type StatusFilter = "ALL" | "DRAFT" | "SENT" | "CLOSED" | "CANCELLED";

function Rfqs() {
  const navigate = useNavigate();
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRfq, setSelectedRfq] = useState<any | null>(null);
  const [sendingRfq, setSendingRfq] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await api.getRfqs();
      setRfqs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch RFQs:", error);
      toast.error("Failed to load RFQs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSendRfq = async (rfqId: string) => {
    try {
      setSendingRfq(true);
      const result = await api.sendRfq(rfqId);
      const delivery = result.delivery || {};
      const sent = typeof delivery.sent === "number" ? delivery.sent : (result.sent ?? 0);
      const failed = typeof delivery.failed === "number" ? delivery.failed : (result.failed ?? 0);
      const total = typeof delivery.total === "number" ? delivery.total : (result.total ?? (sent + failed));

      if (failed === 0 && sent > 0) {
        toast.success("RFQ Published", {
          description: `Supplier Email: SENT (${sent} of ${total} accepted by mail server)`,
        });
      } else if (sent > 0 && failed > 0) {
        toast.warning("RFQ Published", {
          description: `Supplier Email: PARTIALLY SENT (${sent} sent, ${failed} failed)`,
        });
      } else if (failed > 0 && sent === 0) {
        toast.error("RFQ Published with Email Delivery Failure", {
          description: `Supplier Email: FAILED (0 of ${total} delivered)`,
        });
      } else {
        toast.success(result.message || "RFQ published successfully.");
      }
      setSelectedRfq(null);
      await fetchData();
    } catch (error: any) {
      toast.error("Failed to send RFQ", { description: error.message });
    } finally {
      setSendingRfq(false);
    }
  };

  const handleCancelRfq = async (rfqId: string) => {
    try {
      setSendingRfq(true);
      await api.cancelRfq(rfqId);
      toast.success("RFQ Cancelled successfully");
      setSelectedRfq(null);
      await fetchData();
    } catch (error: any) {
      toast.error("Failed to cancel RFQ", { description: error.message });
    } finally {
      setSendingRfq(false);
    }
  };

  // KPIs
  const totalCount = rfqs.length;
  const draftCount = rfqs.filter(
    (r) => (r.status || "").toUpperCase() === "DRAFT",
  ).length;
  const sentCount = rfqs.filter((r) => {
    const s = (r.status || "").toUpperCase();
    return s === "SENT" || s === "OPEN" || s === "PUBLISHED";
  }).length;
  const closedCount = rfqs.filter((r) => {
    const s = (r.status || "").toUpperCase();
    return s === "CLOSED" || s === "AWARDED" || s === "COMPLETED";
  }).length;
  const cancelledCount = rfqs.filter(
    (r) => (r.status || "").toUpperCase() === "CANCELLED",
  ).length;

  // Filtered RFQs
  const filteredRfqs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rfqs.filter((rfq) => {
      const status = (rfq.status || "").toUpperCase();
      let matchesStatus = true;
      if (statusFilter === "DRAFT") matchesStatus = status === "DRAFT";
      else if (statusFilter === "SENT")
        matchesStatus = status === "SENT" || status === "OPEN" || status === "PUBLISHED";
      else if (statusFilter === "CLOSED")
        matchesStatus = status === "CLOSED" || status === "AWARDED" || status === "COMPLETED";
      else if (statusFilter === "CANCELLED")
        matchesStatus = status === "CANCELLED";

      if (!matchesStatus) return false;

      if (!q) return true;
      const haystack = [
        rfq.rfqNumber,
        rfq.warehouse,
        rfq.materialRequestNumber,
        rfq.procurementOfficer,
        ...(rfq.suppliers?.map((s: any) => s.supplierName) || []),
        ...(rfq.items?.map((i: any) => `${i.materialCode} ${i.materialName}`) || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [rfqs, searchQuery, statusFilter]);

  return (
    <AppShell mainClassName="bg-[#F5F8FF]">
      <div className="space-y-6 pb-24 max-w-[1536px] mx-auto">
        {/* 1. Breadcrumbs */}
        {/* 2. Page Header */}
        <div className="flex flex-col gap-4 rounded-2xl bg-[#0B2A55] p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-100/75">
            <Link to="/procurement-dashboard" className="hover:text-white transition-colors">Procurement</Link>
            <ChevronRight className="size-3 text-blue-200/70" />
            <span className="font-bold text-white">Request for Quotations</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="size-12 rounded-2xl bg-white/10 border border-white/20 text-white flex items-center justify-center shadow-xs shrink-0">
              <Mail className="size-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-[30px] font-extrabold tracking-tight text-white leading-tight">
                  Request for Quotations
                </h1>
                <TooltipProvider>
                  <Tooltip delayDuration={200}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label="RFQs Info"
                        className="inline-flex items-center text-blue-100/75 hover:text-white transition-colors cursor-help"
                      >
                        <Info className="size-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs text-xs bg-[#071D3B] text-white border-0 shadow-xl p-3">
                      <p className="font-bold">Request for Quotation (RFQ)</p>
                      <p className="mt-1 text-slate-300">
                        A formal request sent to qualified suppliers soliciting competitive price bids, delivery terms, and warranty specifications for procurement materials.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-xs sm:text-sm font-medium text-blue-100/85 mt-0.5">
                Manage and track RFQs sent to various suppliers
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
              <Link to="/procurement/material-requests">
                <span>+ New RFQ</span>
              </Link>
            </Button>
          </div>
          </div>
        </div>

        {/* 3. Summary Cards (KPIs) */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {/* Total RFQs */}
          <div className="group relative overflow-hidden rounded-2xl border border-[#DCE6F3] bg-white p-5 shadow-xs transition-all hover:border-[#0866FF]/30 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-[13px] font-bold text-[#526580]">Total RFQs</span>
              <div className="grid size-10 place-items-center rounded-xl bg-[#EBF3FF] text-[#0866FF]">
                <FileText className="size-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-[32px] font-extrabold tracking-tight text-[#101D3A] tabular-nums">
                {totalCount}
              </span>
            </div>
            <p className="mt-1 text-[11px] font-semibold text-[#526580]">All recorded inquiries</p>
          </div>

          {/* Draft RFQs */}
          <div className="group relative overflow-hidden rounded-2xl border border-[#DCE6F3] bg-white p-5 shadow-xs transition-all hover:border-[#F5A623]/30 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-[13px] font-bold text-[#526580]">Draft RFQs</span>
              <div className="grid size-10 place-items-center rounded-xl bg-amber-50 text-[#F5A623]">
                <Clock className="size-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-[32px] font-extrabold tracking-tight text-[#101D3A] tabular-nums">
                {draftCount}
              </span>
            </div>
            <p className="mt-1 text-[11px] font-semibold text-[#526580]">Awaiting review & dispatch</p>
          </div>

          {/* Published / Sent */}
          <div className="group relative overflow-hidden rounded-2xl border border-[#DCE6F3] bg-white p-5 shadow-xs transition-all hover:border-[#0866FF]/30 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-[13px] font-bold text-[#526580]">Published / Sent</span>
              <div className="grid size-10 place-items-center rounded-xl bg-cyan-50 text-[#00A3C4]">
                <Send className="size-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-[32px] font-extrabold tracking-tight text-[#101D3A] tabular-nums">
                {sentCount}
              </span>
            </div>
            <p className="mt-1 text-[11px] font-semibold text-[#526580]">Active supplier invitations</p>
          </div>

          {/* Awarded / Closed */}
          <div className="group relative overflow-hidden rounded-2xl border border-[#DCE6F3] bg-white p-5 shadow-xs transition-all hover:border-[#16C784]/30 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-[13px] font-bold text-[#526580]">Awarded / Closed</span>
              <div className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-[#16C784]">
                <CheckCircle2 className="size-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-[32px] font-extrabold tracking-tight text-[#101D3A] tabular-nums">
                {closedCount}
              </span>
            </div>
            <p className="mt-1 text-[11px] font-semibold text-[#526580]">Bids finalized / fulfilled</p>
          </div>
        </div>

        {/* 4. Search & Status Filter Toolbar */}
        <div className="rounded-2xl border border-[#DCE6F3] bg-white p-4 shadow-xs">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#526580]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search RFQ no, warehouse, material, supplier..."
                className="h-11 w-full rounded-xl border border-[#DCE6F3] bg-[#F5F8FF] pl-10 pr-10 text-sm font-medium text-[#101D3A] outline-none transition-all placeholder:text-[#526580]/70 focus:border-[#0866FF] focus:bg-white focus:ring-2 focus:ring-[#0866FF]/20"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#526580] hover:text-[#101D3A]"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            {/* Status Pills */}
            <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              {(
                [
                  { id: "ALL", label: "All", count: totalCount },
                  { id: "DRAFT", label: "Draft", count: draftCount },
                  { id: "SENT", label: "Sent / Open", count: sentCount },
                  { id: "CLOSED", label: "Closed", count: closedCount },
                  { id: "CANCELLED", label: "Cancelled", count: cancelledCount },
                ] as const
              ).map((tab) => {
                const isActive = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                      isActive
                        ? "bg-[#0866FF] text-white shadow-xs"
                        : "bg-[#F5F8FF] text-[#526580] hover:bg-[#EBF2FC] hover:text-[#101D3A] border border-[#DCE6F3]/60"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-white text-[#526580] border border-[#DCE6F3]"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 5. RFQs List */}
        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-[#DCE6F3] bg-white p-8">
            <Loader2 className="size-8 animate-spin text-[#0866FF]" />
            <p className="mt-3 text-sm font-semibold text-[#526580]">Loading RFQs...</p>
          </div>
        ) : filteredRfqs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[#DCE6F3] bg-white p-12 text-center shadow-xs">
            <div className="grid size-16 place-items-center rounded-2xl bg-[#EBF3FF] text-[#0866FF]">
              <Mail className="size-8" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-[#101D3A]">No RFQs Found</h3>
            <p className="mt-1 max-w-sm text-xs sm:text-sm text-[#526580]">
              {searchQuery || statusFilter !== "ALL"
                ? "No RFQs match your current search criteria or status filter."
                : "No RFQs have been created yet. Generate an RFQ from approved Material Requests."}
            </p>
            <div className="mt-6 flex items-center gap-3">
              {(searchQuery || statusFilter !== "ALL") && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("ALL");
                  }}
                  className="rounded-xl border-[#DCE6F3] text-xs font-semibold"
                >
                  Clear Filters
                </Button>
              )}
              <Button
                asChild
                className="rounded-xl bg-[#0866FF] hover:bg-[#0054D6] text-white text-xs font-bold"
              >
                <Link to="/procurement/material-requests">View Material Requests</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredRfqs.map((rfq) => {
              const isDraft = (rfq.status || "").toUpperCase() === "DRAFT";
              const isClosed = ["CLOSED", "AWARDED", "COMPLETED"].includes(
                (rfq.status || "").toUpperCase(),
              );
              const isCancelled = (rfq.status || "").toUpperCase() === "CANCELLED";

              return (
                <div
                  key={rfq.id}
                  className="group relative overflow-hidden rounded-2xl border border-[#DCE6F3] bg-white p-5 sm:p-6 shadow-xs transition-all hover:border-[#0866FF]/40 hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    {/* Left: Info */}
                    <div className="flex flex-1 items-start gap-4">
                      <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#EBF3FF] to-[#D5E8FF] border border-[#CBE0FC] text-[#0866FF] shadow-xs">
                        <Mail className="size-6 text-[#0866FF]" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h3 className="font-mono text-base sm:text-lg font-extrabold text-[#0866FF] tracking-tight">
                            {rfq.rfqNumber || `RFQ-${rfq.id.substring(0, 8)}`}
                          </h3>
                          <StatusBadge status={rfq.status} />
                          {isClosed && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="size-3" /> Bid Finalized
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-xs sm:text-sm font-medium text-[#526580]">
                          Issued {rfq.rfqDate || "—"} ·{" "}
                          <span className="font-semibold text-[#101D3A]">{rfq.warehouse || "Central Warehouse"}</span>
                          {rfq.procurementOfficer && (
                            <span> · Officer: <strong className="text-[#101D3A] font-semibold">{rfq.procurementOfficer}</strong></span>
                          )}
                        </p>

                        {/* Metadata Pills */}
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {rfq.materialRequestNumber && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-[#0866FF] bg-[#EBF3FF] border border-[#CBE0FC] px-2.5 py-1 rounded-lg">
                              Ref: {rfq.materialRequestNumber}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#526580] bg-[#F5F8FF] border border-[#DCE6F3] px-2.5 py-1 rounded-lg">
                            <Building2 className="size-3.5 text-[#0866FF]" />
                            {rfq.suppliers?.length || 0} Suppliers invited
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#526580] bg-[#F5F8FF] border border-[#DCE6F3] px-2.5 py-1 rounded-lg font-mono">
                            <Package className="size-3.5 text-[#0866FF]" />
                            {rfq.items?.length || 0} materials
                          </span>
                          {rfq.requiredDeliveryDate && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#526580] bg-[#F5F8FF] border border-[#DCE6F3] px-2.5 py-1 rounded-lg">
                              <Calendar className="size-3.5 text-amber-500" />
                              Req Delivery: {rfq.requiredDeliveryDate}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-[#DCE6F3]/60 lg:border-t-0 lg:pt-0">
                      <Button
                        variant="outline"
                        className="h-10 rounded-xl border-[#DCE6F3] bg-white text-[#101D3A] hover:bg-[#F5F8FF] hover:border-[#0866FF]/40 font-bold text-xs shadow-xs"
                        onClick={() => setSelectedRfq(rfq)}
                      >
                        {isDraft ? (
                          <>
                            <Send className="mr-1.5 size-3.5 text-[#0866FF]" />
                            Review & Send
                          </>
                        ) : (
                          <>
                            <Eye className="mr-1.5 size-3.5 text-[#0866FF]" />
                            View RFQ Details
                          </>
                        )}
                      </Button>

                      {!isDraft && !isCancelled && (
                        <Button
                          className="h-10 rounded-xl bg-[#0866FF] hover:bg-[#0054D6] text-white font-bold text-xs shadow-xs group"
                          asChild
                        >
                          <Link to="/procurement/quotations" search={{ rfqId: rfq.id }}>
                            Compare Bids
                            <ArrowRight className="ml-1.5 size-3.5 transition-transform group-hover:translate-x-1" />
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 6. Detail & Review Modal */}
        {selectedRfq && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#071D3B]/60 p-4 backdrop-blur-sm transition-all sm:p-6">
            <Card className="flex max-h-[90vh] w-full max-w-5xl flex-col gap-0 overflow-hidden rounded-2xl border-[#DCE6F3] bg-white p-0 shadow-2xl">
              {/* Dark Navy / Electric Blue Header */}
              <div className="flex shrink-0 items-center justify-between bg-gradient-to-r from-[#071D3B] via-[#0E284D] to-[#102D57] px-6 py-5 text-white">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xl font-black text-white">
                      {selectedRfq.rfqNumber || `RFQ-${selectedRfq.id.substring(0, 8)}`}
                    </span>
                    <StatusBadge status={selectedRfq.status} />
                  </div>
                  <p className="mt-1 text-xs text-white/70">
                    Created on {selectedRfq.createdAt ? new Date(selectedRfq.createdAt).toLocaleString() : selectedRfq.rfqDate || "—"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRfq(null)}
                  className="rounded-xl p-2 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 space-y-6 overflow-y-auto p-6">
                {/* Metadata Grid */}
                <div className="grid gap-4 rounded-2xl border border-[#DCE6F3] bg-[#F5F8FF] p-5 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#526580]">
                      Procurement Officer
                    </p>
                    <p className="mt-1 text-sm font-bold text-[#101D3A]">
                      {selectedRfq.procurementOfficer || "Procurement Officer"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#526580]">
                      Warehouse
                    </p>
                    <p className="mt-1 text-sm font-bold text-[#101D3A]">
                      {selectedRfq.warehouse || "Central Warehouse"}
                    </p>
                  </div>
                  {selectedRfq.materialRequestNumber && (
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#526580]">
                        Material Request Ref
                      </p>
                      <p className="mt-1 text-sm font-mono font-bold text-[#0866FF]">
                        {selectedRfq.materialRequestNumber}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#526580]">
                      RFQ Date
                    </p>
                    <p className="mt-1 text-sm font-bold text-[#101D3A]">{selectedRfq.rfqDate || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#526580]">
                      Required Delivery Date
                    </p>
                    <p className="mt-1 text-sm font-bold text-[#101D3A]">
                      {selectedRfq.requiredDeliveryDate || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#526580]">
                      Supplier Contact Email(s)
                    </p>
                    <p
                      className="mt-1 text-sm font-medium text-[#101D3A] truncate"
                      title={selectedRfq.supplierEmails?.join(", ")}
                    >
                      {selectedRfq.supplierEmails?.join(", ") || "Auto-routed via Supplier Portal"}
                    </p>
                  </div>
                </div>

                {/* Material Requirements Table */}
                <div className="overflow-hidden rounded-2xl border border-[#DCE6F3]">
                  <div className="flex items-center gap-2 border-b border-[#DCE6F3] bg-[#F5F8FF] px-5 py-3.5">
                    <Package className="size-4 text-[#0866FF]" />
                    <h3 className="text-sm font-bold text-[#101D3A]">Material Requirements</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F5F8FF] border-b border-[#DCE6F3]">
                        <tr className="text-[10px] font-bold uppercase tracking-wider text-[#526580]">
                          <th className="px-4 py-3">Material Code</th>
                          <th className="px-4 py-3">Variant Code</th>
                          <th className="px-4 py-3">Material Name & Specifications</th>
                          <th className="px-4 py-3">Category</th>
                          <th className="px-4 py-3 text-right">Quantity</th>
                          <th className="px-4 py-3">UOM</th>
                          <th className="px-4 py-3">Destination</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#DCE6F3]">
                        {selectedRfq.items && selectedRfq.items.length > 0 ? (
                          selectedRfq.items.map((item: any, idx: number) => (
                            <tr key={idx} className="hover:bg-[#F5F8FF]/60 transition-colors">
                              <td className="whitespace-nowrap px-4 py-3.5 font-mono font-bold text-[#0866FF]">
                                {item.materialCode || item.material_code}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3.5 font-mono font-bold text-teal-600">
                                {item.variantCode || item.variant_code || "—"}
                              </td>
                              <td className="px-4 py-3.5 font-semibold text-[#101D3A]">
                                {item.materialName || item.material_name}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3.5 text-[#526580] font-medium">
                                {item.category || "General"}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3.5 text-right font-mono font-extrabold text-[#101D3A] tabular-nums">
                                {item.quantity}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3.5 font-bold text-[#526580]">
                                {item.uom || "PCS"}
                              </td>
                              <td className="whitespace-nowrap px-4 py-3.5 text-[#526580]">
                                {item.warehouse || selectedRfq.warehouse || "Central"}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={7} className="px-4 py-8 text-center text-sm text-[#526580]">
                              No material requirements listed for this RFQ.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Invited Suppliers List */}
                {selectedRfq.suppliers && selectedRfq.suppliers.length > 0 && (
                  <div className="overflow-hidden rounded-2xl border border-[#DCE6F3]">
                    <div className="flex items-center gap-2 border-b border-[#DCE6F3] bg-[#F5F8FF] px-5 py-3.5">
                      <Building2 className="size-4 text-[#0866FF]" />
                      <h3 className="text-sm font-bold text-[#101D3A]">
                        Invited Suppliers ({selectedRfq.suppliers.length})
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-2.5 p-4 bg-white">
                      {selectedRfq.suppliers.map((sup: any) => (
                        <div
                          key={sup.supplierId}
                          className="inline-flex items-center gap-2 rounded-xl border border-[#DCE6F3] bg-[#F5F8FF] px-3.5 py-2 text-xs font-bold text-[#101D3A] shadow-2xs"
                        >
                          <Building2 className="size-3.5 text-[#0866FF]" />
                          <span>{sup.supplierName}</span>
                          {sup.supplierCode && (
                            <span className="font-mono text-[10px] text-[#526580]">
                              ({sup.supplierCode})
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notice Strip */}
                <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50/60 p-4">
                  <Info className="size-5 text-[#0866FF] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-[#101D3A]">Supplier Notification Notice</p>
                    <p className="mt-0.5 text-xs text-[#526580]">
                      Publishing this RFQ will automatically notify all{" "}
                      <strong>{selectedRfq.suppliers?.length || 0}</strong> invited suppliers to submit bids
                      via the supplier portal with digital quotation records.
                    </p>
                  </div>
                </div>

                {selectedRfq.remarks && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-[#526580]">
                      Remarks / Instructions
                    </h4>
                    <p className="mt-1.5 rounded-xl border border-[#DCE6F3] bg-[#F5F8FF] p-3.5 text-xs text-[#101D3A] leading-relaxed whitespace-pre-wrap">
                      {selectedRfq.remarks}
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex shrink-0 items-center justify-between gap-3 border-t border-[#DCE6F3] bg-[#F5F8FF] px-6 py-4">
                <div>
                  {selectedRfq.status !== "CANCELLED" && selectedRfq.status !== "CLOSED" && (
                    <Button
                      variant="outline"
                      className="rounded-xl border-red-200 text-[#E5484D] hover:bg-red-50 hover:border-red-300 font-bold text-xs"
                      disabled={sendingRfq}
                      onClick={() => handleCancelRfq(selectedRfq.id)}
                    >
                      <X className="mr-1.5 size-3.5" /> Cancel RFQ
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    className="rounded-xl border-[#DCE6F3] bg-white text-[#101D3A] hover:bg-[#F5F8FF] font-semibold text-xs"
                    onClick={() => setSelectedRfq(null)}
                  >
                    Close
                  </Button>

                  {(selectedRfq.status === "DRAFT" ||
                    selectedRfq.status === "OPEN" ||
                    selectedRfq.status === "SENT") && (
                    <Button
                      className="rounded-xl bg-[#0866FF] hover:bg-[#0054D6] text-white font-bold text-xs shadow-xs"
                      disabled={sendingRfq}
                      onClick={() => handleSendRfq(selectedRfq.id)}
                    >
                      {sendingRfq ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" /> Sending...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 size-4" />{" "}
                          {selectedRfq.status === "DRAFT" ? "Approve & Send RFQ" : "Resend RFQ Email"}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
}
