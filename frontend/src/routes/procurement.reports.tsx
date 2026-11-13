import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
  BarChart3,
  Building2,
  ClipboardList,
  FileQuestion,
  FileBadge,
  FileText,
  Truck,
  IndianRupee,
  Download,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Info,
  PieChart as PieChartIcon,
  Loader2,
  ShieldCheck,
  TrendingUp,
  ChevronRight,
  X,
  Calendar,
  Layers,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart as RPieChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell, StatusBadge } from "@/components/wms/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/lib/api-client";
import { requireRole, getUserInfo } from "@/lib/auth-utils";
import { toast } from "sonner";

export const Route = createFileRoute("/procurement/reports")({
  beforeLoad: () => requireRole(["PROCUREMENT", "FINANCE"]),
  head: () => ({
    meta: [
      { title: "Procurement Reports · KaizenX" },
      {
        name: "description",
        content: "Analytics and reporting across purchase spend, supplier performance, RFQs, and ASNs.",
      },
    ],
  }),
  component: ProcurementReports,
});

type ReportTab = "spend" | "supplier-performance" | "rfq-analytics" | "asns-compliance" | "material-requests";

const COLORS = ["#0866FF", "#16C784", "#F5A623", "#7C4DFF", "#00D4FF", "#526580"];

function formatInr(val: number): string {
  if (!Number.isFinite(val)) return "₹0";
  return `₹${val.toLocaleString("en-IN")}`;
}

