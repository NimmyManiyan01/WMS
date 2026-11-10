import { createFileRoute, Link } from "@tanstack/react-router";
import * as React from "react";
import { useState, useEffect, useRef, useMemo } from "react";
import {
  Building2,
  ClipboardList,
  FileText,
  FileQuestion,
  FileBadge,
  Users,
  CheckCircle2,
  Plus,
  BarChart3,
  ArrowUpRight,
  ShieldCheck,
  Loader2,
  Search,
  Truck,
  Clock3,
  AlertTriangle,
  IndianRupee,
  PackageCheck,
  DoorOpen,
  Warehouse,
  Boxes,
  PieChart as PieIcon,
  RefreshCw,
  ChevronRight,
  Sparkles,
  Layers,
  ArrowRight,
  Info,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { AppShell, StatusBadge } from "@/components/wms/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { api } from "@/lib/api-client";
import { requireRole } from "@/lib/auth-utils";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/procurement-dashboard")({
  beforeLoad: () => requireRole("PROCUREMENT"),
  head: () => ({
    meta: [
      { title: "Enterprise Procurement Dashboard · KaizenX" },
      {
        name: "description",
        content: "Manage suppliers, purchase orders, sourcing and procurement workflows with complete enterprise visibility.",
      },
    ],
  }),
  component: ProcurementDashboard,
});

/* -------------------------------------------------------------------------- */
/*                               Data Formatters                              */
/* -------------------------------------------------------------------------- */

