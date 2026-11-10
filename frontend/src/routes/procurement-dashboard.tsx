import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  Building2,
  ClipboardList,
  ShoppingCart,
  FileText,
  FileQuestion,
  FileBadge,
  Users,
  CheckCircle2,
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
import { SectionCard, StatCard, Timeline } from "@/components/wms/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api-client";
import { requireRole } from "@/lib/auth-utils";

export const Route = createFileRoute("/procurement-dashboard")({
  beforeLoad: () => requireRole("PROCUREMENT"),
  head: () => ({
    meta: [
      { title: "Procurement Dashboard · KaizenX" },
      {
        name: "description",
        content: "Manage suppliers, purchase orders, and procurement workflows.",
      },
    ],
  }),
  component: ProcurementDashboard,
});

const procurementModules = [
  {
    label: "Suppliers",
    to: "/master-data",
    icon: Building2,
    countKey: "suppliers",
    tone: "success",
    infoTooltip: "Total number of suppliers registered in the system.",
  },
  {
    label: "Material Requests",
    to: "/procurement/material-requests",
    icon: ClipboardList,
    countKey: "requests",
    tone: "teal",
    infoTooltip: "Total material requests created by warehouse or authorized users.",
  },
  {
    label: "RFQs",
    to: "/procurement/rfqs",
    icon: FileQuestion,
    countKey: "rfqs",
    tone: "warning",
    infoTooltip: "Total Requests for Quotation created for supplier pricing.",
  },
  {
    label: "Quotes",
    to: "/procurement/quotations",
    icon: FileBadge,
    countKey: "quotes",
    tone: "primary",
    infoTooltip: "Total supplier quotations received against RFQs.",
  },
  {
    label: "POs",
    to: "/procurement/purchase-orders",
    icon: FileText,
    countKey: "pos",
    tone: "teal",
    infoTooltip: "Total purchase orders created from approved quotations.",
  },
  {
    label: "ASNs",
    to: "/procurement/asns",
    icon: Truck,
    countKey: "asns",
    tone: "success",
    infoTooltip: "Total Advance Shipping Notices received from suppliers.",
  },
] as const;

const procurementKpis: readonly {
  readonly label: string;
  readonly to: string;
  readonly icon: any;
  readonly valueKey: string;
  readonly tone: "warning" | "primary" | "danger" | "teal" | "success";
  readonly currency?: boolean;
}[] = [
  {
    label: "Pending Approvals",
    to: "/finance/approvals",
    icon: Clock3,
    valueKey: "pendingApprovals",
    tone: "warning",
  },
  {
    label: "Pending Quotations",
    to: "/procurement/rfqs",
    icon: FileBadge,
    valueKey: "pendingQuotations",
    tone: "primary",
  },
  {
    label: "POs Awaiting Supplier Confirmation",
    to: "/procurement/purchase-orders",
    icon: CheckCircle2,
    valueKey: "awaitingSupplierConfirmation",
    tone: "warning",
  },
  {
    label: "Overdue POs",
    to: "/procurement/purchase-orders",
    icon: AlertTriangle,
    valueKey: "overduePos",
    tone: "danger",
  },
  {
    label: "Partially Received POs",
    to: "/procurement/purchase-orders",
    icon: PackageCheck,
    valueKey: "partiallyReceivedPos",
    tone: "teal",
  },
  {
    label: "PO Value",
    to: "/procurement/purchase-orders",
    icon: IndianRupee,
    valueKey: "totalPoValue",
    tone: "success",
    currency: true,
  },
];