function formatInrCompact(value: number): string {
  if (!Number.isFinite(value)) return "₹0";
  if (Math.abs(value) >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
  if (Math.abs(value) >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
  return `₹${value.toLocaleString("en-IN")}`;
}

function ProcurementReports() {
  const [activeTab, setActiveTab] = useState<ReportTab>("spend");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const user = getUserInfo();
  const isFinanceOnly = user?.roles?.includes("FINANCE") && !user?.roles?.includes("PROCUREMENT");

  // Dynamic API Data
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [materialRequests, setMaterialRequests] = useState<any[]>([]);
  const [asns, setAsns] = useState<any[]>([]);
  const [procurementStats, setProcurementStats] = useState<any>({});

  // Filters
  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  const loadAllData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const [sData, poData, rfqData, qData, mrData, asnData, statsData] = await Promise.all([
        api.getSuppliers().catch(() => []),
        api.getPurchaseOrders().catch(() => []),
        api.getRfqs().catch(() => []),
        api.getQuotations().catch(() => []),
        api.getMaterialRequests().catch(() => []),
        api.getAsns().catch(() => []),
        api.getProcurementStats().catch(() => ({})),
      ]);

      setSuppliers(Array.isArray(sData) ? sData : []);
      setPurchaseOrders(Array.isArray(poData) ? poData : []);
      setRfqs(Array.isArray(rfqData) ? rfqData : []);
      setQuotations(Array.isArray(qData) ? qData : []);
      setMaterialRequests(Array.isArray(mrData) ? mrData : []);
      setAsns(Array.isArray(asnData) ? asnData : []);
      setProcurementStats(statsData || {});

      if (isManual) toast.success("Procurement reports refreshed");
    } catch (err: any) {
      console.error("Failed to load procurement report data", err);
      toast.error("Failed to load procurement report data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Filter Categories derived from fetched suppliers
  const categories = useMemo(() => {
    const set = new Set<string>();
    suppliers.forEach((s) => {
      const cats = Array.isArray(s.category) ? s.category : [s.category];
      cats.forEach((c: any) => c && set.add(String(c)));
    });
    return Array.from(set);
  }, [suppliers]);

  // Aggregate Metrics
  const totalPoValue = useMemo(() => {
    return purchaseOrders.reduce(
      (sum, po) => sum + Number(po.total_amount || po.totalAmount || 0),
      0,
    );
  }, [purchaseOrders]);

  const activeSupplierCount = useMemo(() => {
    return suppliers.filter(
      (s) => (s.status || "Pending Approval").toLowerCase() === "active",
    ).length;
  }, [suppliers]);

  const totalBidsSavings = useMemo(() => {
    let savings = 0;
    const rfqQuotesMap = new Map<string, number[]>();
    quotations.forEach((q) => {
      const rId = q.rfq_id || q.rfqId;
      const amount = Number(q.total_amount || q.totalAmount || 0);
      if (rId && amount > 0) {
        if (!rfqQuotesMap.has(rId)) rfqQuotesMap.set(rId, []);
        rfqQuotesMap.get(rId)!.push(amount);
      }
    });
    rfqQuotesMap.forEach((amounts) => {
      if (amounts.length > 1) {
        const maxAmt = Math.max(...amounts);
        const minAmt = Math.min(...amounts);
        savings += maxAmt - minAmt;
      }
    });
    return savings;
  }, [quotations]);

  // Dynamic Monthly PO Spend & Volume
  const monthlyTrendData = useMemo(() => {
    if (
      procurementStats.trend &&
      Array.isArray(procurementStats.trend) &&
      procurementStats.trend.length > 0
    ) {
      return procurementStats.trend.map((t: any) => ({
        month: t.month,
        pos: Number(t.pos || 0),
        spend: Number(t.spend || 0),
      }));
    }

    const monthMap: Record<string, { pos: number; spend: number }> = {};
    purchaseOrders.forEach((po) => {
      const dateStr = po.po_date || po.created_at || po.date;
      if (dateStr) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          const mLabel = d.toLocaleString("default", { month: "short" });
          if (!monthMap[mLabel]) monthMap[mLabel] = { pos: 0, spend: 0 };
          monthMap[mLabel].pos += 1;
          monthMap[mLabel].spend += Number(po.total_amount || po.totalAmount || 0);
        }
      }
    });

    return Object.entries(monthMap).map(([month, val]) => ({
      month,
      pos: val.pos,
      spend: val.spend,
    }));
  }, [procurementStats, purchaseOrders]);

  // Dynamic Category Distribution
  const categorySpendData = useMemo(() => {
    const catMap: Record<string, number> = {};
    suppliers.forEach((s) => {
      const cat = Array.isArray(s.category) ? s.category[0] : s.category;
      if (cat) {
        catMap[cat] = (catMap[cat] || 0) + 1;
      }
    });
    return Object.entries(catMap).map(([name, value]) => ({ name, value }));
  }, [suppliers]);

  // Dynamic PO Status Distribution
  const poStatusDistribution = useMemo(() => {
    const dist: Record<string, number> = {};
    purchaseOrders.forEach((po) => {
      const st = po.status || "Draft";
      dist[st] = (dist[st] || 0) + 1;
    });
    return Object.entries(dist).map(([name, value]) => ({ name, value }));
  }, [purchaseOrders]);

  // Filtered PO Records
  const filteredPurchaseOrders = useMemo(() => {
    return purchaseOrders.filter((po) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        [po.po_number, po.poNumber, po.supplier_name, po.supplierName]
          .filter(Boolean)
          .some((val) => String(val).toLowerCase().includes(q));
      const statusNorm = String(po.status || "").toUpperCase();
      const filterNorm = selectedStatus.toUpperCase();
      const matchesStatus =
        selectedStatus === "ALL" ||
        statusNorm === filterNorm ||
        (filterNorm === "APPROVED" && statusNorm.includes("APPROV"));
      return matchesSearch && matchesStatus;
    });
  }, [purchaseOrders, search, selectedStatus]);

  // Filtered Suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        [s.supplierName, s.supplier_name, s.category, s.gstin, s.supplierCode]
          .filter(Boolean)
          .some((val) => String(val).toLowerCase().includes(q));
      const suppStatus = (s.status || "Pending Approval").toLowerCase();
      const matchesStatus =
        selectedStatus === "ALL" ||
        suppStatus === selectedStatus.toLowerCase() ||
        (selectedStatus.toLowerCase() === "pending approval" && suppStatus.includes("pending"));
      const matchesCat =
        selectedCategory === "ALL" ||
        (Array.isArray(s.category)
          ? s.category.includes(selectedCategory)
          : s.category === selectedCategory);
      return matchesSearch && matchesStatus && matchesCat;
    });
  }, [suppliers, search, selectedStatus, selectedCategory]);

  // Filtered RFQs
  const filteredRfqs = useMemo(() => {
    return rfqs.filter((r) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        [r.rfqNumber, r.rfq_number, r.title, r.warehouse]
          .filter(Boolean)
          .some((val) => String(val).toLowerCase().includes(q));
      const matchesStatus =
        selectedStatus === "ALL" ||
        String(r.status || "").toUpperCase() === selectedStatus.toUpperCase();
      return matchesSearch && matchesStatus;
    });
  }, [rfqs, search, selectedStatus]);

  // Filtered ASNs
  const filteredAsns = useMemo(() => {
    return asns.filter((a) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        [a.asnNumber, a.asn_number, a.poNumber, a.po_number, a.supplierName, a.supplier_name, a.transporter, a.vehicleNumber]
          .filter(Boolean)
          .some((val) => String(val).toLowerCase().includes(q));
      const matchesStatus =
        selectedStatus === "ALL" ||
        String(a.status || "").toUpperCase() === selectedStatus.toUpperCase();
      return matchesSearch && matchesStatus;
    });
  }, [asns, search, selectedStatus]);

  // Filtered Material Requests
  const filteredMaterialRequests = useMemo(() => {
    return materialRequests.filter((mr) => {
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        [mr.requestNumber, mr.request_number, mr.warehouse, mr.department, mr.requestedBy]
          .filter(Boolean)
          .some((val) => String(val).toLowerCase().includes(q));
      const matchesStatus =
        selectedStatus === "ALL" ||
        String(mr.status || "").toUpperCase() === selectedStatus.toUpperCase();
      return matchesSearch && matchesStatus;
    });
  }, [materialRequests, search, selectedStatus]);

  // Export Report to CSV with Active Filters Applied
  const handleExportCSV = () => {
    const rows: string[][] = [];
    const filename = `kaizenx-procurement-${activeTab}-report.csv`;

    if (activeTab === "spend") {
      rows.push(["PO Number", "Supplier Name", "PO Date", "Status", "Total Amount (INR)"]);
      filteredPurchaseOrders.forEach((po) => {
        rows.push([
          po.po_number || po.poNumber || "—",
          `"${po.supplier_name || po.supplierName || "—"}"`,
          po.po_date || po.created_at || "—",
          po.status || "—",
          String(po.total_amount || po.totalAmount || 0),
        ]);
      });
    } else if (activeTab === "supplier-performance") {
      rows.push(["Supplier Name", "Supplier Code", "Category", "GSTIN", "Status"]);
      filteredSuppliers.forEach((s) => {
        rows.push([
          `"${s.supplierName || s.supplier_name || "—"}"`,
          s.supplierCode || s.supplier_code || "—",
          `"${Array.isArray(s.category) ? s.category.join(", ") : s.category || "—"}"`,
          s.gstin || "—",
          s.status || "Approved",
        ]);
      });
    } else if (activeTab === "rfq-analytics") {
      rows.push(["RFQ Number", "Title", "Warehouse", "Status", "Closing Date"]);
      filteredRfqs.forEach((r) => {
        rows.push([
          r.rfqNumber || r.rfq_number || "—",
          `"${r.title || "—"}"`,
          r.warehouse || "—",
          r.status || "—",
          r.closingDate || r.closing_date || "—",
        ]);
      });
    } else if (activeTab === "asns-compliance") {
      rows.push(["ASN Number", "PO Reference", "Supplier", "Vehicle", "Dispatch Date", "Status"]);
      filteredAsns.forEach((asn) => {
        rows.push([
          asn.asn_number || asn.asnNumber || "—",
          asn.po_number || asn.poNumber || "—",
          `"${asn.supplier_name || asn.supplierName || "—"}"`,
          asn.vehicle_number || asn.vehicleNumber || "—",
          asn.dispatch_date || asn.created_at || "—",
          asn.status || "—",
        ]);
      });
    } else {
      rows.push(["Request Number", "Warehouse", "Department", "Requested By", "Status"]);
      filteredMaterialRequests.forEach((mr) => {
        rows.push([
          mr.requestNumber || mr.request_number || mr.id || "—",
          mr.warehouse || "—",
          mr.department || "—",
          mr.requestedBy || mr.requested_by || "—",
          mr.status || "—",
        ]);
      });
    }

    const csvContent =
      "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported ${activeTab} report to CSV (${rows.length - 1} records)`);
  };

  const tabs = [
    { id: "spend" as ReportTab, label: "PO Spend & Summary", icon: IndianRupee },
    { id: "supplier-performance" as ReportTab, label: "Supplier Performance", icon: Building2 },
    { id: "rfq-analytics" as ReportTab, label: "RFQ Analytics", icon: FileQuestion },
    { id: "asns-compliance" as ReportTab, label: "Inbound ASNs", icon: Truck },
    { id: "material-requests" as ReportTab, label: "Demand & Requests", icon: ClipboardList },
  ].filter((t) => (isFinanceOnly ? t.id === "spend" || t.id === "rfq-analytics" : true));

  return (
    <AppShell mainClassName="bg-[#F5F8FF]">
      <div className="space-y-6 pb-24 max-w-[1536px] mx-auto">
        {/* 1. Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs font-semibold text-[#526580]">
          <Link to="/procurement-dashboard" className="hover:text-[#0866FF] transition-colors">
            Procurement
          </Link>
          <ChevronRight className="size-3 text-[#8FA3BF]" />
          <span className="font-bold text-[#101D3A]">
            {isFinanceOnly ? "Finance Reports" : "Procurement Reports"}
          </span>
        </div>

        {/* 2. Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="size-12 rounded-2xl bg-[#EBF3FF] border border-[#DCE6F3] text-[#0866FF] flex items-center justify-center shadow-xs shrink-0">
              <BarChart3 className="size-6 text-[#0866FF]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-[30px] font-extrabold tracking-tight text-[#101D3A] leading-tight">
                  {isFinanceOnly ? "Finance Reports" : "Procurement Reports"}
                </h1>
                <TooltipProvider>
                  <Tooltip delayDuration={200}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label="Reports Info"
                        className="inline-flex items-center text-[#526580] hover:text-[#0866FF] transition-colors cursor-help"
                      >
                        <Info className="size-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs text-xs bg-[#071D3B] text-white border-0 shadow-xl p-3">
                      <p className="font-bold">Procurement Analytics & Reporting</p>
                      <p className="mt-1 text-slate-300">
                        Detailed reporting across purchase spend, supplier performance, RFQs, quotations, and inbound shipping compliance.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-xs sm:text-sm font-medium text-[#526580] mt-0.5">
                {isFinanceOnly
                  ? "Financial analytics for purchase order spend and RFQ savings"
                  : "Analyze purchase order spend, supplier ratings, quotation bidding, and receiving compliance"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
            <Button
              variant="outline"
              onClick={() => void loadAllData(true)}
              disabled={refreshing || loading}
              className="h-10 rounded-xl border-[#DCE6F3] bg-white text-[#101D3A] hover:bg-[#F5F8FF] hover:border-[#0866FF]/40 font-semibold text-xs sm:text-sm shadow-xs gap-2"
            >
              <RefreshCw className={`size-4 text-[#0866FF] ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              onClick={handleExportCSV}
              className="h-10 rounded-xl bg-[#0866FF] hover:bg-[#0054D6] text-white font-bold text-xs sm:text-sm shadow-xs gap-1.5"
            >
              <Download className="size-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* 3. 4 Strengthened KPI Stat Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {/* Total Purchase Value */}
          <div className="group relative overflow-hidden rounded-2xl border border-[#DCE6F3] bg-white p-5 shadow-xs transition-all hover:border-[#0866FF]/30 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-[13px] font-bold text-[#526580]">Total Purchase Value</span>
              <div className="grid size-10 place-items-center rounded-xl bg-[#EBF3FF] text-[#0866FF]">
                <IndianRupee className="size-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-[32px] font-extrabold tracking-tight text-[#101D3A] tabular-nums">
                {loading ? "..." : formatInrCompact(totalPoValue)}
              </span>
            </div>
            <p className="mt-1 text-[11px] font-semibold text-[#526580]">
              {purchaseOrders.length} purchase orders issued
            </p>
          </div>

          {/* Active Suppliers */}
          <div className="group relative overflow-hidden rounded-2xl border border-[#DCE6F3] bg-white p-5 shadow-xs transition-all hover:border-[#16C784]/30 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-[13px] font-bold text-[#526580]">Active Suppliers</span>
              <div className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-[#16C784]">
                <Building2 className="size-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-[32px] font-extrabold tracking-tight text-[#101D3A] tabular-nums">
                {loading ? "..." : String(activeSupplierCount)}
              </span>
            </div>
            <p className="mt-1 text-[11px] font-semibold text-[#526580]">
              Out of {suppliers.length} registered vendors
            </p>
          </div>

          {/* RFQs Issued */}
          <div className="group relative overflow-hidden rounded-2xl border border-[#DCE6F3] bg-white p-5 shadow-xs transition-all hover:border-[#F5A623]/30 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-[13px] font-bold text-[#526580]">RFQs Issued</span>
              <div className="grid size-10 place-items-center rounded-xl bg-amber-50 text-[#F5A623]">
                <FileQuestion className="size-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-[32px] font-extrabold tracking-tight text-[#101D3A] tabular-nums">
                {loading ? "..." : String(rfqs.length)}
              </span>
            </div>
            <p className="mt-1 text-[11px] font-semibold text-[#526580]">
              {quotations.length} quotations received
            </p>
          </div>

          {/* Est. Bidding Savings */}
          <div className="group relative overflow-hidden rounded-2xl border border-[#DCE6F3] bg-white p-5 shadow-xs transition-all hover:border-[#7C4DFF]/30 hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-[13px] font-bold text-[#526580]">Est. Bidding Savings</span>
              <div className="grid size-10 place-items-center rounded-xl bg-purple-50 text-[#7C4DFF]">
                <TrendingUp className="size-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-[32px] font-extrabold tracking-tight text-[#101D3A] tabular-nums">
                {loading ? "..." : formatInrCompact(totalBidsSavings)}
              </span>
            </div>
            <p className="mt-1 text-[11px] font-semibold text-[#526580]">
              Realized via RFQ multi-bid analysis
            </p>
          </div>
        </div>

        {/* 4. Tab Navigation Strip */}
        <div className="rounded-2xl border border-[#DCE6F3] bg-white p-2 shadow-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {tabs.map((tab) => {
              const IconComp = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                    isActive
                      ? "bg-[#0866FF] text-white shadow-xs"
                      : "bg-transparent text-[#526580] hover:bg-[#F5F8FF] hover:text-[#101D3A]"
                  }`}
                >
                  <IconComp className="size-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. Filters Toolbar */}
        <div className="rounded-2xl border border-[#DCE6F3] bg-white p-4 shadow-xs">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#526580]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search vendor, PO number, or item..."
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

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Category Filter for Supplier Tab */}
              {activeTab === "supplier-performance" && categories.length > 0 && (
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="h-10 w-40 rounded-xl border-[#DCE6F3] bg-[#F5F8FF] text-xs font-semibold text-[#101D3A]">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-[#DCE6F3]">
                    <SelectItem value="ALL">All Categories</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Status Filter */}
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="h-10 w-36 rounded-xl border-[#DCE6F3] bg-[#F5F8FF] text-xs font-semibold text-[#101D3A]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-[#DCE6F3]">
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  {activeTab === "supplier-performance" ? (
                    <>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Pending Approval">Pending Approval</SelectItem>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Blocked">Blocked</SelectItem>
                    </>
                  ) : (
                    <>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Approved">Approved</SelectItem>
                      <SelectItem value="Issued">Issued</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>

              {/* Date Range Selector */}
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="h-10 w-36 rounded-xl border-[#DCE6F3] bg-[#F5F8FF] text-xs font-semibold text-[#101D3A]">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-[#DCE6F3]">
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="this-month">This Month</SelectItem>
                  <SelectItem value="last-quarter">Last Quarter</SelectItem>
                  <SelectItem value="ytd">Year to Date</SelectItem>
                </SelectContent>
              </Select>

              {(search || selectedStatus !== "ALL" || selectedCategory !== "ALL" || dateRange !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setSelectedStatus("ALL");
                    setSelectedCategory("ALL");
                    setDateRange("all");
                  }}
                  className="h-10 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* 6. Main Tab Content Area */}
        <div>
          {loading ? (
            <div className="flex h-72 flex-col items-center justify-center rounded-2xl border border-[#DCE6F3] bg-white p-8">
              <Loader2 className="size-8 animate-spin text-[#0866FF]" />
              <p className="mt-3 text-sm font-semibold text-[#526580]">Loading reports data...</p>
            </div>
          ) : (
            <>
              {/* TAB 1: PO SPEND & SUMMARY */}
              {activeTab === "spend" && (
                <div className="space-y-6">
                  <div className="grid gap-6 xl:grid-cols-3">
                    {/* Monthly Trend Chart */}
                    <div className="rounded-2xl border border-[#DCE6F3] bg-white p-6 shadow-xs xl:col-span-2">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-base font-bold text-[#101D3A]">
                            Monthly PO Issuance & Spend Trend
                          </h3>
                          <p className="text-xs text-[#526580] mt-0.5">
                            Purchase orders count and total spend per month
                          </p>
                        </div>
                        <div className="grid size-9 place-items-center rounded-xl bg-[#EBF3FF] text-[#0866FF]">
                          <BarChart3 className="size-5" />
                        </div>
                      </div>

                      <div className="h-[300px] w-full">
                        {monthlyTrendData.length === 0 ? (
                          <div className="flex h-full flex-col items-center justify-center text-xs text-[#526580]">
                            <BarChart3 className="size-8 text-[#8FA3BF]/40 mb-2" />
                            No monthly purchase order trend data available.
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyTrendData} margin={{ left: -10, right: 10, top: 10 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EBF0F7" />
                              <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} stroke="#526580" />
                              <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="#526580" />
                              <RTooltip
                                cursor={{ fill: "#F5F8FF", opacity: 0.8 }}
                                contentStyle={{
                                  borderRadius: 12,
                                  border: "1px solid #DCE6F3",
                                  background: "#FFFFFF",
                                  fontSize: 12,
                                  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                                }}
                                formatter={(value: any, name: any) => [
                                  name === "spend" ? formatInrCompact(Number(value)) : value,
                                  name === "spend" ? "Spend" : "POs Issued",
                                ]}
                              />
                              <Bar dataKey="pos" name="pos" fill="#0866FF" radius={[6, 6, 0, 0]} barSize={36} />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>

                    {/* PO Status Distribution Chart */}
                    <div className="rounded-2xl border border-[#DCE6F3] bg-white p-6 shadow-xs">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-base font-bold text-[#101D3A]">
                            PO Status Distribution
                          </h3>
                          <p className="text-xs text-[#526580] mt-0.5">
                            Breakdown of purchase orders by status
                          </p>
                        </div>
                        <div className="grid size-9 place-items-center rounded-xl bg-purple-50 text-[#7C4DFF]">
                          <PieChartIcon className="size-5" />
                        </div>
                      </div>

                      <div className="h-[300px] w-full">
                        {poStatusDistribution.length === 0 ? (
                          <div className="flex h-full flex-col items-center justify-center text-xs text-[#526580]">
                            <PieChartIcon className="size-8 text-[#8FA3BF]/40 mb-2" />
                            No purchase order status data recorded.
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <RPieChart>
                              <Pie
                                data={poStatusDistribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={90}
                                paddingAngle={4}
                                dataKey="value"
                              >
                                {poStatusDistribution.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <RTooltip
                                contentStyle={{
                                  borderRadius: 12,
                                  border: "1px solid #DCE6F3",
                                  background: "#FFFFFF",
                                  fontSize: 12,
                                  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                                }}
                              />
                              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 11 }} />
                            </RPieChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Purchase Orders Register Table */}
                  <div className="overflow-hidden rounded-2xl border border-[#DCE6F3] bg-white shadow-xs">
                    <div className="flex items-center justify-between border-b border-[#DCE6F3] bg-[#F5F8FF] px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-[#0866FF]" />
                        <h3 className="text-sm font-bold text-[#101D3A]">
                          Purchase Order Spend Register ({filteredPurchaseOrders.length})
                        </h3>
                      </div>
                      <span className="text-xs font-semibold text-[#526580]">
                        Filtered total:{" "}
                        <strong className="text-[#101D3A]">
                          {formatInr(
                            filteredPurchaseOrders.reduce(
                              (sum, po) => sum + Number(po.total_amount || po.totalAmount || 0),
                              0,
                            ),
                          )}
                        </strong>
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      {filteredPurchaseOrders.length === 0 ? (
                        <div className="py-12 text-center">
                          <FileText className="mx-auto size-10 text-[#8FA3BF]/40" />
                          <p className="mt-2 text-sm font-bold text-[#101D3A]">No purchase orders found</p>
                          <p className="text-xs text-[#526580] mt-0.5">
                            Try adjusting your search criteria or status filter.
                          </p>
                        </div>
                      ) : (
                        <table className="w-full min-w-[700px] text-left text-xs">
                          <thead className="bg-[#F5F8FF] border-b border-[#DCE6F3]">
                            <tr className="text-[10px] font-bold uppercase tracking-wider text-[#526580]">
                              <th className="px-5 py-3">PO Number</th>
                              <th className="px-5 py-3">Supplier Name</th>
                              <th className="px-5 py-3">Date</th>
                              <th className="px-5 py-3">Status</th>
                              <th className="px-5 py-3 text-right">Total Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#DCE6F3]">
                            {filteredPurchaseOrders.slice(0, 20).map((po) => (
                              <tr key={po.id || po.po_number} className="hover:bg-[#F5F8FF]/60 transition-colors">
                                <td className="whitespace-nowrap px-5 py-3.5 font-mono font-bold text-[#0866FF]">
                                  {po.po_number || po.poNumber || "—"}
                                </td>
                                <td className="whitespace-nowrap px-5 py-3.5 font-semibold text-[#101D3A]">
                                  {po.supplier_name || po.supplierName || "—"}
                                </td>
                                <td className="whitespace-nowrap px-5 py-3.5 text-xs text-[#526580]">
                                  {po.po_date || po.created_at || "—"}
                                </td>
                                <td className="whitespace-nowrap px-5 py-3.5">
                                  <StatusBadge status={po.status || "Issued"} />
                                </td>
                                <td className="whitespace-nowrap px-5 py-3.5 text-right font-mono font-bold text-[#101D3A] tabular-nums">
                                  {formatInr(Number(po.total_amount || po.totalAmount || 0))}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: SUPPLIER PERFORMANCE */}
              {activeTab === "supplier-performance" && (
                <div className="space-y-6">
                  <div className="grid gap-6 xl:grid-cols-3">
                    {/* Category Distribution Chart */}
                    <div className="rounded-2xl border border-[#DCE6F3] bg-white p-6 shadow-xs xl:col-span-1">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-base font-bold text-[#101D3A]">
                            Supplier Category Distribution
                          </h3>
                          <p className="text-xs text-[#526580] mt-0.5">
                            Vendors categorized by primary material domain
                          </p>
                        </div>
                        <div className="grid size-9 place-items-center rounded-xl bg-blue-50 text-[#0866FF]">
                          <Building2 className="size-5" />
                        </div>
                      </div>

                      <div className="h-[280px] w-full">
                        {categorySpendData.length === 0 ? (
                          <div className="flex h-full flex-col items-center justify-center text-xs text-[#526580]">
                            <Building2 className="size-8 text-[#8FA3BF]/40 mb-2" />
                            No supplier category data recorded.
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <RPieChart>
                              <Pie
                                data={categorySpendData}
                                cx="50%"
                                cy="50%"
                                outerRadius={85}
                                dataKey="value"
                                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                              >
                                {categorySpendData.map((_, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <RTooltip />
                            </RPieChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>

                    {/* Vendor Performance Register Table */}
                    <div className="overflow-hidden rounded-2xl border border-[#DCE6F3] bg-white shadow-xs xl:col-span-2">
                      <div className="flex items-center justify-between border-b border-[#DCE6F3] bg-[#F5F8FF] px-6 py-4">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="size-4 text-[#0866FF]" />
                          <h3 className="text-sm font-bold text-[#101D3A]">
                            Vendor Performance Register ({filteredSuppliers.length})
                          </h3>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        {filteredSuppliers.length === 0 ? (
                          <div className="py-12 text-center">
                            <Building2 className="mx-auto size-10 text-[#8FA3BF]/40" />
                            <p className="mt-2 text-sm font-bold text-[#101D3A]">No suppliers found</p>
                            <p className="text-xs text-[#526580] mt-0.5">
                              Try clearing filters to see all registered vendors.
                            </p>
                          </div>
                        ) : (
                          <table className="w-full min-w-[550px] text-left text-xs">
                            <thead className="bg-[#F5F8FF] border-b border-[#DCE6F3]">
                              <tr className="text-[10px] font-bold uppercase tracking-wider text-[#526580]">
                                <th className="px-5 py-3">Vendor Name</th>
                                <th className="px-5 py-3">Category</th>
                                <th className="px-5 py-3">Code / GSTIN</th>
                                <th className="px-5 py-3">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#DCE6F3]">
                              {filteredSuppliers.map((s, idx) => (
                                <tr key={s.id || s.supplierId || idx} className="hover:bg-[#F5F8FF]/60 transition-colors">
                                  <td className="whitespace-nowrap px-5 py-3.5 font-bold text-[#101D3A]">
                                    {s.supplierName || s.supplier_name || "—"}
                                  </td>
                                  <td className="whitespace-nowrap px-5 py-3.5 text-xs text-[#526580] font-medium">
                                    {Array.isArray(s.category) ? s.category.join(", ") : s.category || "—"}
                                  </td>
                                  <td className="whitespace-nowrap px-5 py-3.5 font-mono text-xs text-[#526580]">
                                    {s.supplierCode || s.supplier_code || s.gstin || "—"}
                                  </td>
                                  <td className="whitespace-nowrap px-5 py-3.5">
                                    <StatusBadge status={s.status || "Active"} />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: RFQ & QUOTATION ANALYTICS */}
              {activeTab === "rfq-analytics" && (
                <div className="space-y-6">
                  {/* RFQ Metric Summary */}
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-[#DCE6F3] bg-white p-5 shadow-xs">
                      <p className="text-xs font-bold uppercase tracking-wider text-[#526580]">Total RFQs Created</p>
                      <p className="mt-2 text-3xl font-extrabold text-[#101D3A] tabular-nums">{rfqs.length}</p>
                    </div>
                    <div className="rounded-2xl border border-[#DCE6F3] bg-white p-5 shadow-xs">
                      <p className="text-xs font-bold uppercase tracking-wider text-[#526580]">Quotations Submitted</p>
                      <p className="mt-2 text-3xl font-extrabold text-[#0866FF] tabular-nums">{quotations.length}</p>
                    </div>
                    <div className="rounded-2xl border border-[#DCE6F3] bg-white p-5 shadow-xs">
                      <p className="text-xs font-bold uppercase tracking-wider text-[#526580]">Avg Bids per RFQ</p>
                      <p className="mt-2 text-3xl font-extrabold text-emerald-600 tabular-nums">
                        {rfqs.length > 0 ? (quotations.length / rfqs.length).toFixed(1) : "0"}
                      </p>
                    </div>
                  </div>

                  {/* RFQ Register Table */}
                  <div className="overflow-hidden rounded-2xl border border-[#DCE6F3] bg-white shadow-xs">
                    <div className="flex items-center justify-between border-b border-[#DCE6F3] bg-[#F5F8FF] px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FileQuestion className="size-4 text-[#0866FF]" />
                        <h3 className="text-sm font-bold text-[#101D3A]">
                          RFQ Bidding & Quotations Register ({filteredRfqs.length})
                        </h3>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      {filteredRfqs.length === 0 ? (
                        <div className="py-12 text-center">
                          <FileQuestion className="mx-auto size-10 text-[#8FA3BF]/40" />
                          <p className="mt-2 text-sm font-bold text-[#101D3A]">No RFQs found</p>
                          <p className="text-xs text-[#526580] mt-0.5">
                            No RFQs match your current search criteria.
                          </p>
                        </div>
                      ) : (
                        <table className="w-full min-w-[650px] text-left text-xs">
                          <thead className="bg-[#F5F8FF] border-b border-[#DCE6F3]">
                            <tr className="text-[10px] font-bold uppercase tracking-wider text-[#526580]">
                              <th className="px-5 py-3">RFQ Number</th>
                              <th className="px-5 py-3">Title</th>
                              <th className="px-5 py-3">Warehouse</th>
                              <th className="px-5 py-3">Closing Date</th>
                              <th className="px-5 py-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#DCE6F3]">
                            {filteredRfqs.map((rfq) => (
                              <tr key={rfq.id} className="hover:bg-[#F5F8FF]/60 transition-colors">
                                <td className="whitespace-nowrap px-5 py-3.5 font-mono font-bold text-[#0866FF]">
                                  {rfq.rfqNumber || rfq.rfq_number || "—"}
                                </td>
                                <td className="px-5 py-3.5 font-semibold text-[#101D3A]">{rfq.title || "—"}</td>
                                <td className="whitespace-nowrap px-5 py-3.5 text-xs text-[#526580]">{rfq.warehouse || "—"}</td>
                                <td className="whitespace-nowrap px-5 py-3.5 text-xs font-mono text-[#526580]">
                                  {rfq.closingDate || rfq.closing_date || "—"}
                                </td>
                                <td className="whitespace-nowrap px-5 py-3.5">
                                  <StatusBadge status={rfq.status || "Published"} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: ASNS & COMPLIANCE */}
              {activeTab === "asns-compliance" && (
                <div className="space-y-6">
                  <div className="overflow-hidden rounded-2xl border border-[#DCE6F3] bg-white shadow-xs">
                    <div className="flex items-center justify-between border-b border-[#DCE6F3] bg-[#F5F8FF] px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Truck className="size-4 text-[#0866FF]" />
                        <h3 className="text-sm font-bold text-[#101D3A]">
                          Inbound ASN Shipping Register ({filteredAsns.length})
                        </h3>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      {filteredAsns.length === 0 ? (
                        <div className="py-12 text-center">
                          <Truck className="mx-auto size-10 text-[#8FA3BF]/40" />
                          <p className="mt-2 text-sm font-bold text-[#101D3A]">No shipping notices found</p>
                          <p className="text-xs text-[#526580] mt-0.5">
                            No ASNs match the selected filter criteria.
                          </p>
                        </div>
                      ) : (
                        <table className="w-full min-w-[650px] text-left text-xs">
                          <thead className="bg-[#F5F8FF] border-b border-[#DCE6F3]">
                            <tr className="text-[10px] font-bold uppercase tracking-wider text-[#526580]">
                              <th className="px-5 py-3">ASN Number</th>
                              <th className="px-5 py-3">PO Reference</th>
                              <th className="px-5 py-3">Supplier</th>
                              <th className="px-5 py-3">Vehicle</th>
                              <th className="px-5 py-3">Dispatch Date</th>
                              <th className="px-5 py-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#DCE6F3]">
                            {filteredAsns.map((asn) => (
                              <tr key={asn.id || asn.asn_number} className="hover:bg-[#F5F8FF]/60 transition-colors">
                                <td className="whitespace-nowrap px-5 py-3.5 font-mono font-bold text-[#0866FF]">
                                  {asn.asn_number || asn.asnNumber || "—"}
                                </td>
                                <td className="whitespace-nowrap px-5 py-3.5 font-mono text-xs text-[#526580]">
                                  {asn.po_number || asn.poNumber || "—"}
                                </td>
                                <td className="whitespace-nowrap px-5 py-3.5 font-semibold text-[#101D3A]">
                                  {asn.supplier_name || asn.supplierName || "—"}
                                </td>
                                <td className="whitespace-nowrap px-5 py-3.5 text-xs font-mono text-[#526580]">
                                  {asn.vehicle_number || asn.vehicleNumber || "—"}
                                </td>
                                <td className="whitespace-nowrap px-5 py-3.5 text-xs text-[#526580]">
                                  {asn.dispatch_date || asn.created_at || "—"}
                                </td>
                                <td className="whitespace-nowrap px-5 py-3.5">
                                  <StatusBadge status={asn.status || "In Transit"} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: DEMAND & MATERIAL REQUESTS */}
              {activeTab === "material-requests" && (
                <div className="space-y-6">
                  <div className="overflow-hidden rounded-2xl border border-[#DCE6F3] bg-white shadow-xs">
                    <div className="flex items-center justify-between border-b border-[#DCE6F3] bg-[#F5F8FF] px-6 py-4">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="size-4 text-[#0866FF]" />
                        <h3 className="text-sm font-bold text-[#101D3A]">
                          Warehouse Material Demand Register ({filteredMaterialRequests.length})
                        </h3>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      {filteredMaterialRequests.length === 0 ? (
                        <div className="py-12 text-center">
                          <ClipboardList className="mx-auto size-10 text-[#8FA3BF]/40" />
                          <p className="mt-2 text-sm font-bold text-[#101D3A]">No material requests found</p>
                          <p className="text-xs text-[#526580] mt-0.5">
                            No warehouse requests match the current filters.
                          </p>
                        </div>
                      ) : (
                        <table className="w-full min-w-[650px] text-left text-xs">
                          <thead className="bg-[#F5F8FF] border-b border-[#DCE6F3]">
                            <tr className="text-[10px] font-bold uppercase tracking-wider text-[#526580]">
                              <th className="px-5 py-3">Request ID</th>
                              <th className="px-5 py-3">Warehouse / Plant</th>
                              <th className="px-5 py-3">Department</th>
                              <th className="px-5 py-3">Requested By</th>
                              <th className="px-5 py-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#DCE6F3]">
                            {filteredMaterialRequests.map((mr) => (
                              <tr key={mr.id} className="hover:bg-[#F5F8FF]/60 transition-colors">
                                <td className="whitespace-nowrap px-5 py-3.5 font-mono font-bold text-[#0866FF]">
                                  {mr.requestNumber || mr.request_number || mr.id}
                                </td>
                                <td className="whitespace-nowrap px-5 py-3.5 font-semibold text-[#101D3A]">
                                  {mr.warehouse || "—"}
                                </td>
                                <td className="whitespace-nowrap px-5 py-3.5 text-xs text-[#526580]">
                                  {mr.department || "—"}
                                </td>
                                <td className="whitespace-nowrap px-5 py-3.5 text-xs font-medium text-[#101D3A]">
                                  {mr.requestedBy || mr.requested_by || "—"}
                                </td>
                                <td className="whitespace-nowrap px-5 py-3.5">
                                  <StatusBadge status={mr.status || "Pending Approval"} />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
