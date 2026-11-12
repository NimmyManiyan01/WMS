import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  ClipboardList,
  FileCheck2,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  X,
  Phone,
  Eye,
  SlidersHorizontal,
} from "lucide-react";
import { AppShell } from "@/components/wms/app-shell";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/master-data")({
  head: () => ({
    meta: [
      { title: "Supplier Management · KaizenX" },
      {
        name: "description",
        content:
          "Maintain supplier master records used across procurement and receiving workflows.",
      },
      { property: "og:title", content: "Supplier Management · KaizenX" },
      { property: "og:description", content: "Supplier master records for procurement." },
    ],
  }),
  component: MasterData,
});

function SupplierStatusBadge({ status }: { status: string }) {
  const norm = String(status || "").trim().toLowerCase();
  if (norm === "active") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]">
        <span className="size-1.5 rounded-full bg-[#16A34A]" />
        Active
      </span>
    );
  }
  if (norm.includes("pending")) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]">
        <span className="size-1.5 rounded-full bg-[#D97706] animate-pulse" />
        Pending Approval
      </span>
    );
  }
  if (norm === "draft") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1]">
        <span className="size-1.5 rounded-full bg-[#64748B]" />
        Draft
      </span>
    );
  }
  if (norm === "suspended") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FFF7ED] text-[#C2410C] border border-[#FFEDD5]">
        <span className="size-1.5 rounded-full bg-[#EA580C]" />
        Suspended
      </span>
    );
  }
  if (norm === "blocked") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA]">
        <span className="size-1.5 rounded-full bg-[#EF4444]" />
        Blocked
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
      {status || "Registered"}
    </span>
  );
}