function formatInrCompact(value: number): string {
  if (!Number.isFinite(value) || value === 0) return "₹0";
  if (Math.abs(value) >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
  if (Math.abs(value) >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
  return `₹${value.toLocaleString("en-IN")}`;
}

function formatInrFull(value: number): string {
  if (!Number.isFinite(value)) return "₹0";
  return `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

/* -------------------------------------------------------------------------- */
/*                           KPI Configuration Models                         */
/* -------------------------------------------------------------------------- */

interface ModuleConfig {
  label: string;
  to: string;
  icon: any;
  countKey: "suppliers" | "requests" | "rfqs" | "quotes" | "pos" | "asns";
  tone: "primary" | "teal" | "success" | "warning";
  tooltip: string;
}

const procurementModules: readonly ModuleConfig[] = [
  {
    label: "Suppliers",
    to: "/master-data",
    icon: Building2,
    countKey: "suppliers",
    tone: "success",
    tooltip: "Active and registered vendor ecosystem in master records.",
  },
  {
    label: "Material Requests",
    to: "/procurement/material-requests",
    icon: ClipboardList,
    countKey: "requests",
    tone: "teal",
    tooltip: "Demand requests raised by operations or warehouse for procurement.",
  },
  {
    label: "RFQs",
    to: "/procurement/rfqs",
    icon: FileQuestion,
    countKey: "rfqs",
    tone: "warning",
    tooltip: "Requests for Quotation published to invited suppliers.",
  },
  {
    label: "Quotes",
    to: "/procurement/quotations",
    icon: FileBadge,
    countKey: "quotes",
    tone: "primary",
    tooltip: "Quotations received from suppliers awaiting evaluation.",
  },
  {
    label: "Purchase Orders",
    to: "/procurement/purchase-orders",
    icon: FileText,
    countKey: "pos",
    tone: "teal",
    tooltip: "Total legally binding purchase orders released to vendors.",
  },
  {
    label: "ASNs",
    to: "/procurement/asns",
    icon: Truck,
    countKey: "asns",
    tone: "success",
    tooltip: "Advance Shipping Notices received for incoming shipments.",
  },
] as const;

interface KpiConfig {
  label: string;
  to: string;
  icon: any;
  valueKey: string;
  tone: "warning" | "primary" | "danger" | "teal" | "success";
  currency?: boolean;
  tooltip: string;
}

const procurementKpis: readonly KpiConfig[] = [
  {
    label: "Pending Approvals",
    to: "/finance/approvals",
    icon: Clock3,
    valueKey: "pendingApprovals",
    tone: "warning",
    tooltip: "POs submitted awaiting Finance or Management sign-off.",
  },
  {
    label: "Pending Quotations",
    to: "/procurement/rfqs",
    icon: FileBadge,
    valueKey: "pendingQuotations",
    tone: "primary",
    tooltip: "Live RFQs awaiting competitive pricing submissions.",
  },
  {
    label: "Awaiting Confirmation",
    to: "/procurement/purchase-orders",
    icon: CheckCircle2,
    valueKey: "awaitingSupplierConfirmation",
    tone: "warning",
    tooltip: "POs sent to suppliers awaiting formal acceptance.",
  },
  {
    label: "Overdue Orders",
    to: "/procurement/purchase-orders",
    icon: AlertTriangle,
    valueKey: "overduePos",
    tone: "danger",
    tooltip: "POs past scheduled delivery date without full fulfillment.",
  },
  {
    label: "Partially Received",
    to: "/procurement/purchase-orders",
    icon: PackageCheck,
    valueKey: "partiallyReceivedPos",
    tone: "teal",
    tooltip: "Orders with GRN partial receipts pending remaining balance.",
  },
  {
    label: "Total PO Value",
    to: "/procurement/purchase-orders",
    icon: IndianRupee,
    valueKey: "totalPoValue",
    tone: "success",
    currency: true,
    tooltip: "Cumulative gross value of active procurement commitments.",
  },
] as const;

/* -------------------------------------------------------------------------- */
/*                        13-Step Procurement Flow                           */
/* -------------------------------------------------------------------------- */

const procurementFlowStages = [
  { step: "01", label: "Supplier", desc: "Vendor Master", to: "/master-data", icon: Building2 },
  { step: "02", label: "Demand", desc: "Material Request", to: "/procurement/material-requests", icon: ClipboardList },
  { step: "03", label: "Sourcing", desc: "RFQ Broadcast", to: "/procurement/rfqs", icon: FileQuestion },
  { step: "04", label: "Quotation", desc: "Bid Evaluation", to: "/procurement/quotations", icon: FileBadge },
  { step: "05", label: "Approval", desc: "Finance Release", to: "/finance/approvals", icon: CheckCircle2 },
  { step: "06", label: "Confirmation", desc: "Vendor Acknowledgement", to: "/procurement/purchase-orders", icon: Clock3 },
  { step: "07", label: "ASN", desc: "Shipment Notice", to: "/procurement/asns", icon: Truck },
  { step: "08", label: "Gate Entry", desc: "Vehicle Inward", to: "/gate-entry", icon: DoorOpen },
  { step: "09", label: "Dock", desc: "Bay Allocation", to: "/dock-management", icon: Warehouse },
  { step: "10", label: "GRN", desc: "Goods Receipt", to: "/grn", icon: FileText },
  { step: "11", label: "Inspection", desc: "Quality Verification", to: "/procurement/quality-issues", icon: ShieldCheck },
  { step: "12", label: "Putaway", desc: "Bin Placement", to: "/my-store", icon: PackageCheck },
  { step: "13", label: "Inventory", desc: "Stock Ready", to: "/inventory", icon: Boxes },
] as const;

/* -------------------------------------------------------------------------- */
/*                             Custom KPI Card                                */
/* -------------------------------------------------------------------------- */

function KPIStatCard({
  label,
  value,
  icon: Icon,
  tone,
  to,
  tooltip,
  loading = false,
}: {
  label: string;
  value: string | number;
  icon: any;
  tone: "primary" | "teal" | "success" | "warning" | "danger";
  to: string;
  tooltip?: string;
  loading?: boolean;
}) {
  const toneClasses = {
    primary: "bg-blue-50 text-[#2563EB] border-blue-100",
    teal: "bg-teal-50 text-[#0D9488] border-teal-100",
    success: "bg-emerald-50 text-[#16A34A] border-emerald-100",
    warning: "bg-amber-50 text-[#D97706] border-amber-100",
    danger: "bg-red-50 text-[#EF4444] border-red-100",
  }[tone];

  return (
    <Link
      to={to as any}
      className="group relative flex flex-col justify-between rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-[#2563EB]/40 hover:shadow-md"
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn(
            "grid size-9 place-items-center rounded-xl border transition-colors",
            toneClasses,
          )}
        >
          <Icon className="size-4.5" />
        </span>
        <div className="flex items-center gap-1">
          {tooltip && (
            <TooltipProvider>
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={`Info: ${label}`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    className="p-1 text-[#94A3B8] transition-colors hover:text-[#0F172A]"
                  >
                    <Info className="size-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs font-normal">
                  {tooltip}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <ArrowRight className="size-3.5 text-[#94A3B8] opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-[#2563EB] group-hover:opacity-100" />
        </div>
      </div>

      <div className="mt-3.5 min-w-0">
        <p className="text-[28px] font-bold tracking-tight text-[#0F172A] tabular-nums leading-none">
          {loading ? "..." : value}
        </p>
        <p className="mt-1.5 text-[13px] font-medium text-[#64748B] leading-tight line-clamp-1">
          {label}
        </p>
      </div>
    </Link>
  );
}

/* -------------------------------------------------------------------------- */
/*                           Main Dashboard Component                         */
/* -------------------------------------------------------------------------- */

function ProcurementDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [pos, setPos] = useState<any[]>([]);
  const [trendFilter, setTrendFilter] = useState<"all" | "6m" | "3m">("all");
  const [moduleCounts, setModuleCounts] = useState({
    suppliers: 0,
    requests: 0,
    rfqs: 0,
    quotes: 0,
    pos: 0,
    asns: 0,
  });
  const [stats, setStats] = useState<any>({
    activeSuppliers: 0,
    activeSuppliersThisMonth: 0,
    totalSuppliers: 0,
    openPos: 0,
    pendingApprovals: 0,
    pendingQuotations: 0,
    awaitingSupplierConfirmation: 0,
    overduePos: 0,
    partiallyReceivedPos: 0,
    rfqsClosingToday: 0,
    asnsExpectedToday: 0,
    complianceRate: 100,
    totalPoValue: 0,
    trend: [],
  });

  // Search states
  const [supplierQuery, setSupplierQuery] = useState("");
  const [poQuery, setPoQuery] = useState("");
  const [supplierResults, setSupplierResults] = useState<any[]>([]);
  const [poResults, setPoResults] = useState<any[]>([]);
  const [isSearchingSuppliers, setIsSearchingSuppliers] = useState(false);
  const [isSearchingPOs, setIsSearchingPOs] = useState(false);
  const [poSearchFailed, setPoSearchFailed] = useState(false);
  const poSearchInputRef = useRef<HTMLInputElement>(null);

  const loadData = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      const [sData, , poData, statsData, requestData, rfqData, quoteData, asnData] =
        await Promise.all([
          api.getSuppliers(),
          api.getNotifications("PROCUREMENT").catch(() => []),
          api.getPurchaseOrders(),
          api.getProcurementStats(),
          api.getMaterialRequests().catch(() => []),
          api.getRfqs().catch(() => []),
          api.getQuotations().catch(() => []),
          api.getAsns().catch(() => []),
        ]);

      setSuppliers(Array.isArray(sData) ? sData : []);
      setPos(Array.isArray(poData) ? poData : []);
      setStats(statsData || {});
      setModuleCounts({
        suppliers: Array.isArray(sData) ? sData.length : 0,
        requests: Array.isArray(requestData) ? requestData.length : 0,
        rfqs: Array.isArray(rfqData) ? rfqData.length : 0,
        quotes: Array.isArray(quoteData) ? quoteData.length : 0,
        pos: Array.isArray(poData) ? poData.length : 0,
        asns: Array.isArray(asnData) ? asnData.length : 0,
      });
    } catch (err) {
      console.error("Failed to load dashboard data", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Real-time Supplier Search
  useEffect(() => {
    if (!supplierQuery.trim()) {
      setSupplierResults([]);
      return;
    }

    const handler = setTimeout(async () => {
      setIsSearchingSuppliers(true);
      try {
        const results = await api.getSuppliers({ search: supplierQuery.trim() });
        setSupplierResults(Array.isArray(results) ? results : []);
      } catch (err) {
        console.error("Supplier search failed", err);
      } finally {
        setIsSearchingSuppliers(false);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [supplierQuery]);

  // Real-time PO Search
  useEffect(() => {
    if (!poQuery.trim()) {
      setPoResults([]);
      setPoSearchFailed(false);
      setIsSearchingPOs(false);
      return;
    }

    const controller = new AbortController();
    const handler = setTimeout(async () => {
      setIsSearchingPOs(true);
      setPoSearchFailed(false);
      try {
        const results = await api.getPurchaseOrders(poQuery.trim(), controller.signal);
        setPoResults(Array.isArray(results) ? results : []);
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error("PO search failed", err);
          setPoResults([]);
          setPoSearchFailed(true);
        }
      } finally {
        if (!controller.signal.aborted) setIsSearchingPOs(false);
      }
    }, 300);

    return () => {
      clearTimeout(handler);
      controller.abort();
    };
  }, [poQuery]);

  // Dynamic PO Status Distribution for Donut Chart
  const statusDistribution = useMemo(() => {
    if (!pos || pos.length === 0) return [];

    const counts: Record<string, number> = {};
    pos.forEach((p) => {
      const raw = String(p.status || "DRAFT").toUpperCase();
      let norm = "Draft";
      if (raw.includes("APPROV") && !raw.includes("PENDING") && !raw.includes("REJECT")) norm = "Approved";
      else if (raw.includes("PENDING")) norm = "Pending Approval";
      else if (raw.includes("CONFIRM")) norm = "Awaiting Conf.";
      else if (raw.includes("PARTIAL")) norm = "Partially Recv.";
      else if (raw.includes("COMPLETE") || raw.includes("FULFILL") || raw.includes("CLOSED")) norm = "Completed";
      else if (raw.includes("REJECT")) norm = "Rejected";
      else if (raw.includes("DRAFT")) norm = "Draft";
      else norm = "Open";

      counts[norm] = (counts[norm] || 0) + 1;
    });

    const palette: Record<string, string> = {
      Approved: "#16A34A",
      "Pending Approval": "#F59E0B",
      "Awaiting Conf.": "#2563EB",
      "Partially Recv.": "#0D9488",
      Completed: "#6366F1",
      Rejected: "#EF4444",
      Draft: "#94A3B8",
      Open: "#3B82F6",
    };

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      color: palette[name] || "#2563EB",
    }));
  }, [pos]);

  // Filtered Monthly Trend
  const filteredTrend = useMemo(() => {
    const rawTrend = Array.isArray(stats.trend) ? stats.trend : [];
    if (trendFilter === "3m") return rawTrend.slice(-3);
    if (trendFilter === "6m") return rawTrend.slice(-6);
    return rawTrend;
  }, [stats.trend, trendFilter]);

  // Action Alerts
  const actionAlerts = [
    {
      label: "POs awaiting approval",
      value: Number(stats.pendingApprovals || 0),
      tone: "danger",
      to: "/finance/approvals",
    },
    {
      label: "RFQs closing today",
      value: Number(stats.rfqsClosingToday || 0),
      tone: "warning",
      to: "/procurement/rfqs",
    },
    {
      label: "Supplier quotations pending",
      value: Number(stats.pendingQuotations || 0),
      tone: "warning",
      to: "/procurement/rfqs",
    },
    {
      label: "POs overdue delivery",
      value: Number(stats.overduePos || 0),
      tone: "danger",
      to: "/procurement/purchase-orders",
    },
    {
      label: "ASNs expected today",
      value: Number(stats.asnsExpectedToday || 0),
      tone: "success",
      to: "/procurement/asns",
    },
  ];

  return (
    <AppShell
      title="Enterprise Procurement Dashboard"
      subtitle="Strategic sourcing, purchase management and vendor performance control"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="h-9 gap-1.5 rounded-xl border-[#E2E8F0] bg-white text-xs font-semibold text-[#0F172A] hover:bg-slate-50"
          >
            <RefreshCw className={cn("size-3.5", refreshing && "animate-spin text-[#2563EB]")} />
            <span>Refresh</span>
          </Button>
          <Button
            size="sm"
            asChild
            className="h-9 gap-1.5 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold shadow-xs"
          >
            <Link to="/new-supplier">
              <Plus className="size-4" />
              <span>New Supplier</span>
            </Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* ==================================================================== */}
        {/* 1. Procurement Hero Banner (Section 5)                              */}
        {/* ==================================================================== */}
        <div className="relative overflow-hidden rounded-2xl border border-[#1E3A6B] bg-gradient-to-r from-[#0B1F3A] via-[#0F2345] to-[#173866] p-6 text-white shadow-md">
          {/* Subtle grid pattern background */}
          <div
            className="pointer-events-none absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "radial-gradient(#ffffff 1px, transparent 1px), radial-gradient(#ffffff 1px, transparent 1px)",
              backgroundSize: "24px 24px",
              backgroundPosition: "0 0, 12px 12px",
            }}
          />

          <div className="relative z-10 flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-[11px] font-semibold text-sky-300">
                <Sparkles className="size-3.5 text-sky-400" />
                <span>Enterprise Supply Chain Intelligence</span>
              </div>
              <h2 className="mt-2.5 text-2xl font-bold tracking-tight text-white lg:text-3xl">
                Enterprise Procurement
              </h2>
              <p className="mt-1.5 text-sm text-slate-300 leading-relaxed max-w-xl">
                Manage suppliers, sourcing, purchase operations and procurement workflows with complete visibility.
              </p>

              {/* Quick Actions Bar */}
              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                <Button
                  size="sm"
                  variant="secondary"
                  asChild
                  className="h-8.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/15 backdrop-blur-md"
                >
                  <Link to="/procurement/new-rfq">
                    <Plus className="size-3.5 mr-1.5 text-sky-400" /> Create RFQ
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  asChild
                  className="h-8.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/15 backdrop-blur-md"
                >
                  <Link to="/purchase-order">
                    <Plus className="size-3.5 mr-1.5 text-emerald-400" /> New Purchase Order
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  asChild
                  className="h-8.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/15 backdrop-blur-md"
                >
                  <Link to="/procurement/asns">
                    <Truck className="size-3.5 mr-1.5 text-amber-400" /> Track Inbound ASNs
                  </Link>
                </Button>
              </div>
            </div>

            {/* Warehouse / Procurement Graphic illustration */}
            <div className="hidden shrink-0 items-center gap-3 sm:flex lg:pr-4">
              <div className="flex flex-col items-end text-right">
                <span className="text-xs font-medium text-slate-400">Pune DC · Central Hub</span>
                <span className="text-sm font-bold text-white">Plant 1200 Procurement</span>
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-400">
                  <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Real-time Gateway Sync Active</span>
                </div>
              </div>
              <div className="grid size-16 place-items-center rounded-2xl border border-white/15 bg-white/10 shadow-inner backdrop-blur-md">
                <img
                  src="/kaizenx-cube.png"
                  alt="KaizenX Enterprise"
                  className="size-10 object-contain drop-shadow-md"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* 2. Primary KPI Dashboard Cards - 12 Cards Grid (Section 6)          */}
        {/* ==================================================================== */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-[#0F172A] tracking-tight">
              Procurement Modules &amp; Performance KPIs
            </h3>
            <span className="text-xs text-[#64748B]">Updated real-time from backend</span>
          </div>

          {/* Row 1: Core Procurement Modules (6 cards) */}
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
            {procurementModules.map((m) => (
              <KPIStatCard
                key={m.label}
                to={m.to}
                label={m.label}
                value={moduleCounts[m.countKey]}
                icon={m.icon}
                tone={m.tone}
                tooltip={m.tooltip}
                loading={loading}
              />
            ))}
          </div>

          {/* Row 2: Operational Health & Financial KPIs (6 cards) */}
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
            {procurementKpis.map((kpi) => {
              const raw = Number(stats[kpi.valueKey] || 0);
              const val = kpi.currency ? formatInrCompact(raw) : raw;
              return (
                <KPIStatCard
                  key={kpi.label}
                  to={kpi.to}
                  label={kpi.label}
                  value={val}
                  icon={kpi.icon}
                  tone={kpi.tone}
                  tooltip={kpi.tooltip}
                  loading={loading}
                />
              );
            })}
          </div>
        </div>

        {/* ==================================================================== */}
        {/* 3. Action Alerts Strip (Section 8)                                  */}
        {/* ==================================================================== */}
        <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-[#E2E8F0] bg-white p-3 shadow-xs">
          <div className="flex items-center gap-2 pl-1 pr-2 text-xs font-bold uppercase tracking-wider text-[#0F172A]">
            <AlertTriangle className="size-4 text-[#D97706]" />
            <span>Action Required:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {actionAlerts.map((alert) => {
              if (alert.value <= 0 && !loading) return null;
              const toneClasses = {
                danger: "bg-red-50 text-[#EF4444] border-red-200 hover:bg-red-100",
                warning: "bg-amber-50 text-[#D97706] border-amber-200 hover:bg-amber-100",
                success: "bg-emerald-50 text-[#16A34A] border-emerald-200 hover:bg-emerald-100",
              }[alert.tone as "danger" | "warning" | "success"];

              return (
                <Link
                  key={alert.label}
                  to={alert.to as any}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1 text-xs font-semibold transition-colors",
                    toneClasses,
                  )}
                >
                  <span className="font-bold">{alert.value}</span>
                  <span>{alert.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* ==================================================================== */}
        {/* 4. Analytics Section (Section 7)                                     */}
        {/* ==================================================================== */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* PO Issuance Trend (2 Cols) */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs lg:col-span-2 flex flex-col justify-between">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="size-4.5 text-[#2563EB]" />
                    <h3 className="text-[15px] font-semibold text-[#0F172A] tracking-tight">
                      PO Issuance Trend
                    </h3>
                  </div>
                  <p className="mt-0.5 text-xs text-[#64748B]">
                    Monthly volume of purchase orders released
                  </p>
                </div>

                {/* Month/Year Filters */}
                <div className="inline-flex rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-1 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setTrendFilter("3m")}
                    className={cn(
                      "rounded-lg px-2.5 py-1 transition-all",
                      trendFilter === "3m"
                        ? "bg-white font-semibold text-[#0F172A] shadow-xs"
                        : "text-[#64748B] hover:text-[#0F172A]",
                    )}
                  >
                    3 Months
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrendFilter("6m")}
                    className={cn(
                      "rounded-lg px-2.5 py-1 transition-all",
                      trendFilter === "6m"
                        ? "bg-white font-semibold text-[#0F172A] shadow-xs"
                        : "text-[#64748B] hover:text-[#0F172A]",
                    )}
                  >
                    6 Months
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrendFilter("all")}
                    className={cn(
                      "rounded-lg px-2.5 py-1 transition-all",
                      trendFilter === "all"
                        ? "bg-white font-semibold text-[#0F172A] shadow-xs"
                        : "text-[#64748B] hover:text-[#0F172A]",
                    )}
                  >
                    All Months
                  </button>
                </div>
              </div>

              {/* Chart Body */}
              <div className="mt-4 h-[280px] w-full">
                {loading ? (
                  <div className="flex h-full items-center justify-center gap-2 text-xs text-[#64748B]">
                    <Loader2 className="size-5 animate-spin text-[#2563EB]" />
                    <span>Loading procurement metrics...</span>
                  </div>
                ) : filteredTrend.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center text-xs text-[#64748B]">
                    <BarChart3 className="mb-2 size-8 text-[#CBD5E1]" />
                    <p className="font-medium text-[#0F172A]">No trend data available</p>
                    <p className="text-[11px] text-[#94A3B8]">
                      Orders created this period will automatically appear here.
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={filteredTrend} margin={{ top: 12, right: 12, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        fontSize={11}
                        stroke="#64748B"
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        fontSize={11}
                        stroke="#64748B"
                        allowDecimals={false}
                      />
                      <RTooltip
                        cursor={{ fill: "#F8FAFC" }}
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid #E2E8F0",
                          backgroundColor: "#FFFFFF",
                          fontSize: 12,
                          boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                        }}
                      />
                      <Bar
                        dataKey="pos"
                        name="Purchase Orders"
                        fill="#2563EB"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={48}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between border-t border-[#E2E8F0] pt-3 text-xs text-[#64748B]">
              <span>Gross PO Commitments:</span>
              <span className="font-bold text-[#0F172A]">
                {formatInrFull(Number(stats.totalPoValue || 0))}
              </span>
            </div>
          </div>

          {/* Purchase Order Status Donut Chart (1 Col) */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <PieIcon className="size-4.5 text-[#2563EB]" />
                    <h3 className="text-[15px] font-semibold text-[#0F172A] tracking-tight">
                      Purchase Order Status
                    </h3>
                  </div>
                  <p className="mt-0.5 text-xs text-[#64748B]">Breakdown of release statuses</p>
                </div>
                <Badge variant="outline" className="border-[#E2E8F0] bg-[#F8FAFC] text-[11px] font-semibold text-[#0F172A]">
                  {pos.length} Total
                </Badge>
              </div>

              {/* Donut Chart */}
              <div className="relative mt-4 h-[180px] w-full">
                {loading ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="size-5 animate-spin text-[#2563EB]" />
                  </div>
                ) : statusDistribution.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center text-xs text-[#64748B]">
                    <p className="font-medium">No purchase orders found</p>
                  </div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusDistribution}
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {statusDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RTooltip
                          contentStyle={{
                            borderRadius: 10,
                            border: "1px solid #E2E8F0",
                            backgroundColor: "#FFFFFF",
                            fontSize: 12,
                            boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xl font-bold text-[#0F172A] leading-none">
                        {pos.length}
                      </span>
                      <span className="text-[10px] uppercase font-medium text-[#64748B] mt-0.5">
                        POs
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Status Legend */}
              <div className="mt-3 space-y-1.5 border-t border-[#E2E8F0] pt-3">
                {statusDistribution.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-[#64748B] font-medium">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#0F172A]">{item.value}</span>
                      <span className="text-[10px] text-[#94A3B8]">
                        ({pos.length > 0 ? Math.round((item.value / pos.length) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              asChild
              className="mt-4 w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-[#0F172A] hover:bg-slate-100"
            >
              <Link to="/procurement/purchase-orders">
                View All Purchase Orders <ChevronRight className="size-3.5 ml-1" />
              </Link>
            </Button>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* 5. Live Search & Procurement Operational Control (Section 8)        */}
        {/* ==================================================================== */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Search className="size-4.5 text-[#2563EB]" />
                <h3 className="text-[15px] font-semibold text-[#0F172A] tracking-tight">
                  Instant Procurement Search
                </h3>
              </div>
              <p className="mt-0.5 text-xs text-[#64748B]">
                Lookup vendor files, open purchase orders, or master data in real-time
              </p>
            </div>
            <span className="text-[11px] text-[#94A3B8]">
              Matches update instantly with direct navigation
            </span>
          </div>

          <div className="mt-4 grid gap-5 md:grid-cols-2">
            {/* Search Vendors */}
            <div className="relative">
              <label className="text-[12px] font-semibold uppercase tracking-wider text-[#64748B]">
                Search Supplier Master
              </label>
              <div className="relative mt-1.5">
                <Search className="pointer-events-none absolute left-3 top-3 size-4 text-[#94A3B8]" />
                <Input
                  placeholder="Enter vendor name, code, or GSTIN..."
                  className="h-10 rounded-xl border-[#E2E8F0] bg-[#F8FAFC] pl-9 pr-9 text-xs transition-colors focus:bg-white focus:border-[#2563EB]"
                  value={supplierQuery}
                  onChange={(e) => setSupplierQuery(e.target.value)}
                />
                {isSearchingSuppliers && (
                  <Loader2 className="absolute right-3 top-3 size-4 animate-spin text-[#2563EB]" />
                )}
              </div>

              {supplierResults.length > 0 && (
                <div className="absolute z-20 mt-1.5 w-full rounded-2xl border border-[#E2E8F0] bg-white p-1.5 shadow-xl animate-in fade-in slide-in-from-top-1">
                  {supplierResults.slice(0, 5).map((s) => {
                    const sid = s.supplier_id || s.supplierId || s.id;
                    const sname = s.supplier_name || s.supplierName || "Unknown Vendor";
                    const scode = s.supplier_code || s.supplierCode || String(sid).substring(0, 8);
                    return (
                      <Link
                        key={sid}
                        to="/supplier/$supplierId"
                        params={{ supplierId: sid }}
                        className="flex items-center justify-between rounded-xl px-3 py-2 text-xs transition-colors hover:bg-slate-50"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Building2 className="size-4 text-[#2563EB] shrink-0" />
                          <div className="truncate">
                            <p className="font-semibold text-[#0F172A] truncate">{sname}</p>
                            <p className="text-[10px] text-[#64748B]">{scode}</p>
                          </div>
                        </div>
                        <StatusBadge status={s.status || "Active"} className="h-4.5 px-2 text-[10px]" />
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Search Purchase Orders */}
            <div className="relative">
              <label className="text-[12px] font-semibold uppercase tracking-wider text-[#64748B]">
                Search Purchase Orders
              </label>
              <div className="relative mt-1.5">
                <Search className="pointer-events-none absolute left-3 top-3 size-4 text-[#94A3B8]" />
                <Input
                  ref={poSearchInputRef}
                  placeholder="Enter PO number, vendor name, or order code..."
                  className="h-10 rounded-xl border-[#E2E8F0] bg-[#F8FAFC] pl-9 pr-9 text-xs transition-colors focus:bg-white focus:border-[#2563EB]"
                  value={poQuery}
                  onChange={(e) => setPoQuery(e.target.value)}
                />
                {isSearchingPOs && (
                  <Loader2 className="absolute right-3 top-3 size-4 animate-spin text-[#2563EB]" />
                )}
              </div>

              {poResults.length > 0 && (
                <div className="absolute z-20 mt-1.5 w-full rounded-2xl border border-[#E2E8F0] bg-white p-1.5 shadow-xl animate-in fade-in slide-in-from-top-1">
                  {poResults.slice(0, 5).map((po) => (
                    <Link
                      key={po.id}
                      to="/purchase-order"
                      search={{ poId: po.id }}
                      className="flex items-center justify-between rounded-xl px-3 py-2 text-xs transition-colors hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="size-4 text-[#0D9488] shrink-0" />
                        <div className="truncate">
                          <p className="font-semibold text-[#0F172A] truncate">
                            {po.po_number || po.poNumber}
                          </p>
                          <p className="text-[10px] text-[#64748B] truncate">
                            {po.supplier_name || po.supplierName || "Supplier"}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={po.status} className="h-4.5 px-2 text-[10px]" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* 6. Recent Orders & Supplier Tables (Section 8)                      */}
        {/* ==================================================================== */}
        <div className="grid gap-6 xl:grid-cols-3">
          {/* Recent Purchase Orders Table (2 Cols) */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs xl:col-span-2">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <FileText className="size-4.5 text-[#2563EB]" />
                  <h3 className="text-[15px] font-semibold text-[#0F172A] tracking-tight">
                    Recent Purchase Orders
                  </h3>
                </div>
                <p className="mt-0.5 text-xs text-[#64748B]">
                  Latest released commitments and their fulfillment status
                </p>
              </div>
              <Button variant="ghost" size="sm" asChild className="text-xs font-semibold text-[#2563EB]">
                <Link to="/procurement/purchase-orders">
                  View all <ArrowUpRight className="size-3.5 ml-1" />
                </Link>
              </Button>
            </div>

            <div className="mt-3 overflow-x-auto">
              {loading ? (
                <div className="flex h-44 items-center justify-center gap-2 text-xs text-[#64748B]">
                  <Loader2 className="size-4 animate-spin text-[#2563EB]" />
                  <span>Loading orders...</span>
                </div>
              ) : pos.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#64748B]">
                  No purchase orders recorded yet.
                </div>
              ) : (
                <table className="w-full min-w-[560px] text-xs">
                  <thead>
                    <tr className="border-b border-[#E2E8F0] text-left text-[11px] uppercase tracking-wider text-[#64748B]">
                      <th className="pb-3 font-semibold">PO Number</th>
                      <th className="pb-3 font-semibold">Vendor</th>
                      <th className="pb-3 font-semibold">Date</th>
                      <th className="pb-3 font-semibold text-right">Amount</th>
                      <th className="pb-3 font-semibold text-center">Status</th>
                      <th className="pb-3 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1F5F9]">
                    {pos.slice(0, 5).map((p) => {
                      const poNum = p.po_number || p.poNumber || `PO-${p.id}`;
                      const vendor = p.supplier_name || p.supplierName || "—";
                      const dateStr = p.created_at
                        ? new Date(p.created_at).toLocaleDateString("en-IN", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "—";
                      const amount = Number(p.total_amount || p.totalAmount || 0);

                      return (
                        <tr key={p.id} className="transition-colors hover:bg-slate-50/80">
                          <td className="py-3 font-bold text-[#2563EB]">
                            <Link to="/purchase-order" search={{ poId: p.id }} className="hover:underline">
                              {poNum}
                            </Link>
                          </td>
                          <td className="py-3 font-medium text-[#0F172A] truncate max-w-[180px]">
                            {vendor}
                          </td>
                          <td className="py-3 text-[#64748B]">{dateStr}</td>
                          <td className="py-3 font-bold text-[#0F172A] text-right tabular-nums">
                            {formatInrFull(amount)}
                          </td>
                          <td className="py-3 text-center">
                            <StatusBadge status={p.status} className="text-[10px]" />
                          </td>
                          <td className="py-3 text-right">
                            <Button variant="ghost" size="sm" asChild className="h-7 px-2 text-[11px]">
                              <Link to="/purchase-order" search={{ poId: p.id }}>
                                Open
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Supplier Master Overview (1 Col) */}
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Users className="size-4.5 text-[#2563EB]" />
                  <h3 className="text-[15px] font-semibold text-[#0F172A] tracking-tight">
                    Supplier Overview
                  </h3>
                </div>
                <p className="mt-0.5 text-xs text-[#64748B]">Active &amp; recently registered</p>
              </div>
              <Button variant="ghost" size="sm" asChild className="text-xs font-semibold text-[#2563EB]">
                <Link to="/master-data">
                  Directory <ArrowUpRight className="size-3.5 ml-1" />
                </Link>
              </Button>
            </div>

            <div className="mt-3 divide-y divide-[#F1F5F9]">
              {loading ? (
                <div className="flex h-44 items-center justify-center">
                  <Loader2 className="size-4 animate-spin text-[#2563EB]" />
                </div>
              ) : suppliers.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#64748B]">
                  No suppliers registered yet.
                </div>
              ) : (
                suppliers.slice(0, 5).map((s) => {
                  const sid = s.supplier_id || s.supplierId || s.id;
                  const sname = s.supplier_name || s.supplierName || "Unknown Vendor";
                  const scode = s.supplier_code || s.supplierCode || String(sid).substring(0, 8);
                  const cat = Array.isArray(s.category)
                    ? s.category.join(", ")
                    : s.category || "General";

                  return (
                    <div key={sid} className="flex items-center justify-between py-2.5">
                      <div className="min-w-0 pr-2">
                        <Link
                          to="/supplier/$supplierId"
                          params={{ supplierId: sid }}
                          className="font-semibold text-xs text-[#0F172A] hover:text-[#2563EB] hover:underline truncate block"
                        >
                          {sname}
                        </Link>
                        <p className="text-[11px] text-[#64748B] truncate">
                          {cat} · <span className="font-mono text-[10px]">{scode}</span>
                        </p>
                      </div>
                      <StatusBadge status={s.status || "Active"} className="h-4.5 px-2 text-[10px] shrink-0" />
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-4 border-t border-[#E2E8F0] pt-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#64748B]">Compliance Rate:</span>
                <span className="font-bold text-[#16A34A]">{stats.complianceRate || 100}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* ==================================================================== */}
        {/* 7. End-to-End Receiving & Procurement Lifecycle (Section 8)          */}
        {/* ==================================================================== */}
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="size-4.5 text-[#2563EB]" />
                <h3 className="text-[15px] font-semibold text-[#0F172A] tracking-tight">
                  13-Stage End-to-End Procurement &amp; Receiving Pipeline
                </h3>
              </div>
              <p className="mt-0.5 text-xs text-[#64748B]">
                Complete audit traceability from vendor onboarding to warehouse inventory availability
              </p>
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-[#16A34A] border border-emerald-200">
              ISO 9001 &amp; SOX Compliant
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7 lg:grid-cols-13">
            {procurementFlowStages.map((stage) => {
              const Icon = stage.icon;
              return (
                <Link
                  key={stage.step}
                  to={stage.to as any}
                  className="group flex flex-col items-center justify-between rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-2 text-center transition-all duration-200 hover:-translate-y-0.5 hover:border-[#2563EB] hover:bg-white hover:shadow-xs"
                >
                  <span className="text-[10px] font-mono font-bold text-[#94A3B8] group-hover:text-[#2563EB]">
                    {stage.step}
                  </span>
                  <div className="my-1.5 grid size-8 place-items-center rounded-lg bg-white border border-[#E2E8F0] text-[#0F172A] shadow-2xs group-hover:bg-[#2563EB] group-hover:text-white transition-colors">
                    <Icon className="size-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[#0F172A] leading-tight">
                      {stage.label}
                    </p>
                    <p className="text-[9px] text-[#64748B] leading-tight mt-0.5">
                      {stage.desc}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
