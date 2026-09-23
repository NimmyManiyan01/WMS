import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  FileCheck2,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Building2,
  Calendar,
  Loader2,
  Table as TableIcon,
  Receipt,
  Layers,
  FileSpreadsheet,
  AlertCircle,
  FileText,
  DollarSign,
  ArrowUpRight,
  RefreshCw,
  PieChart,
} from "lucide-react";
import { AppShell, StatusBadge } from "@/components/wms/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { requireRole } from "@/lib/auth-utils";

export const Route = createFileRoute("/finance-dashboard")({
  beforeLoad: () => requireRole("FINANCE"),
  component: FinanceDashboard,
});

function FinanceDashboard() {
  const [summary, setSummary] = useState<any>(null);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [apAging, setApAging] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async (quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      const [dashData, pendingApprovals, invData, agingData] = await Promise.all([
        api.getFinanceDashboard().catch(() => null),
        api.getFinanceApprovals().catch(() => []),
        api.listSupplierInvoices({ limit: 5 }).catch(() => []),
        api.getApAging().catch(() => null),
      ]);

      setSummary(dashData);
      setApprovals(Array.isArray(pendingApprovals) ? pendingApprovals : []);
      
      const invs =
        dashData?.recent_invoices && dashData.recent_invoices.length > 0
          ? dashData.recent_invoices
          : Array.isArray(invData)
          ? invData
          : [];
      setRecentInvoices(invs);
      setApAging(agingData);
    } catch {
      if (!quiet) toast.error("Failed to load live finance dashboard data");
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(true), 15000);
    return () => clearInterval(interval);
  }, []);

  // Group pending approvals by RFQ or PO
  const groupedByRfq = approvals.reduce((acc: any, po: any) => {
    const rfqId = po.rfqId || po.rfq_id || "direct-po";
    if (!acc[rfqId]) acc[rfqId] = [];
    acc[rfqId].push(po);
    return acc;
  }, {});

  const totalOutstandingAp = Number(
    summary?.total_payable ?? summary?.total_ap_outstanding ?? apAging?.total_outstanding ?? 0
  );

  return (
    <AppShell
      title="Finance Command Center"
      subtitle="Enterprise Procure-to-Pay (P2P) Cash Flow, Invoicing & Approvals Cockpit"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl font-bold"
            onClick={() => loadData()}
            disabled={loading}
          >
            <RefreshCw className={cn("size-3.5 mr-1.5", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl font-bold" asChild>
            <Link to="/finance/reports">
              <FileSpreadsheet className="size-4 mr-1.5" /> Finance Reports
            </Link>
          </Button>
          <Button size="sm" className="rounded-xl font-bold shadow-soft" asChild>
            <Link to="/finance/payments">
              <CreditCard className="size-4 mr-1.5" /> Record Payment
            </Link>
          </Button>
        </div>
      }
    >
      {/* 10 Real-Time KPI Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-8">
        <StatsCard
          title="Pending PO Approvals"
          value={summary?.pending_po_approvals ?? approvals.length}
          subtext={`₹${Number(summary?.pending_po_value || 0).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
          })}`}
          icon={Clock}
          color="text-amber-500"
          bg="bg-amber-500/10"
          to="/finance/approvals"
        />
        <StatsCard
          title="Pending Invoices"
          value={summary?.pending_invoices ?? summary?.total_invoices_received ?? recentInvoices.length}
          subtext="Awaiting match / review"
          icon={Receipt}
          color="text-sky-500"
          bg="bg-sky-500/10"
          to="/finance/invoices"
        />
        <StatsCard
          title="Awaiting AP Approval"
          value={summary?.invoices_awaiting_approval ?? summary?.total_invoices_pending_approval ?? 0}
          subtext="Matched & ready"
          icon={CheckCircle2}
          color="text-indigo-500"
          bg="bg-indigo-500/10"
          to="/finance/invoices"
        />
        <StatsCard
          title="Total Accounts Payable"
          value={`₹${totalOutstandingAp.toLocaleString("en-IN", {
            minimumFractionDigits: 2,
          })}`}
          subtext="Outstanding AP balance"
          icon={TrendingUp}
          color="text-primary"
          bg="bg-primary/10"
          to="/finance/payables"
        />
        <StatsCard
          title="Due Soon (7 Days)"
          value={summary?.due_soon_count ?? 0}
          subtext={`₹${Number(summary?.due_soon_amount || 0).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
          })}`}
          icon={Calendar}
          color="text-blue-500"
          bg="bg-blue-500/10"
          to="/finance/payables"
        />
        <StatsCard
          title="Overdue Invoices"
          value={summary?.overdue_count ?? 0}
          subtext={`₹${Number(summary?.overdue_amount || 0).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
          })}`}
          icon={AlertTriangle}
          color="text-rose-500"
          bg="bg-rose-500/10"
          to="/finance/payables"
        />
        <StatsCard
          title="Payment Pending"
          value={summary?.payment_pending_count ?? summary?.total_approved_unpaid_invoices ?? 0}
          subtext={`₹${Number(summary?.payment_pending_amount || totalOutstandingAp).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
          })}`}
          icon={CreditCard}
          color="text-emerald-500"
          bg="bg-emerald-500/10"
          to="/finance/payments"
        />
        <StatsCard
          title="Paid This Month"
          value={`₹${Number(summary?.total_payments_this_month || 0).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
          })}`}
          subtext={`${summary?.paid_count || 0} invoice disbursals`}
          icon={DollarSign}
          color="text-teal-500"
          bg="bg-teal-500/10"
          to="/finance/payments"
        />
        <StatsCard
          title="On Hold"
          value={summary?.on_hold_count ?? 0}
          subtext={`₹${Number(summary?.on_hold_amount || 0).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
          })}`}
          icon={XCircle}
          color="text-orange-500"
          bg="bg-orange-500/10"
          to="/finance/invoices"
        />
        <StatsCard
          title="Finance Exceptions"
          value={summary?.finance_exceptions_count ?? summary?.total_exceptions_open ?? 0}
          subtext="Active dispute variances"
          icon={AlertCircle}
          color="text-red-500"
          bg="bg-red-500/10"
          to="/finance/exceptions"
        />
      </div>

      {/* P2P Workflow Navigation Tiles */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 mb-8">
        {[
          { label: "PO Approvals", desc: "Budget & PO Holds", to: "/finance/approvals", icon: FileCheck2 },
          { label: "Invoices", desc: "Supplier Billed", to: "/finance/invoices", icon: Receipt },
          { label: "3-Way Match", desc: "PO · GRN · Invoice", to: "/finance/matching", icon: Layers },
          { label: "Accounts Payable", desc: "AP Aging Matrix", to: "/finance/payables", icon: TrendingUp },
          { label: "Payments", desc: "Disbursements", to: "/finance/payments", icon: CreditCard },
          { label: "Exceptions", desc: "Variance Overrides", to: "/finance/exceptions", icon: AlertCircle },
          { label: "Reports", desc: "Statements & Audit", to: "/finance/reports", icon: FileSpreadsheet },
        ].map((tile) => {
          const Icon = tile.icon;
          return (
            <Link
              key={tile.to}
              to={tile.to}
              className="p-3.5 rounded-2xl border border-border/50 bg-card hover:border-primary/40 hover:shadow-soft transition-all group flex flex-col justify-between"
            >
              <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-2 group-hover:bg-primary group-hover:text-white transition-colors">
                <Icon className="size-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-foreground group-hover:text-primary transition-colors flex items-center justify-between">
                  {tile.label} <ArrowUpRight className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </p>
                <p className="text-[10px] text-muted-foreground">{tile.desc}</p>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Priority PO Approvals & Recent Invoices */}
        <div className="lg:col-span-2 space-y-6">
          {/* Priority PO Approvals Queue */}
          <Card className="border-border/40 shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/50">
              <div>
                <CardTitle className="text-sm font-bold tracking-tight uppercase">
                  Pending PO Finance Approvals
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Purchase orders awaiting budget verification and finance approval
                </p>
              </div>
              <Button variant="ghost" size="sm" className="rounded-xl text-primary text-xs" asChild>
                <Link to="/finance/approvals">
                  View All <ArrowRight className="ml-1.5 size-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="pt-4">
              {loading ? (
                <div className="flex h-36 items-center justify-center">
                  <Loader2 className="size-6 animate-spin text-primary" />
                </div>
              ) : Object.keys(groupedByRfq).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center bg-muted/10 rounded-2xl border-dashed border-2">
                  <ShieldCheck className="size-8 text-muted-foreground/30 mb-2" />
                  <p className="text-xs font-semibold text-muted-foreground">PO Approval queue is clear</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(groupedByRfq).map(([rfqId, rfqApprovals]: [string, any]) => {
                    const firstPo = rfqApprovals[0] || {};
                    const groupTitle =
                      rfqId !== "direct-po" && firstPo.rfqNumber
                        ? `RFQ: ${firstPo.rfqNumber}`
                        : firstPo.poNumber
                        ? `PO: ${firstPo.poNumber}`
                        : "Purchase Order Proposal";
                    const totalVal = rfqApprovals.reduce(
                      (sum: number, po: any) => sum + parseFloat(po.totalAmount || po.total_amount || 0),
                      0
                    );

                    return (
                      <Link
                        key={rfqId}
                        to={firstPo.id ? (`/finance/approvals/${firstPo.id}` as any) : "/finance/approvals"}
                        className="flex items-center justify-between p-3.5 rounded-2xl border border-border/60 hover:border-primary/30 hover:shadow-soft transition-all bg-card/50 group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                            <TableIcon className="size-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold uppercase tracking-tight">{groupTitle}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {rfqApprovals.length} Proposal(s) ·{" "}
                              {rfqApprovals
                                .map((p: any) => p.supplier_name || p.supplierName || "Supplier")
                                .filter(Boolean)
                                .join(", ")}
                            </p>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-4">
                          <div>
                            <p className="text-xs font-black text-primary font-mono">
                              ₹
                              {totalVal.toLocaleString("en-IN", {
                                minimumFractionDigits: 2,
                              })}
                            </p>
                            <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">
                              Total Value
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl h-7 text-[11px] font-bold pointer-events-none group-hover:bg-primary group-hover:text-white transition-colors"
                          >
                            Review
                          </Button>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Invoices Table */}
          <Card className="border-border/40 shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border/50">
              <div>
                <CardTitle className="text-sm font-bold tracking-tight uppercase">
                  Recent Supplier Invoices
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Latest invoices recorded in NexusWMS
                </p>
              </div>
              <Button variant="ghost" size="sm" className="rounded-xl text-primary text-xs" asChild>
                <Link to="/finance/invoices">
                  All Invoices <ArrowRight className="ml-1.5 size-3.5" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {recentInvoices.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No supplier invoices recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-muted/30 border-b border-border/60 text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                        <th className="p-3">Invoice #</th>
                        <th className="p-3">Supplier</th>
                        <th className="p-3">Invoice Date</th>
                        <th className="p-3 text-right">Grand Total</th>
                        <th className="p-3">Match Status</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {recentInvoices.map((inv: any) => (
                        <tr key={inv.id} className="hover:bg-muted/5 transition-colors">
                          <td className="p-3 font-mono font-bold text-primary">
                            <Link to={`/finance/invoices/${inv.id}` as any}>
                              {inv.invoice_number}
                            </Link>
                          </td>
                          <td className="p-3 font-medium text-foreground">
                            {inv.supplier_name || "Supplier"}
                          </td>
                          <td className="p-3 text-muted-foreground">{inv.invoice_date}</td>
                          <td className="p-3 text-right font-mono font-bold">
                            ₹
                            {Number(inv.grand_total || 0).toLocaleString("en-IN", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="p-3">
                            <StatusBadge status={inv.match_status} />
                          </td>
                          <td className="p-3">
                            <StatusBadge status={inv.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live AP Aging Breakdown & Budget Controls */}
        <div className="space-y-6">
          {/* Real AP Aging Distribution */}
          <Card className="border-border/40 shadow-soft">
            <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold uppercase tracking-tight">
                  AP Aging Schedule
                </CardTitle>
                <p className="text-[11px] text-muted-foreground">Outstanding payable maturities</p>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-primary" asChild>
                <Link to="/finance/payables">
                  View AP Matrix <ArrowRight className="ml-1 size-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {(apAging?.buckets || [
                { bucket_label: "0-30 Days", invoice_count: 0, total_amount: 0 },
                { bucket_label: "31-60 Days", invoice_count: 0, total_amount: 0 },
                { bucket_label: "61-90 Days", invoice_count: 0, total_amount: 0 },
                { bucket_label: "90+ Days", invoice_count: 0, total_amount: 0 },
              ]).map((b: any) => {
                const isOverdue = !b.bucket_label?.includes("0-30");
                return (
                  <div
                    key={b.bucket_label}
                    className="p-2.5 rounded-xl border border-border/40 bg-muted/10 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-semibold text-foreground">{b.bucket_label}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {b.invoice_count} invoice{b.invoice_count === 1 ? "" : "s"}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "text-xs font-mono font-bold",
                        isOverdue && b.total_amount > 0 ? "text-rose-600" : "text-foreground"
                      )}
                    >
                      ₹
                      {Number(b.total_amount || 0).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Budget & Spend Utilization */}
          <Card className="border-border/40 shadow-soft">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-sm font-bold uppercase tracking-tight">
                Budget &amp; Spend Utilization
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5 font-bold">
                  <span className="text-muted-foreground">Department Budget Absorbed</span>
                  <span className="font-mono text-primary font-black">
                    {summary?.budget_utilization_pct || 0}%
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-muted/40 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      (summary?.budget_utilization_pct || 0) > 85
                        ? "bg-rose-500"
                        : (summary?.budget_utilization_pct || 0) > 70
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    )}
                    style={{ width: `${Math.min(100, summary?.budget_utilization_pct || 0)}%` }}
                  />
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-muted/20 border border-border/50 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Open Exceptions:</span>
                  <span className="font-bold text-rose-500">
                    {summary?.finance_exceptions_count ?? summary?.total_exceptions_open ?? 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Credit Notes Available:</span>
                  <span className="font-mono font-bold text-emerald-600">
                    ₹{Number(summary?.total_credit_notes_available || 0).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Disbursements This Month:</span>
                  <span className="font-mono font-bold text-primary">
                    ₹{Number(summary?.total_payments_this_month || 0).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <Button variant="outline" className="w-full rounded-xl text-xs font-bold" asChild>
                  <Link to="/finance/matching">
                    <Layers className="size-3.5 mr-2" /> Open 3-Way Match Console
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function StatsCard({ title, value, subtext, icon: Icon, color, bg, to }: any) {
  const content = (
    <CardContent className="p-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider truncate">
            {title}
          </p>
          <h2 className="text-xl font-black mt-1 text-foreground font-mono">{value}</h2>
          {subtext && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{subtext}</p>}
        </div>
        <div className={cn("size-9 rounded-xl flex items-center justify-center shrink-0 ml-2", bg, color)}>
          <Icon className="size-4" />
        </div>
      </div>
    </CardContent>
  );

  return (
    <Card
      className={cn(
        "border-border/40 shadow-soft overflow-hidden transition-all",
        to && "hover:border-primary/40 hover:shadow-soft cursor-pointer"
      )}
    >
      {to ? <Link to={to}>{content}</Link> : content}
    </Card>
  );
}