function MasterData() {
  const location = useRouterState({ select: (state) => state.location });
  const routeParams = new URLSearchParams(location.searchStr || "");
  const currentModule = routeParams.get("module");
  const routeStatus = routeParams.get("status");
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [procurementStats, setProcurementStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(() =>
    routeStatus === "pending-approval" ? "pending approval" : "all",
  );

  const timeoutPromise = <T,>(promise: Promise<T>, ms = 2500, fallback: T): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
    ]).catch(() => fallback);
  };

  const loadSuppliers = async () => {
    setLoading(true);
    setError(null);
    try {
      const [supplierData, requestData, statsData, poData] = await Promise.all([
        timeoutPromise(api.getSuppliers(), 2500, []),
        timeoutPromise(api.getMaterialRequests(), 2500, []),
        timeoutPromise(api.getProcurementStats(), 2500, null),
        timeoutPromise(api.getPurchaseOrders(), 2500, []),
      ]);

      const reqList = Array.isArray(requestData) ? requestData : [];
      const fallbackPendingRequests = reqList.filter(
        (request: any) => request.status === "Pending Approval" || request.status === "Submitted",
      ).length;

      setSuppliers(Array.isArray(supplierData) ? supplierData : []);
      setPurchaseOrders(Array.isArray(poData) ? poData : []);
      setProcurementStats(statsData);
      setPendingRequests(Number(statsData?.pendingMaterialRequests ?? fallbackPendingRequests));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load suppliers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSuppliers();
  }, []);

  useEffect(() => {
    if (routeStatus === "pending-approval") {
      setStatusFilter("pending approval");
    }
  }, [routeStatus]);

  const filteredSuppliers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return suppliers.filter((supplier) => {
      const suppStatus = (supplier.status || "Pending Approval").toLowerCase();
      const matchesStatus =
        statusFilter === "all" ||
        suppStatus === statusFilter ||
        (statusFilter === "pending approval" && suppStatus.includes("pending"));
      const matchesQuery =
        !normalizedQuery ||
        [
          supplier.supplierName,
          supplier.supplier_name,
          supplier.registeredCompanyName,
          supplier.registered_company_name,
          supplier.category,
          supplier.gstin,
          supplier.supplierCode,
          supplier.supplier_code,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));
      return matchesStatus && matchesQuery;
    });
  }, [query, statusFilter, suppliers]);

  const pendingSupplierRegistrations = Number(
    procurementStats?.pendingSupplierRegistrations ??
      suppliers.filter((supplier) => (supplier.status || "").toLowerCase().includes("pending"))
        .length,
  );
  const expiringSupplierDocuments = Number(procurementStats?.expiringSupplierDocuments ?? 0);
  const pendingRequestSources = Array.isArray(procurementStats?.pendingMaterialRequestSources)
    ? procurementStats.pendingMaterialRequestSources
    : [];

  const pendingRequestSourceText =
    pendingRequestSources.length > 0
      ? `From ${pendingRequestSources.join(", ")}`
      : pendingRequests > 0
        ? "Submitted by Warehouse Operations"
        : "No pending warehouse requests";

  const activeSupplierCount = suppliers.filter(
    (s) => (s.status || "Active").toLowerCase() === "active",
  ).length;

  const blockedSupplierCount = suppliers.filter(
    (s) => (s.status || "").toLowerCase() === "blocked",
  ).length;

  const hasActionRequired =
    pendingRequests > 0 || pendingSupplierRegistrations > 0 || expiringSupplierDocuments > 0;

  return (
    <AppShell mainClassName="bg-[#F5F8FF]">
      <div className="space-y-6 pb-24 max-w-[1536px] mx-auto">
        {/* 1. Breadcrumbs */}
        {/* 2. Page Header */}
        <div className="flex flex-col gap-4 rounded-2xl bg-[#0B2A55] p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-100/75">
            <Link to="/procurement-dashboard" className="hover:text-white transition-colors">Procurement</Link>
            <ChevronRight className="size-3 text-blue-200/70" />
            <span className="font-bold text-white">Supplier Management</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="size-12 rounded-2xl bg-white/10 border border-white/20 text-white flex items-center justify-center shadow-xs shrink-0">
              <Building2 className="size-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-[30px] font-extrabold tracking-tight text-white leading-tight">
                Supplier Management
              </h1>
              <p className="text-xs sm:text-sm font-medium text-blue-100/85 mt-0.5">
                Maintain and authorize supplier master records used across procurement and gate-entry workflows.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
            <Button
              variant="outline"
              onClick={() => void loadSuppliers()}
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
              <Link
                to="/new-supplier"
                search={currentModule === "manager" ? ({ module: "manager" } as any) : undefined}
              >
                <Plus className="size-4" /> Add Supplier
              </Link>
            </Button>
          </div>
          </div>
        </div>

        {/* 3. 4 KPI Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Pending Requests */}
          <Link
            to="/procurement/material-requests"
            search={{ status: "manager-approval" }}
            className="block"
          >
            <div className="flex items-center gap-4 p-4 lg:p-5 rounded-2xl bg-white border border-[#DCE6F3] shadow-xs hover:border-[#F5A623] hover:shadow-md transition-all group cursor-pointer">
              <div className="size-11 sm:size-12 rounded-2xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0 shadow-2xs">
                <ClipboardList className="size-6" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl sm:text-3xl font-extrabold text-[#101D3A] leading-none tabular-nums">
                  {loading ? "…" : pendingRequests}
                </p>
                <p className="text-xs font-semibold text-[#526580] mt-1 truncate">Pending Requests</p>
                <span className="text-[11px] font-bold text-[#D97706] group-hover:underline inline-flex items-center gap-0.5 mt-0.5">
                  View Requests <ArrowRight className="size-3" />
                </span>
              </div>
            </div>
          </Link>

          {/* Card 2: Total Suppliers */}
          <div className="flex items-center gap-4 p-4 lg:p-5 rounded-2xl bg-white border border-[#DCE6F3] shadow-xs hover:border-[#0866FF]/40 transition-all">
            <div className="size-11 sm:size-12 rounded-2xl bg-[#EBF3FF] text-[#0866FF] flex items-center justify-center shrink-0 shadow-2xs">
              <Building2 className="size-6" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl sm:text-3xl font-extrabold text-[#101D3A] leading-none tabular-nums">
                {loading ? "…" : suppliers.length}
              </p>
              <p className="text-xs font-semibold text-[#526580] mt-1 truncate">Total Suppliers</p>
              <span className="text-[11px] font-medium text-[#8FA3BF] block mt-0.5">Vendor master records</span>
            </div>
          </div>

          {/* Card 3: Active Suppliers */}
          <div className="flex items-center gap-4 p-4 lg:p-5 rounded-2xl bg-white border border-[#DCE6F3] shadow-xs hover:border-[#16C784]/40 transition-all">
            <div className="size-11 sm:size-12 rounded-2xl bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center shrink-0 shadow-2xs">
              <ShieldCheck className="size-6" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl sm:text-3xl font-extrabold text-[#101D3A] leading-none tabular-nums">
                {loading ? "…" : activeSupplierCount}
              </p>
              <p className="text-xs font-semibold text-[#526580] mt-1 truncate">Active Suppliers</p>
              <span className="text-[11px] font-medium text-[#16A34A] block mt-0.5">Available for sourcing</span>
            </div>
          </div>

          {/* Card 4: Blocked Suppliers */}
          <div className="flex items-center gap-4 p-4 lg:p-5 rounded-2xl bg-white border border-[#DCE6F3] shadow-xs hover:border-[#E5484D]/40 transition-all">
            <div className="size-11 sm:size-12 rounded-2xl bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center shrink-0 shadow-2xs">
              <ShieldAlert className="size-6" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl sm:text-3xl font-extrabold text-[#101D3A] leading-none tabular-nums">
                {loading ? "…" : blockedSupplierCount}
              </p>
              <p className="text-xs font-semibold text-[#526580] mt-1 truncate">Blocked Suppliers</p>
              <span className="text-[11px] font-medium text-[#E5484D] block mt-0.5">Excluded from procurement</span>
            </div>
          </div>
        </div>

        {/* 4. Action Required Section (Only displayed when tasks exist; no zero-count urgent alerts) */}
        {hasActionRequired && (
          <div className="rounded-2xl border border-[#DCE6F3] bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3.5 border-b border-[#DCE6F3]">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-xl bg-[#FFFBEB] text-[#D97706] flex items-center justify-center">
                  <AlertCircle className="size-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#101D3A]">Action Required</h2>
                  <p className="text-xs font-medium text-[#526580]">
                    High-priority procurement tasks requiring immediate review or authorization
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs font-bold text-[#0866FF] hover:bg-[#EBF3FF] rounded-xl"
                asChild
              >
                <Link to="/procurement/material-requests">
                  View All Tasks <ArrowRight className="ml-1 size-3.5" />
                </Link>
              </Button>
            </div>

            <div className="divide-y divide-[#DCE6F3]/70 pt-1">
              {/* Task 1: Pending Material Requests */}
              {pendingRequests > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5 hover:bg-[#F5F8FF] rounded-xl px-2 transition-colors">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-amber-500/15 text-amber-600 font-bold text-xs mt-0.5">
                      {pendingRequests}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#101D3A]">
                        {pendingRequests} Material Request{pendingRequests === 1 ? "" : "s"} Awaiting Manager Approval
                      </p>
                      <p className="text-xs text-[#526580] mt-0.5 truncate">{pendingRequestSourceText}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="h-8 rounded-xl bg-[#0866FF] hover:bg-[#0054D6] text-white text-xs font-bold shrink-0 shadow-2xs gap-1"
                    asChild
                  >
                    <Link to="/procurement/material-requests" search={{ status: "manager-approval" }}>
                      Review Material Request <ArrowRight className="size-3" />
                    </Link>
                  </Button>
                </div>
              )}

              {/* Task 2: Pending Supplier Registrations */}
              {pendingSupplierRegistrations > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5 hover:bg-[#F5F8FF] rounded-xl px-2 transition-colors">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-blue-500/15 text-[#0866FF] font-bold text-xs mt-0.5">
                      {pendingSupplierRegistrations}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#101D3A]">
                        {pendingSupplierRegistrations} Supplier Registration{pendingSupplierRegistrations === 1 ? "" : "s"} Awaiting Approval
                      </p>
                      <p className="text-xs text-[#526580] mt-0.5">New vendor onboarding verification queue</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-xl border-[#DCE6F3] text-xs font-bold text-[#101D3A] hover:bg-[#EBF3FF] hover:text-[#0866FF] shrink-0 gap-1"
                    onClick={() => setStatusFilter("pending approval")}
                  >
                    Review Supplier Registration <ArrowRight className="size-3" />
                  </Button>
                </div>
              )}

              {/* Task 3: Expiring Supplier Documents */}
              {expiringSupplierDocuments > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5 hover:bg-[#F5F8FF] rounded-xl px-2 transition-colors">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-rose-500/15 text-rose-600 font-bold text-xs mt-0.5">
                      {expiringSupplierDocuments}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#101D3A]">
                        {expiringSupplierDocuments} Supplier Document{expiringSupplierDocuments === 1 ? "" : "s"} Expiring
                      </p>
                      <p className="text-xs text-[#526580] mt-0.5">GST, MSME or quality certificates renewal needed</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-xl border-[#DCE6F3] text-xs font-bold text-[#101D3A] hover:bg-[#EBF3FF] hover:text-[#0866FF] shrink-0 gap-1"
                    asChild
                  >
                    <Link to="/procurement/quality-issues">
                      View Expiring Documents <ArrowRight className="size-3" />
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. Supplier Master List Card */}
        <div className="rounded-2xl border border-[#DCE6F3] bg-white p-5 shadow-xs">
          {/* Header & Search Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4">
            <div>
              <h2 className="text-base font-bold text-[#101D3A]">Supplier Directory</h2>
              <p className="text-xs text-[#526580] mt-0.5">
                Registered vendors available for procurement orders and gate-entry workflows.
              </p>
            </div>
            <div className="relative w-full sm:w-80">
              <label htmlFor="supplier-directory-search" className="absolute left-3.5 top-1/2 -translate-y-1/2 cursor-text text-[#526580]">
                <Search className="size-4" aria-hidden="true" />
                <span className="sr-only">Search suppliers</span>
              </label>
              <input
                id="supplier-directory-search"
                type="text"
                value={query}
                onChange={(event) => {
                  const value = event.target.value;
                  setQuery(value);
                  if (value.trim()) setStatusFilter("all");
                }}
                placeholder="Search vendor, category or GSTIN..."
                className="h-10 w-full rounded-xl border border-[#DCE6F3] bg-[#F5F8FF] pl-10 pr-9 text-xs sm:text-sm text-[#101D3A] outline-none transition-all placeholder:text-[#8FA3BF] focus:bg-white focus:border-[#0866FF] focus:ring-2 focus:ring-[#0866FF]/20"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8FA3BF] hover:text-[#101D3A]"
                  title="Clear search"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          </div>

          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 pb-4 border-b border-[#DCE6F3]/70">
            {[
              { id: "all", label: "All Suppliers", count: suppliers.length },
              {
                id: "draft",
                label: "Draft",
                count: suppliers.filter((s) => (s.status || "").toLowerCase() === "draft").length,
              },
              {
                id: "pending approval",
                label: "Pending Approval",
                count: suppliers.filter((s) => (s.status || "").toLowerCase().includes("pending")).length,
              },
              {
                id: "active",
                label: "Active",
                count: suppliers.filter((s) => (s.status || "Active").toLowerCase() === "active").length,
              },
              {
                id: "blocked",
                label: "Blocked",
                count: suppliers.filter((s) => (s.status || "").toLowerCase() === "blocked").length,
              },
            ].map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold transition-all",
                    active
                      ? "bg-[#0866FF] text-white shadow-xs"
                      : "bg-[#F5F8FF] text-[#526580] hover:bg-[#EBF3FF] hover:text-[#0866FF] border border-[#DCE6F3]",
                  )}
                >
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      "grid min-w-5 h-5 place-items-center rounded-full px-1.5 text-[10px] font-extrabold tabular-nums",
                      active ? "bg-white/20 text-white" : "bg-[#DCE6F3] text-[#101D3A]",
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Supplier Table */}
          {loading ? (
            <div className="flex h-56 items-center justify-center gap-2 text-sm text-[#526580]">
              <Loader2 className="size-5 animate-spin text-[#0866FF]" /> Loading supplier master records…
            </div>
          ) : error ? (
            <div className="my-6 rounded-2xl border border-red-200 bg-red-50/50 p-5 text-center">
              <p className="text-sm font-bold text-red-700">Supplier records could not be loaded.</p>
              <p className="mt-1 text-xs text-red-500">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 rounded-xl border-red-200 text-xs font-semibold"
                onClick={loadSuppliers}
              >
                Try Again
              </Button>
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
              <Building2 className="size-12 text-[#8FA3BF] opacity-50" />
              <div>
                <p className="text-base font-bold text-[#101D3A]">
                  {query || statusFilter !== "all" ? "No matching suppliers found" : "No suppliers registered yet"}
                </p>
                <p className="mt-1 text-xs text-[#526580] max-w-sm">
                  {query || statusFilter !== "all"
                    ? "Try adjusting your search query or switching the status filter."
                    : "Add your first vendor to start building your enterprise supplier directory."}
                </p>
              </div>
              {(query || statusFilter !== "all") && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-[#DCE6F3] text-xs font-semibold"
                  onClick={() => {
                    setQuery("");
                    setStatusFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <div className="-mx-5 overflow-x-auto px-5 pt-2">
              <table className="w-full min-w-[800px] text-sm">
                <thead>
                  <tr className="border-b border-[#DCE6F3] text-left text-xs uppercase tracking-wider font-bold text-[#526580]">
                    <th className="pb-3.5 font-bold">Supplier</th>
                    <th className="pb-3.5 font-bold">Category</th>
                    <th className="pb-3.5 font-bold">GSTIN</th>
                    <th className="pb-3.5 font-bold">Contact</th>
                    <th className="pb-3.5 font-bold">Last PO</th>
                    <th className="pb-3.5 font-bold">Status</th>
                    <th className="pb-3.5 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DCE6F3]/70">
                  {filteredSuppliers.map((supplier) => {
                    const phone =
                      supplier.contact?.phone || supplier.phone || supplier.contactPhone || "—";
                    const suppPos = purchaseOrders.filter(
                      (p: any) =>
                        (p.supplierId && String(p.supplierId) === String(supplier.supplierId || supplier.id)) ||
                        (p.supplier_id && String(p.supplier_id) === String(supplier.supplierId || supplier.id)) ||
                        (p.supplierName &&
                          String(p.supplierName).toLowerCase() ===
                            String(supplier.supplierName || supplier.supplier_name || "").toLowerCase()),
                    );
                    const latestPoFromList = suppPos[0]?.poNumber || suppPos[0]?.po_number;
                    const lastPo =
                      supplier.lastPoNumber ||
                      supplier.last_po_number ||
                      supplier.latestPoNumber ||
                      latestPoFromList ||
                      "—";

                    return (
                      <tr
                        key={supplier.supplierId || supplier.id}
                        className="transition-colors hover:bg-[#F5F8FF]/80"
                      >
                        <td className="py-3.5">
                          <Link
                            to="/supplier/$supplierId"
                            params={{ supplierId: supplier.supplierId || supplier.id }}
                            search={currentModule === "manager" ? ({ module: "manager" } as any) : undefined}
                            className="font-bold text-[#0866FF] hover:underline"
                          >
                            {supplier.supplierName || supplier.supplier_name}
                          </Link>
                          <p className="text-xs text-[#526580] mt-0.5">
                            {supplier.registeredCompanyName ||
                              supplier.supplierCode ||
                              supplier.supplier_code ||
                              supplier.supplierId}
                          </p>
                        </td>
                        <td className="py-3.5 text-[#526580] font-medium text-xs">
                          {Array.isArray(supplier.category)
                            ? supplier.category.join(", ")
                            : supplier.category || "General"}
                        </td>
                        <td className="py-3.5 font-mono text-xs font-semibold text-[#101D3A]">
                          {supplier.gstin || "—"}
                        </td>
                        <td className="py-3.5 text-xs text-[#526580]">
                          <span className="flex items-center gap-1">
                            <Phone className="size-3 text-[#8FA3BF]" />
                            {phone}
                          </span>
                        </td>
                        <td className="py-3.5 font-mono text-xs font-bold text-[#101D3A]">
                          {lastPo}
                        </td>
                        <td className="py-3.5">
                          <SupplierStatusBadge status={supplier.status || "Active"} />
                        </td>
                        <td className="py-3.5 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-xl border-[#DCE6F3] bg-white text-xs font-bold text-[#101D3A] hover:bg-[#EBF3FF] hover:text-[#0866FF] hover:border-[#0866FF]/40 shadow-2xs gap-1"
                            asChild
                          >
                            <Link
                              to="/supplier/$supplierId"
                              params={{ supplierId: supplier.supplierId || supplier.id }}
                              search={currentModule === "manager" ? ({ module: "manager" } as any) : undefined}
                            >
                              <Eye className="size-3.5 text-[#0866FF]" />
                              View
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="flex items-center justify-between pt-4 pb-1 border-t border-[#DCE6F3]/60 text-xs text-[#526580]">
                <span>
                  Showing <span className="font-bold text-[#101D3A]">{filteredSuppliers.length}</span> of{" "}
                  <span className="font-bold text-[#101D3A]">{suppliers.length}</span> suppliers
                </span>
                <span className="text-[11px] font-medium text-[#8FA3BF]">
                  KaizenX Master Data Service
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
