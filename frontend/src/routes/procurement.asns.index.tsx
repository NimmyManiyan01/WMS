import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Search,
  Filter,
  Truck,
  MoreHorizontal,
  ArrowRight,
  Loader2,
  MapPin,
  Eye,
  FileText,
  RefreshCw,
  Download,
  Info,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Package,
  Calendar,
  X,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api, BUSINESS_API_URL } from "@/lib/api-client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/procurement/asns/")({
  component: Asns,
});

function readField(row: any, camelKey: string, snakeKey: string = camelKey): any {
  return row?.[camelKey] ?? row?.[snakeKey];
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function resolveDocumentUrl(fileUrl?: string): string {
  if (!fileUrl) return "";
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
  const normalizedPath = fileUrl.startsWith("/") ? fileUrl : `/${fileUrl}`;
  return `${BUSINESS_API_URL}${normalizedPath}`;
}

function buildAsnPrintHtml(asn: any): string {
  const lines = readField(asn, "lines", "lines") || [];
  const documents = readField(asn, "documents", "documents") || [];
  const asnNumber = readField(asn, "asnNumber", "asn_number") || "ASN";
  const poNumber = readField(asn, "poNumber", "po_number") || "Unlinked";

  const lineRows = lines.length
    ? lines
        .map(
          (line: any) => `
            <tr>
              <td>${escapeHtml(readField(line, "itemCode", "item_code"))}</td>
              <td>${escapeHtml(readField(line, "materialName", "material_name"))}</td>
              <td class="num">${escapeHtml(readField(line, "shippedQuantity", "shipped_quantity") || 0)}</td>
              <td>${escapeHtml(line.uom || "PCS")}</td>
            </tr>
          `,
        )
        .join("")
    : `<tr><td colspan="4" class="empty">No shipment lines found.</td></tr>`;

  const documentRows = documents.length
    ? documents
        .map(
          (document: any) => `
            <tr>
              <td>${escapeHtml(readField(document, "documentType", "document_type"))}</td>
              <td>${escapeHtml(readField(document, "fileName", "file_name"))}</td>
              <td>${escapeHtml(readField(document, "uploadedBy", "uploaded_by") || "N/A")}</td>
            </tr>
          `,
        )
        .join("")
    : `<tr><td colspan="3" class="empty">No documents attached.</td></tr>`;

  return `<!doctype html>
    <html>
      <head>
        <title>${escapeHtml(asnNumber)} Export</title>
        <style>
          body { margin: 0; color: #101D3A; font-family: Inter, Arial, sans-serif; background: #F5F8FF; }
          main { max-width: 900px; margin: 24px auto; background: #fff; padding: 32px; border: 1px solid #DCE6F3; border-radius: 16px; }
          header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 3px solid #0866FF; padding-bottom: 18px; }
          h1 { margin: 0; font-size: 26px; color: #101D3A; }
          h2 { margin: 28px 0 12px; font-size: 16px; color: #101D3A; }
          .muted { color: #526580; }
          .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 20px; }
          .box { border: 1px solid #DCE6F3; border-radius: 12px; padding: 12px; background: #F5F8FF; }
          .label { color: #526580; font-size: 11px; font-weight: 700; text-transform: uppercase; }
          .value { margin-top: 4px; font-weight: 700; color: #101D3A; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
          th { background: #F5F8FF; color: #526580; text-align: left; padding: 10px; font-size: 11px; text-transform: uppercase; }
          td { border-top: 1px solid #DCE6F3; padding: 10px; vertical-align: top; }
          .num { text-align: right; font-variant-numeric: tabular-nums; font-family: monospace; }
          .empty { text-align: center; color: #526580; font-style: italic; }
          @media print { body { background: #fff; } main { margin: 0; border: 0; } button { display: none; } }
        </style>
      </head>
      <body>
        <main>
          <header>
            <div>
              <h1>Advance Shipping Notice</h1>
              <div class="muted">${escapeHtml(asnNumber)}</div>
            </div>
            <div>
              <div class="label">PO Reference</div>
              <div class="value">${escapeHtml(poNumber)}</div>
            </div>
          </header>
          <section class="grid">
            <div class="box"><div class="label">Supplier</div><div class="value">${escapeHtml(readField(asn, "supplierName", "supplier_name") || "Independent Supplier")}</div></div>
            <div class="box"><div class="label">Status</div><div class="value">${escapeHtml(asn.status || "N/A")}</div></div>
            <div class="box"><div class="label">Transporter</div><div class="value">${escapeHtml(asn.transporter || "N/A")}</div></div>
            <div class="box"><div class="label">Vehicle</div><div class="value">${escapeHtml(readField(asn, "vehicleNumber", "vehicle_number") || "N/A")}</div></div>
            <div class="box"><div class="label">Driver</div><div class="value">${escapeHtml(readField(asn, "driverName", "driver_name") || "N/A")}</div></div>
            <div class="box"><div class="label">Expected Arrival</div><div class="value">${escapeHtml(readField(asn, "expectedArrivalAt", "expected_arrival_at") ? new Date(readField(asn, "expectedArrivalAt", "expected_arrival_at")).toLocaleDateString() : "N/A")}</div></div>
            <div class="box"><div class="label">Invoice</div><div class="value">${escapeHtml(readField(asn, "invoiceNumber", "invoice_number") || "N/A")}</div></div>
            <div class="box"><div class="label">Challan</div><div class="value">${escapeHtml(readField(asn, "challanNumber", "challan_number") || "N/A")}</div></div>
          </section>
          <h2>Shipment Lines</h2>
          <table>
            <thead><tr><th>Material</th><th>Description</th><th class="num">Shipped Qty</th><th>UOM</th></tr></thead>
            <tbody>${lineRows}</tbody>
          </table>
          <h2>Documents</h2>
          <table>
            <thead><tr><th>Type</th><th>File Name</th><th>Uploaded By</th></tr></thead>
            <tbody>${documentRows}</tbody>
          </table>
        </main>
        <script>window.addEventListener("load", () => setTimeout(() => window.print(), 250));</script>
      </body>
    </html>`;
}

function Asns() {
  const [asns, setAsns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedAsn, setSelectedAsn] = useState<any | null>(null);
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [loadingDocumentsId, setLoadingDocumentsId] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);

  const fetchData = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setRefreshing(true);
      const data = await api.getAsns();
      setAsns(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch ASNs:", error);
      if (showLoader) toast.error("Failed to refresh ASNs");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") fetchData();
    };
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    const refreshTimer = window.setInterval(() => fetchData(), 15000);

    return () => {
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.clearInterval(refreshTimer);
    };
  }, [fetchData]);

  // KPIs
  const totalCount = asns.length;

  const inTransitCount = useMemo(() => {
    return asns.filter((a) => {
      const s = String(a.status || "").toUpperCase();
      return s.includes("TRANSIT") || s.includes("SHIPPED") || s.includes("DISPATCH");
    }).length;
  }, [asns]);

  const awaitingDockCount = useMemo(() => {
    return asns.filter((a) => {
      const s = String(a.status || "").toUpperCase();
      return s.includes("AWAIT") || s.includes("DOCK") || s.includes("ARRIVED") || s.includes("PENDING");
    }).length;
  }, [asns]);

  const deliveredCount = useMemo(() => {
    return asns.filter((a) => {
      const s = String(a.status || "").toUpperCase();
      return s.includes("DELIVER") || s.includes("RECEIV") || s.includes("COMPLET");
    }).length;
  }, [asns]);

  const filteredAsns = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return asns.filter((asn) => {
      const status = String(asn.status || "").toUpperCase();
      let matchesStatus = true;
      if (statusFilter === "IN_TRANSIT") {
        matchesStatus = status.includes("TRANSIT") || status.includes("SHIPPED") || status.includes("DISPATCH");
      } else if (statusFilter === "AWAITING_DOCK") {
        matchesStatus = status.includes("AWAIT") || status.includes("DOCK") || status.includes("ARRIVED") || status.includes("PENDING");
      } else if (statusFilter === "DELIVERED") {
        matchesStatus = status.includes("DELIVER") || status.includes("RECEIV") || status.includes("COMPLET");
      } else if (statusFilter !== "ALL") {
        matchesStatus = status === statusFilter.toUpperCase();
      }

      if (!matchesStatus) return false;
      if (!query) return true;

      const searchableText = [
        asn.asnNumber,
        asn.asn_number,
        asn.poNumber,
        asn.po_number,
        asn.supplierName,
        asn.supplier_name,
        asn.transporter,
        asn.vehicleNumber,
        asn.vehicle_number,
        asn.driverName,
        asn.driver_name,
        asn.invoiceNumber,
        asn.invoice_number,
        asn.challanNumber,
        asn.challan_number,
        asn.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(query);
    });
  }, [asns, searchTerm, statusFilter]);

  const hasActiveFilters = searchTerm.trim() !== "" || statusFilter !== "ALL";

  const handleViewDocuments = async (asn: any) => {
    const asnId = readField(asn, "id");
    try {
      setLoadingDocumentsId(asnId);
      const freshAsn = await api.getAsn(asnId);
      setSelectedAsn(freshAsn);
      setDocumentsOpen(true);
    } catch (error: any) {
      toast.error("Unable to load ASN documents", { description: error.message });
    } finally {
      setLoadingDocumentsId(null);
    }
  };

  const handleExportPdf = async (asn: any) => {
    const asnId = readField(asn, "id");
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup blocked", {
        description: "Allow popups for this site to export the ASN PDF.",
      });
      return;
    }

    printWindow.document.open();
    printWindow.document.write(
      "<!doctype html><html><body style=\"font-family:Arial,sans-serif;padding:24px\">Preparing ASN export...</body></html>",
    );
    printWindow.document.close();

    try {
      setExportingId(asnId);
      const freshAsn = await api.getAsn(asnId);
      printWindow.document.open();
      printWindow.document.write(buildAsnPrintHtml(freshAsn));
      printWindow.document.close();
      toast.success("ASN PDF export opened");
    } catch (error: any) {
      printWindow.close();
      toast.error("Unable to export ASN PDF", { description: error.message });
    } finally {
      setExportingId(null);
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
          <span className="font-bold text-[#101D3A]">Advanced Shipping Notices</span>
        </div>

        {/* 2. Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="size-12 rounded-2xl bg-[#EBF3FF] border border-[#DCE6F3] text-[#0866FF] flex items-center justify-center shadow-xs shrink-0">
              <Truck className="size-6 text-[#0866FF]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-[30px] font-extrabold tracking-tight text-[#101D3A] leading-tight">
                  Advanced Shipping Notices
                </h1>
                <TooltipProvider>
                  <Tooltip delayDuration={200}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label="ASNs Info"
                        className="inline-flex items-center text-[#526580] hover:text-[#0866FF] transition-colors cursor-help"
                      >
                        <Info className="size-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs text-xs bg-[#071D3B] text-white border-0 shadow-xl p-3">
                      <p className="font-bold">Advance Shipping Notices (ASNs)</p>
                      <p className="mt-1 text-slate-300">
                        Pre-arrival manifests submitted by suppliers detail expected inbound shipments, transporter information, vehicle license plates, and attached invoices.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-xs sm:text-sm font-medium text-[#526580] mt-0.5">
                Track incoming supplier shipments, transit status, and vehicle arrivals
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
            <Button
              variant="outline"
              onClick={() => void fetchData(true)}
              disabled={refreshing || loading}
              className="h-10 rounded-xl border-[#DCE6F3] bg-white text-[#101D3A] hover:bg-[#F5F8FF] hover:border-[#0866FF]/40 font-semibold text-xs sm:text-sm shadow-xs gap-2"
            >
              <RefreshCw className={`size-4 text-[#0866FF] ${refreshing ? "animate-spin" : ""}`} />
              Refresh ASNs
            </Button>
          </div>
        </div>

        {/* 3. 4 KPI Summary Cards with Amber Highlight on Awaiting Dock */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {/* Total ASNs */}
          <div className="group relative overflow-hidden rounded-2xl border border-[#DCE6F3] bg-white p-5 shadow-xs transition-all hover:border-[#0866FF]/30 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-[13px] font-bold text-[#526580]">Total Inbound ASNs</span>
              <div className="grid size-10 place-items-center rounded-xl bg-[#EBF3FF] text-[#0866FF]">
                <Truck className="size-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-[32px] font-extrabold tracking-tight text-[#101D3A] tabular-nums">
                {totalCount}
              </span>
            </div>
            <p className="mt-1 text-[11px] font-semibold text-[#526580]">All recorded shipments</p>
          </div>

          {/* In Transit */}
          <div className="group relative overflow-hidden rounded-2xl border border-[#DCE6F3] bg-white p-5 shadow-xs transition-all hover:border-[#00D4FF]/30 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-[13px] font-bold text-[#526580]">In Transit</span>
              <div className="grid size-10 place-items-center rounded-xl bg-cyan-50 text-[#00A3C4]">
                <Clock className="size-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-[32px] font-extrabold tracking-tight text-[#101D3A] tabular-nums">
                {inTransitCount}
              </span>
            </div>
            <p className="mt-1 text-[11px] font-semibold text-[#526580]">On the road to warehouse</p>
          </div>

          {/* Awaiting Dock — Highlighted in Amber per requirements */}
          <div className="group relative overflow-hidden rounded-2xl border-2 border-[#F5A623]/40 bg-gradient-to-br from-white to-amber-50/30 p-5 shadow-xs transition-all hover:border-[#F5A623] hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-[13px] font-extrabold text-[#B45309]">Awaiting Dock</span>
              <div className="grid size-10 place-items-center rounded-xl bg-amber-100 text-[#F5A623]">
                <AlertTriangle className="size-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-[32px] font-extrabold tracking-tight text-[#B45309] tabular-nums">
                {awaitingDockCount}
              </span>
            </div>
            <p className="mt-1 text-[11px] font-bold text-[#B45309]">Vehicles ready for gate/docking</p>
          </div>

          {/* Delivered / Completed */}
          <div className="group relative overflow-hidden rounded-2xl border border-[#DCE6F3] bg-white p-5 shadow-xs transition-all hover:border-[#16C784]/30 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-[13px] font-bold text-[#526580]">Received & Completed</span>
              <div className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-[#16C784]">
                <CheckCircle2 className="size-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-[32px] font-extrabold tracking-tight text-[#101D3A] tabular-nums">
                {deliveredCount}
              </span>
            </div>
            <p className="mt-1 text-[11px] font-semibold text-[#526580]">Unloaded at warehouse</p>
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
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search ASN number, PO ref, supplier, vehicle, invoice..."
                className="h-10 w-full rounded-xl border border-[#DCE6F3] bg-[#F5F8FF] pl-10 pr-10 text-xs sm:text-sm font-medium text-[#101D3A] outline-none transition-all placeholder:text-[#526580]/70 focus:border-[#0866FF] focus:bg-white focus:ring-2 focus:ring-[#0866FF]/20"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#526580] hover:text-[#101D3A]"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            {/* Status Pills Filter */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "ALL", label: "All ASNs", count: totalCount },
                { id: "IN_TRANSIT", label: "In Transit", count: inTransitCount },
                { id: "AWAITING_DOCK", label: "Awaiting Dock", count: awaitingDockCount },
                { id: "DELIVERED", label: "Received", count: deliveredCount },
              ].map((tab) => {
                const isActive = statusFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all",
                      isActive
                        ? "bg-[#0866FF] text-white shadow-xs"
                        : "bg-[#F5F8FF] text-[#526580] hover:bg-[#EBF2FC] hover:text-[#101D3A] border border-[#DCE6F3]/60",
                    )}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-white text-[#526580] border border-[#DCE6F3]",
                      )}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("ALL");
                  }}
                  className="h-9 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* 5. Shipment Cards List */}
        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-[#DCE6F3] bg-white p-8">
            <Loader2 className="size-8 animate-spin text-[#0866FF]" />
            <p className="mt-3 text-sm font-semibold text-[#526580]">Loading shipping notices...</p>
          </div>
        ) : asns.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-[#DCE6F3] bg-white p-12 text-center shadow-xs">
            <div className="grid size-16 place-items-center rounded-2xl bg-[#EBF3FF] text-[#0866FF]">
              <Truck className="size-8 text-[#0866FF]" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-[#101D3A]">No Shipments Tracked Yet</h3>
            <p className="mt-1 max-w-sm text-xs sm:text-sm text-[#526580]">
              Incoming supplier shipments will appear here automatically once suppliers generate and dispatch ASNs.
            </p>
          </div>
        ) : filteredAsns.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-[#DCE6F3] bg-white p-10 text-center shadow-xs">
            <div className="grid size-14 place-items-center rounded-2xl bg-[#F5F8FF] text-[#526580]">
              <Search className="size-7" />
            </div>
            <h3 className="mt-4 text-base font-bold text-[#101D3A]">No Matching ASNs Found</h3>
            <p className="mt-1 text-xs text-[#526580]">
              Try a different ASN number, supplier name, vehicle, or status filter.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("ALL");
              }}
              className="mt-4 rounded-xl border-[#DCE6F3] text-xs font-semibold"
            >
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredAsns.map((asn) => {
              const poRef = asn.poNumber || asn.po_number || asn.poId || asn.po_id;
              const isUnlinkedPo = !poRef || String(poRef).toUpperCase() === "UNLINKED";
              const isAwaitingDock = String(asn.status || "").toUpperCase().includes("DOCK") ||
                String(asn.status || "").toUpperCase().includes("AWAIT");

              let rawLog = asn.logistics;
              if (typeof rawLog === "string") {
                try {
                  rawLog = JSON.parse(rawLog);
                } catch {
                  rawLog = null;
                }
              }
              const logList = Array.isArray(rawLog) && rawLog.length > 0 ? rawLog : null;
              const displayTransporter = logList
                ? logList.map((l: any) => l.transporter).filter(Boolean).join(", ") || asn.transporter || "—"
                : asn.transporter || "—";
              const displayVehicles = logList
                ? logList.map((l: any) => l.vehicle_number || l.vehicleNumber).filter(Boolean).join(", ") || asn.vehicleNumber || "—"
                : asn.vehicleNumber || "—";

              return (
                <div
                  key={asn.id}
                  className={cn(
                    "group relative overflow-hidden rounded-2xl border bg-white p-5 sm:p-6 shadow-xs transition-all hover:shadow-md",
                    isAwaitingDock
                      ? "border-amber-300 hover:border-amber-400 bg-gradient-to-r from-amber-50/20 via-white to-white"
                      : "border-[#DCE6F3] hover:border-[#0866FF]/40",
                  )}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    {/* Left Info Area */}
                    <div className="flex flex-1 items-start gap-4">
                      <div
                        className={cn(
                          "grid size-12 shrink-0 place-items-center rounded-2xl border shadow-xs",
                          isAwaitingDock
                            ? "bg-amber-100/70 border-amber-300 text-amber-700"
                            : "bg-gradient-to-br from-[#EBF3FF] to-[#D5E8FF] border-[#CBE0FC] text-[#0866FF]",
                        )}
                      >
                        <Truck className="size-6" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h3 className="font-mono text-base sm:text-lg font-extrabold text-[#0866FF] tracking-tight">
                            {asn.asnNumber || asn.asn_number || `ASN-${String(asn.id).substring(0, 8)}`}
                          </h3>
                          <StatusBadge status={asn.status} />
                          {isAwaitingDock && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              <span className="size-1.5 rounded-full bg-amber-600 animate-pulse" />
                              Dock Pending
                            </span>
                          )}
                        </div>

                        {/* Supplier Name */}
                        <p className="mt-1 text-sm font-bold text-[#101D3A]">
                          {asn.supplierName || asn.supplier_name || "Independent Supplier Partner"}
                        </p>

                        {/* Well-Aligned Details Grid */}
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium text-[#526580]">
                          {/* PO Reference — Clean muted tag if unlinked, prominent only when real */}
                          {isUnlinkedPo ? (
                            <span className="inline-flex items-center gap-1 rounded-lg border border-[#DCE6F3] bg-[#F5F8FF] px-2.5 py-1 text-xs font-medium text-[#526580]">
                              PO: Unlinked
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-lg border border-[#CBE0FC] bg-[#EBF3FF] px-2.5 py-1 font-mono text-xs font-bold text-[#0866FF]">
                              PO: {poRef}
                            </span>
                          )}

                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCE6F3] bg-[#F5F8FF] px-2.5 py-1">
                            <span className="text-[#526580]">Transporter:</span>
                            <strong className="text-[#101D3A] font-semibold">{displayTransporter}</strong>
                          </span>

                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCE6F3] bg-[#F5F8FF] px-2.5 py-1">
                            <span className="text-[#526580]">Vehicle:</span>
                            <strong className="font-mono text-[#101D3A] font-bold">{displayVehicles}</strong>
                          </span>

                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCE6F3] bg-[#F5F8FF] px-2.5 py-1">
                            <Package className="size-3.5 text-[#526580]" />
                            <strong className="text-[#101D3A]">{asn.numberOfPackages || 0}</strong> Pkgs
                          </span>

                          {(asn.invoiceNumber || asn.invoice_number) && (
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCE6F3] bg-[#F5F8FF] px-2.5 py-1">
                              <span className="text-[#526580]">Inv:</span>
                              <strong className="font-mono text-[#101D3A]">{asn.invoiceNumber || asn.invoice_number}</strong>
                            </span>
                          )}

                          {(asn.challanNumber || asn.challan_number) && (
                            <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#DCE6F3] bg-[#F5F8FF] px-2.5 py-1">
                              <span className="text-[#526580]">Challan:</span>
                              <strong className="font-mono text-[#101D3A]">{asn.challanNumber || asn.challan_number}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Arrival Time & Primary Action */}
                    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#DCE6F3]/60 pt-3 lg:border-0 lg:pt-0">
                      {/* Expected Arrival Column */}
                      <div className="text-left lg:text-right">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#526580]">
                          <MapPin className="size-3 text-[#0866FF]" /> Expected Arrival
                        </div>
                        <p className="mt-0.5 text-xs sm:text-sm font-extrabold tabular-nums text-[#101D3A]">
                          {asn.expectedArrivalAt
                            ? new Date(asn.expectedArrivalAt).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "Not Scheduled"}
                        </p>
                      </div>

                      {/* Action Buttons: Track Shipment as PRIMARY */}
                      <div className="flex items-center gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-10 w-10 rounded-xl border-[#DCE6F3] bg-white text-[#101D3A] hover:bg-[#F5F8FF]"
                              title="More Options"
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl min-w-[160px] border-[#DCE6F3]">
                            <DropdownMenuItem
                              className="rounded-lg gap-2 cursor-pointer font-medium text-xs py-2"
                              disabled={loadingDocumentsId === asn.id}
                              onSelect={(event) => {
                                event.preventDefault();
                                void handleViewDocuments(asn);
                              }}
                            >
                              {loadingDocumentsId === asn.id ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <Eye className="size-3.5 text-[#0866FF]" />
                              )}
                              View Attached Documents
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="rounded-lg gap-2 cursor-pointer font-medium text-xs py-2"
                              disabled={exportingId === asn.id}
                              onSelect={(event) => {
                                event.preventDefault();
                                void handleExportPdf(asn);
                              }}
                            >
                              {exportingId === asn.id ? (
                                <Loader2 className="size-3.5 animate-spin" />
                              ) : (
                                <FileText className="size-3.5 text-[#0866FF]" />
                              )}
                              Export ASN PDF
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Primary Button */}
                        <Button
                          className="h-10 rounded-xl bg-[#0866FF] hover:bg-[#0054D6] text-white font-bold text-xs shadow-xs px-4 group gap-1.5"
                          asChild
                        >
                          <Link to="/procurement/asns/$asnId" params={{ asnId: asn.id }}>
                            <span>Track Shipment</span>
                            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Documents Modal */}
        <Dialog open={documentsOpen} onOpenChange={setDocumentsOpen}>
          <DialogContent className="max-w-2xl rounded-2xl border-[#DCE6F3] p-6 shadow-2xl">
            <DialogHeader className="border-b border-[#DCE6F3] pb-4">
              <DialogTitle className="text-lg font-bold text-[#101D3A]">
                ASN Documents — {readField(selectedAsn, "asnNumber", "asn_number") || "Selected ASN"}
              </DialogTitle>
              <DialogDescription className="text-xs text-[#526580]">
                Verified shipping documents uploaded by supplier for this advance shipment notice.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 pt-4">
              {(readField(selectedAsn, "documents", "documents") || []).length > 0 ? (
                (readField(selectedAsn, "documents", "documents") || []).map((document: any, index: number) => {
                  const fileName = readField(document, "fileName", "file_name") || "Document";
                  const documentType = readField(document, "documentType", "document_type") || "Document";
                  const fileUrl = resolveDocumentUrl(readField(document, "fileUrl", "file_url"));

                  return (
                    <div
                      key={`${fileName}-${index}`}
                      className="flex flex-col gap-3 rounded-xl border border-[#DCE6F3] bg-[#F5F8FF] p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#EBF3FF] text-[#0866FF]">
                          <FileText className="size-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-[#101D3A]">{fileName}</p>
                          <p className="text-xs font-semibold uppercase tracking-wider text-[#526580]">
                            {documentType}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="rounded-xl border-[#DCE6F3] bg-white text-xs font-bold text-[#101D3A] hover:bg-[#EBF3FF]"
                        disabled={!fileUrl}
                        asChild={!!fileUrl}
                      >
                        {fileUrl ? (
                          <a href={fileUrl} target="_blank" rel="noreferrer">
                            <Download className="mr-2 size-3.5 text-[#0866FF]" /> Open Document
                          </a>
                        ) : (
                          <span>
                            <Download className="mr-2 size-3.5 text-[#526580]" /> Missing File
                          </span>
                        )}
                      </Button>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl border-2 border-dashed border-[#DCE6F3] p-8 text-center bg-white">
                  <FileText className="mx-auto mb-2 size-10 text-[#8FA3BF]/40" />
                  <p className="text-sm font-bold text-[#101D3A]">
                    No shipping documents attached
                  </p>
                  <p className="text-xs text-[#526580] mt-0.5">
                    Supplier has not uploaded invoice or e-way bill scans for this ASN yet.
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