function formatInrCompact(value: number): string {
  if (!Number.isFinite(value)) return "₹0";
  if (Math.abs(value) >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`;
  if (Math.abs(value) >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  return `₹${value.toLocaleString("en-IN")}`;
}

const receivingFlow = [
  { label: "Supplier", to: "/master-data", icon: Building2, detail: "Vendor master" },
  { label: "Material Requests", to: "/procurement/material-requests", icon: ClipboardList, detail: "Warehouse demand approved" },
  { label: "RFQ", to: "/procurement/rfqs", icon: FileQuestion, detail: "Supplier invited" },
  { label: "Quotation Comparison", to: "/procurement/quotations", icon: FileBadge, detail: "Selection reason" },
  { label: "PO Approval", to: "/finance/approvals", icon: CheckCircle2, detail: "Controlled release" },
  { label: "Supplier Confirmation", to: "/procurement/purchase-orders", icon: Clock3, detail: "Acknowledgement" },
  { label: "ASN", to: "/procurement/asns", icon: Truck, detail: "Shipment notice" },
  { label: "Gate Entry", to: "/gate-entry", icon: DoorOpen, detail: "Vehicle verified" },
  { label: "Dock", to: "/dock-management", icon: Warehouse, detail: "Bay allocated" },
  { label: "GRN", to: "/grn", icon: FileText, detail: "Goods received" },
  { label: "Quality Inspection", to: "/procurement/quality-issues", icon: ShieldCheck, detail: "Pass or claim" },
  { label: "Put Away", to: "/my-store", icon: PackageCheck, detail: "Bin placement" },
  { label: "Inventory", to: "/inventory", icon: Boxes, detail: "Stock available" },
] as const;

const threeWayMatchPlan = [
  { label: "Purchase Order", detail: "Ordered quantity, rate, tax, supplier terms" },
  { label: "Goods Receipt", detail: "Accepted GRN quantity after receiving and quality" },
  { label: "Supplier Invoice", detail: "Invoice/challan number, billed quantity and amount" },
  { label: "3-Way Match", detail: "Auto-pass exact matches; route quantity, price, or tax exceptions to Finance" },
] as const;

const categoryBreakdown = [
  { name: "Raw Material", value: 42, color: "#2563eb" },
  { name: "Packaging", value: 20, color: "#38bdf8" },
  { name: "Consumables", value: 16, color: "#7dd3fc" },
  { name: "MRO", value: 12, color: "#8b5cf6" },
  { name: "Others", value: 10, color: "#c4b5fd" },
];

function ProcurementDashboard() {
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [pos, setPos] = useState<any[]>([]);
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

  const loadData = async () => {
    try {
      setLoading(true);
      const [sData, nData, poData, statsData, requestData, rfqData, quoteData, asnData] = await Promise.all([
        api.getSuppliers(),
        api.getNotifications("PROCUREMENT"),
        api.getPurchaseOrders(),
        api.getProcurementStats(),
        api.getMaterialRequests().catch(() => []),
        api.getRfqs().catch(() => []),
        api.getQuotations().catch(() => []),
        api.getAsns().catch(() => []),
      ]);
      setSuppliers(sData);
      setNotifications(nData);
      setPos(poData);
      setStats(statsData);
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
        const results = await api.getSuppliers({ search: supplierQuery });
        setSupplierResults(results);
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
        setPoResults(results);
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

  const activityItems = notifications.map((n) => ({
    time: new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    title: n.title,
    detail: n.message,
    tone: n.title.includes("Approved")
      ? "success"
      : n.title.includes("Rejected")
        ? "danger"
        : "primary",
  }));

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
      label: "supplier quotations pending",
      value: Number(stats.pendingQuotations || 0),
      tone: "warning",
      to: "/procurement/rfqs",
    },
    {
      label: "POs overdue",
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

  const alertToneClass = {
    danger: "border-red-200 bg-red-50 text-red-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  } as const;

  return (
    <AppShell
      title=""
      mainClassName="bg-[#1e4d7a]/35"
    >
      <section className="relative z-10 isolate mb-4 min-h-[250px] overflow-hidden rounded-2xl border border-[#123b76] bg-[#031633] shadow-sm">
        <img
          src="/procurement-sticker.png"
          alt="Purchase order procurement illustration"
          className="pointer-events-none absolute right-48 top-1/2 z-[2] hidden h-[230px] w-[350px] -translate-y-1/2 object-contain brightness-[0.7] opacity-80 lg:block"
          style={{
            maskImage: "radial-gradient(ellipse at center, black 30%, transparent 68%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 68%)",
          }}
        />
        <div className="absolute inset-0 z-[1] bg-[radial-gradient(circle_at_70%_45%,#124a88_0%,#072858_42%,#031633_78%)]" />
        <div className="pointer-events-none absolute -left-24 top-[-235px] z-[3] hidden h-[520px] w-[900px] rotate-[-16deg] rounded-[50%] border-t-2 border-cyan-200/90 shadow-[0_0_8px_2px_rgba(103,232,249,0.95),0_0_24px_6px_rgba(34,211,238,0.7),0_0_52px_12px_rgba(14,165,233,0.35)] animate-pulse lg:block" />
        <div className="relative z-10 flex min-h-[250px] items-center px-6 py-8 sm:px-10">
          <div className="max-w-3xl text-white">
            <div className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.12em] text-cyan-300">
              <span className="h-10 w-1 rounded-full bg-cyan-300 shadow-[0_0_8px_2px_rgba(34,211,238,0.9),0_0_22px_6px_rgba(34,211,238,0.45)] animate-pulse" />
              Procurement Workspace
            </div>
            <div className="flex items-center gap-4">
              <span className="hidden size-16 shrink-0 place-items-center rounded-2xl bg-blue-600/80 shadow-lg sm:grid"><ShoppingCart className="size-9" /></span>
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">Procurement Management</h2>
                <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-200 sm:text-base">Streamline supplier management, material requests, quotations, purchase orders, and approvals—all in one centralized workspace.</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-slate-100">
              <span className="flex items-center gap-2"><CheckCircle2 className="size-4 text-cyan-300" /> Smarter Purchasing</span>
              <span className="flex items-center gap-2"><Users className="size-4 text-cyan-300" /> Better Supplier Control</span>
              <span className="flex items-center gap-2"><BarChart3 className="size-4 text-cyan-300" /> Real-Time Visibility</span>
            </div>
          </div>
          <Button className="absolute right-6 top-1/2 w-fit -translate-y-1/2 rounded-xl bg-blue-600 text-white shadow-lg hover:bg-blue-700 sm:right-10" asChild>
            <Link to="/new-supplier"><span className="mr-1 text-lg leading-none">+</span> New Supplier</Link>
          </Button>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {procurementModules.map((module) => (
          <StatCard key={module.label} to={module.to as any} value={loading ? "..." : String(moduleCounts[module.countKey])} label={module.label} icon={module.icon} tone={module.tone} infoTooltip={module.infoTooltip} compact />
        ))}
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {procurementKpis.map((kpi) => {
          const rawValue = Number(stats[kpi.valueKey] || 0);
          return (
          <StatCard key={kpi.label} to={kpi.to as any} value={loading ? "..." : kpi.currency ? formatInrCompact(rawValue) : String(rawValue)} label={kpi.label} icon={kpi.icon} tone={kpi.tone} compact />
          );
        })}
      </div>

      <div className="hidden">
        <StatCard
          label="Active suppliers"
          value={loading ? "..." : String(stats.activeSuppliers)}
          delta={`${stats.activeSuppliersThisMonth >= 0 ? "+" : ""}${stats.activeSuppliersThisMonth} this month`}
          icon={Building2}
          tone="primary"
          to="/master-data"
        />
        <StatCard
          label="Total suppliers"
          value={loading ? "..." : String(stats.totalSuppliers)}
          delta="Available for procurement"
          icon={Users}
          tone="success"
          to="/master-data"
        />
        <StatCard
          label="Open POs"
          value={loading ? "..." : String(stats.openPos)}
          delta={`Value: ₹${Number(stats.totalPoValue || 0).toLocaleString()}`}
          icon={FileText}
          tone="teal"
          to="/procurement/purchase-orders"
        />
        <StatCard
          label="Compliance rate"
          value={loading ? "..." : `${stats.complianceRate}%`}
          delta="Target: 99%"
          icon={ShieldCheck}
          tone="success"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-4">
        <SectionCard
          title="PO Issuance Trend"
          description="Purchase orders created per month"
          icon={BarChart3}
          infoTooltip="Monthly count of purchase orders created."
          className="xl:col-span-2"
        >
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.trend} margin={{ left: -20, right: 10, top: 10 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--color-border)"
                />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  stroke="var(--color-muted-foreground)"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  stroke="var(--color-muted-foreground)"
                />
                <RTooltip
                  cursor={{ fill: "var(--color-muted)", opacity: 0.4 }}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--color-border)",
                    background: "var(--color-card)",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="pos" fill="var(--color-primary)" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="PO Value by Category" description="Current purchase order distribution" icon={FileBadge}>
          <div className="flex items-center gap-4">
            <div className="relative h-[180px] w-[180px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryBreakdown} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={2} stroke="none">
                    {categoryBreakdown.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-slate-900">{formatInrCompact(Number(stats.totalPoValue || 0))}</span>
                <span className="text-[10px] text-muted-foreground">Total PO Value</span>
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              {categoryBreakdown.map((entry) => (
                <div key={entry.name} className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-2 truncate"><span className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />{entry.name}</span>
                  <span className="font-semibold text-slate-700">{entry.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Action Required" description="Items needing attention" icon={AlertTriangle}>
          <div className="divide-y divide-border/60">
            {[
              { label: "Pending Approvals", value: stats.pendingApprovals, tone: "bg-amber-100 text-amber-700", to: "/finance/approvals", icon: Clock3 },
              { label: "Overdue POs", value: stats.overduePos, tone: "bg-red-100 text-red-700", to: "/procurement/purchase-orders", icon: AlertTriangle },
              { label: "Pending Quotations", value: stats.pendingQuotations, tone: "bg-blue-100 text-blue-700", to: "/procurement/rfqs", icon: FileBadge },
              { label: "Supplier Confirmations", value: stats.awaitingSupplierConfirmation, tone: "bg-emerald-100 text-emerald-700", to: "/procurement/purchase-orders", icon: Truck },
            ].map((item) => (
              <Link key={item.label} to={item.to as any} className="flex items-center gap-3 py-3 text-sm hover:text-primary">
                <item.icon className="size-4 text-slate-500" />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${item.tone}`}>{loading ? "..." : item.value}</span>
                <ArrowUpRight className="size-3.5 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </SectionCard>

        <SectionCard className="hidden" title="Quick Search" description="Find vendor or order" icon={Search}>
          <div className="space-y-4">
            <div className="relative space-y-2">
              <label className="text-xs font-medium uppercase text-muted-foreground">
                Search Suppliers
              </label>
              <div className="relative">
                <Input
                  placeholder="Enter vendor name or ID..."
                  className="rounded-xl pr-8"
                  value={supplierQuery}
                  onChange={(e) => setSupplierQuery(e.target.value)}
                />
                {isSearchingSuppliers && (
                  <Loader2 className="absolute right-3 top-2.5 size-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {supplierResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-xl border border-border bg-card p-1 shadow-lg">
                  {supplierResults.slice(0, 5).map((s) => {
                    const sid = s.supplier_id || s.supplierId || s.id;
                    const sname = s.supplier_name || s.supplierName || "Unknown Vendor";
                    const scode =
                      s.supplier_code || s.supplierCode || (sid ? String(sid).substring(0, 8) : "");
                    return (
                      <Link
                        key={sid}
                        to="/supplier/$supplierId"
                        params={{ supplierId: sid }}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent"
                      >
                        <Building2 className="size-4 text-primary" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{sname}</p>
                          <p className="text-[10px] text-muted-foreground">{scode}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="relative space-y-2">
              <label className="text-xs font-medium uppercase text-muted-foreground">
                Search Purchase Orders
              </label>
              <div className="relative">
                <Input
                  ref={poSearchInputRef}
                  placeholder="Enter PO number..."
                  className="rounded-xl pr-8"
                  value={poQuery}
                  onChange={(e) => setPoQuery(e.target.value)}
                />
                {isSearchingPOs && (
                  <Loader2 className="absolute right-3 top-2.5 size-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {poResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-xl border border-border bg-card p-1 shadow-lg">
                  {poResults.slice(0, 5).map((po) => (
                    <Link
                      key={po.id}
                      to="/purchase-order"
                      search={{ poId: po.id }}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent"
                    >
                      <FileText className="size-4 text-teal" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{po.po_number || po.poNumber}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {po.supplier_name || po.supplierName || "Supplier not specified"}
                        </p>
                      </div>
                      <StatusBadge status={po.status} className="h-4 px-1.5 text-[9px]" />
                    </Link>
                  ))}
                </div>
              )}
              {!isSearchingPOs && poQuery.trim() && poResults.length === 0 && (
                <p className="px-1 text-xs text-muted-foreground">
                  {poSearchFailed
                    ? "Could not search purchase orders. Please try again."
                    : "No matching purchase orders found."}
                </p>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground italic text-center">
              Results appear automatically as you type
            </p>
          </div>
        </SectionCard>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <SectionCard className="hidden" title="Supplier Performance" description="On-time delivery and service quality" icon={ShieldCheck}>
          <div className="flex items-center gap-5">
            <div className="relative grid size-32 shrink-0 place-items-center rounded-full" style={{ background: "conic-gradient(#16a34a 0 92%, #e2e8f0 92% 100%)" }}>
              <div className="grid size-24 place-items-center rounded-full bg-card text-center">
                <span className="text-2xl font-bold text-slate-900">92%</span>
                <span className="text-[10px] text-muted-foreground">On-Time Delivery</span>
              </div>
            </div>
            <div className="flex-1 space-y-3 text-sm">
              <div className="flex justify-between"><span>Quality Compliance</span><strong>98%</strong></div>
              <div className="flex justify-between"><span>Order Fulfilment</span><strong>95%</strong></div>
              <div className="flex justify-between"><span>Response Time</span><strong>2.4 Days</strong></div>
            </div>
          </div>
        </SectionCard>

        <SectionCard className="hidden" title="Recent Purchase Orders" description="Latest procurement activity" icon={FileText} actions={<Button variant="ghost" size="sm" asChild><Link to="/procurement/purchase-orders">View All <ArrowUpRight className="size-3.5" /></Link></Button>}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-xs">
              <thead><tr className="border-b border-border text-left text-[10px] uppercase text-muted-foreground"><th className="pb-2">PO Number</th><th className="pb-2">Supplier</th><th className="pb-2">Value</th><th className="pb-2">Status</th></tr></thead>
              <tbody>
                {(pos.length ? pos.slice(0, 4) : [{ po_number: "PO-007842", supplier_name: "ABC Chemicals Ltd.", total_amount: 2500000, status: "Approved" }, { po_number: "PO-007841", supplier_name: "Global Packaging", total_amount: 1250000, status: "Pending" }, { po_number: "PO-007840", supplier_name: "Metro Traders", total_amount: 875000, status: "In Review" }]).map((po: any, index: number) => (
                  <tr key={po.id || po.po_number || index} className="border-b border-border/50 last:border-0"><td className="py-2 font-semibold text-primary">{po.po_number || po.poNumber}</td><td className="py-2">{po.supplier_name || po.supplierName || "Supplier"}</td><td className="py-2">{formatInrCompact(Number(po.total_amount || po.totalAmount || po.amount || 0))}</td><td className="py-2"><StatusBadge status={po.status || "Pending"} /></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        <SectionCard
          title="Recent Supplier Registrations"
          description="New vendors awaiting review or recently approved"
          icon={Users}
          className="xl:col-span-3"
          actions={
            <Button variant="ghost" size="sm" className="rounded-lg" asChild>
              <Link to="/master-data">
                View all <ArrowUpRight className="size-3.5" />
              </Link>
            </Button>
          }
        >
          <div className="-mx-5 overflow-x-auto px-5">
            {loading ? (
              <div className="flex h-40 items-center justify-center gap-2">
                <Loader2 className="size-5 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Loading suppliers...</p>
              </div>
            ) : suppliers.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                No suppliers registered yet.
              </div>
            ) : (
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="pb-3 font-medium">Vendor</th>
                    <th className="pb-3 font-medium">Category</th>
                    <th className="pb-3 font-medium">GSTIN</th>
                    <th className="pb-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.slice(0, 5).map((s) => {
                    const sid = s.supplier_id || s.supplierId || s.id;
                    const sname = s.supplier_name || s.supplierName || "Unknown Vendor";
                    const scode =
                      s.supplier_code || s.supplierCode || (sid ? String(sid).substring(0, 8) : "");
                    const cat = Array.isArray(s.category)
                      ? s.category.join(", ")
                      : s.category || "General";
                    return (
                      <tr key={sid} className="border-b border-border/60 last:border-0">
                        <td className="py-3">
                          <Link
                            to="/supplier/$supplierId"
                            params={{ supplierId: sid }}
                            className="font-semibold text-primary hover:underline"
                          >
                            {sname}
                          </Link>
                          <p className="text-[11px] text-muted-foreground">{scode}</p>
                        </td>
                        <td className="py-3 text-muted-foreground">{cat}</td>
                        <td className="py-3 font-mono text-xs">{s.gstin || "—"}</td>
                        <td className="py-3">
                          <StatusBadge status={s.status || "Approved"} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </SectionCard>

        <SectionCard className="hidden"
          title="Recent Activity"
          description="Updates from finance and team"
          icon={CheckCircle2}
        >
          {activityItems.length > 0 ? (
            <Timeline items={activityItems} />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground italic">
              No recent notifications.
            </div>
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}
