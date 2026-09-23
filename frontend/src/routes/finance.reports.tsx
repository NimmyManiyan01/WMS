import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  FileText,
  Calendar,
  Building2,
  Download,
  Printer,
  RefreshCw,
  Search,
  Filter,
  CreditCard,
  History,
  TrendingDown,
  DollarSign,
  Clock,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Layers,
  BarChart3,
  BookOpen,
} from "lucide-react";
import { AppShell, StatusBadge } from "@/components/wms/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/finance/reports")({
  component: FinanceReportsPage,
});

function FinanceReportsPage() {
  const [activeTab, setActiveTab] = useState("ap-aging");
  const [suppliers, setSuppliers] = useState<any[]>([]);

  // 1. AP Aging State
  const [asOfDate, setAsOfDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [agingData, setAgingData] = useState<any>(null);
  const [loadingAging, setLoadingAging] = useState(false);

  // 2. Supplier Statement State
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [statementData, setStatementData] = useState<any>(null);
  const [loadingStatement, setLoadingStatement] = useState(false);

  // 3. Payments Summary State
  const [paymentsList, setPaymentsList] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  // 4. Audit Trail State
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [auditFilterType, setAuditFilterType] = useState("ALL");
  const [loadingAudit, setLoadingAudit] = useState(false);

  useEffect(() => {
    loadSuppliers();
  }, []);

  useEffect(() => {
    if (activeTab === "ap-aging") {
      loadAging();
    } else if (activeTab === "statement" && selectedSupplierId) {
      loadStatement();
    } else if (activeTab === "payments") {
      loadPayments();
    } else if (activeTab === "audit") {
      loadAudit();
    }
  }, [activeTab]);

  const loadSuppliers = async () => {
    try {
      const sups = await api.listSuppliers().catch(() => []);
      setSuppliers(sups || []);
      if (sups && sups.length > 0 && !selectedSupplierId) {
        setSelectedSupplierId(sups[0].id);
      }
    } catch {
      // ignore
    }
  };

  const loadAging = async () => {
    try {
      setLoadingAging(true);
      const res = await api.getApAging(asOfDate);
      setAgingData(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to load AP aging report");
    } finally {
      setLoadingAging(false);
    }
  };

  const loadStatement = async () => {
    if (!selectedSupplierId) return;
    try {
      setLoadingStatement(true);
      const res = await api.getSupplierStatement(selectedSupplierId, {
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      });
      setStatementData(res);
    } catch (err: any) {
      toast.error(err.message || "Failed to load supplier statement");
    } finally {
      setLoadingStatement(false);
    }
  };

  const loadPayments = async () => {
    try {
      setLoadingPayments(true);
      const res = await api.listPayments();
      setPaymentsList(res || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load payments report");
    } finally {
      setLoadingPayments(false);
    }
  };

  const loadAudit = async () => {
    try {
      setLoadingAudit(true);
      const res = await api.getFinanceAuditTrail({
        entity_type: auditFilterType !== "ALL" ? auditFilterType : undefined,
        limit: 100,
      });
      setAuditEvents(res || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load audit trail");
    } finally {
      setLoadingAudit(false);
    }
  };

  return (
    <AppShell
      title="Finance Reports & Ledger Audit"
      subtitle="Examine authoritative accounts payable aging, supplier statements, disbursal registers, and audit trails"
    >
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-2">
            <TabsList className="bg-slate-100 dark:bg-slate-800 p-1">
              <TabsTrigger value="ap-aging" className="gap-1.5 text-xs">
                <BarChart3 className="h-3.5 w-3.5" />
                AP Aging Schedule
              </TabsTrigger>
              <TabsTrigger value="statement" className="gap-1.5 text-xs">
                <BookOpen className="h-3.5 w-3.5" />
                Supplier Statements
              </TabsTrigger>
              <TabsTrigger value="payments" className="gap-1.5 text-xs">
                <CreditCard className="h-3.5 w-3.5" />
                Disbursal Register
              </TabsTrigger>
              <TabsTrigger value="audit" className="gap-1.5 text-xs">
                <History className="h-3.5 w-3.5" />
                Finance Audit Trail
              </TabsTrigger>
            </TabsList>

            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="gap-1.5 text-xs"
            >
              <Printer className="h-3.5 w-3.5" />
              Print / Export PDF
            </Button>
          </div>

          {/* ========================================================= */}
          {/* Tab 1: AP Aging Schedule                                   */}
          {/* ========================================================= */}
          <TabsContent value="ap-aging" className="space-y-6 pt-4">
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl border">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-indigo-600" />
                <div>
                  <h3 className="text-sm font-semibold">Aging Valuation Date</h3>
                  <p className="text-xs text-slate-500">Calculate days overdue as of</p>
                </div>
                <Input
                  type="date"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                  className="h-8 w-40 text-sm ml-2"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={loadAging}
                  disabled={loadingAging}
                  className="h-8 text-xs"
                >
                  <RefreshCw className={cn("h-3 w-3 mr-1", loadingAging && "animate-spin")} />
                  Compute
                </Button>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-500 block uppercase font-semibold">
                  Total Outstanding AP
                </span>
                <span className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  ₹{(agingData?.total_outstanding || 0).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>

            {/* Buckets visualization */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              {(agingData?.buckets || []).map((b: any, idx: number) => {
                const colors = [
                  "border-l-emerald-500 text-emerald-700 dark:text-emerald-400",
                  "border-l-amber-500 text-amber-700 dark:text-amber-400",
                  "border-l-orange-500 text-orange-700 dark:text-orange-400",
                  "border-l-rose-500 text-rose-700 dark:text-rose-400",
                ];
                return (
                  <Card
                    key={b.bucket_label}
                    className={cn("border-l-4 p-4", colors[idx % colors.length])}
                  >
                    <div className="text-xs font-semibold uppercase">{b.bucket_label}</div>
                    <div className="text-xl font-bold mt-1 text-slate-900 dark:text-slate-100">
                      ₹{(b.total_amount || 0).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {b.invoice_count} invoice{b.invoice_count === 1 ? "" : "s"}
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Invoices Detailed Breakdown */}
            <Card className="overflow-hidden">
              <div className="p-4 border-b bg-slate-50 dark:bg-slate-800/60 font-semibold text-xs text-slate-600 dark:text-slate-300 uppercase">
                Detailed AP Aging Ledger
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase">
                    <tr>
                      <th className="px-4 py-2.5">Invoice #</th>
                      <th className="px-4 py-2.5">Invoice Date</th>
                      <th className="px-4 py-2.5">Due Date</th>
                      <th className="px-4 py-2.5 text-center">Days Overdue</th>
                      <th className="px-4 py-2.5 text-center">Bucket</th>
                      <th className="px-4 py-2.5 text-right">Grand Total</th>
                      <th className="px-4 py-2.5 text-right">Outstanding (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(agingData?.invoices || []).map((inv: any) => (
                      <tr key={inv.invoice_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-2 font-medium">
                          <Link
                            to={`/finance/invoices/${inv.invoice_id}` as any}
                            className="text-indigo-600 hover:underline"
                          >
                            {inv.invoice_number}
                          </Link>
                        </td>
                        <td className="px-4 py-2 text-slate-500">{inv.invoice_date}</td>
                        <td className="px-4 py-2">{inv.due_date}</td>
                        <td className="px-4 py-2 text-center font-medium">
                          {inv.days_overdue > 0 ? (
                            <span className="text-rose-600">{inv.days_overdue} d</span>
                          ) : (
                            <span className="text-emerald-600">Current</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800">
                            {inv.bucket}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right text-slate-600">
                          ₹{inv.grand_total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2 text-right font-bold text-slate-900 dark:text-slate-100">
                          ₹{inv.outstanding_amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* ========================================================= */}
          {/* Tab 2: Supplier Statements                                 */}
          {/* ========================================================= */}
          <TabsContent value="statement" className="space-y-6 pt-4">
            <div className="flex flex-col md:flex-row items-center gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border">
              <div className="w-full md:w-72">
                <Label className="text-xs text-slate-500 mb-1 block">Supplier</Label>
                <Select
                  value={selectedSupplierId}
                  onValueChange={(val) => {
                    setSelectedSupplierId(val);
                  }}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">From Date</Label>
                  <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="h-9 w-36 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">To Date</Label>
                  <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="h-9 w-36 text-xs"
                  />
                </div>
              </div>

              <div className="md:mt-5">
                <Button
                  size="sm"
                  onClick={loadStatement}
                  disabled={loadingStatement || !selectedSupplierId}
                  className="h-9 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
                >
                  <RefreshCw
                    className={cn("h-3.5 w-3.5", loadingStatement && "animate-spin")}
                  />
                  Generate Statement
                </Button>
              </div>
            </div>

            {statementData && (
              <div className="space-y-6">
                {/* Statement Summary Card */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="p-4 bg-white dark:bg-slate-900">
                    <div className="text-xs text-slate-500 uppercase font-semibold">
                      Total Invoiced
                    </div>
                    <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                      ₹{statementData.total_invoiced.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                  </Card>

                  <Card className="p-4 bg-white dark:bg-slate-900">
                    <div className="text-xs text-slate-500 uppercase font-semibold">
                      Total Paid / Disbursed
                    </div>
                    <div className="text-xl font-bold text-emerald-600 mt-1">
                      ₹{statementData.total_paid.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                  </Card>

                  <Card className="p-4 bg-white dark:bg-slate-900">
                    <div className="text-xs text-slate-500 uppercase font-semibold">
                      Adjustments & Notes
                    </div>
                    <div className="text-xl font-bold text-amber-600 mt-1">
                      ₹{statementData.total_adjustments.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                  </Card>

                  <Card className="p-4 bg-white dark:bg-slate-900 border-indigo-200 dark:border-indigo-800">
                    <div className="text-xs text-slate-500 uppercase font-semibold">
                      Closing Net Balance
                    </div>
                    <div className="text-xl font-bold text-indigo-600 mt-1">
                      ₹{statementData.closing_balance.toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                  </Card>
                </div>

                {/* Ledger Table */}
                <Card className="overflow-hidden">
                  <div className="p-4 border-b bg-slate-50 dark:bg-slate-800/60 font-semibold text-xs text-slate-600 dark:text-slate-300 uppercase">
                    Chronological Statement of Account: {statementData.supplier_name} (
                    {statementData.supplier_code})
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase">
                        <tr>
                          <th className="px-4 py-2.5">Date</th>
                          <th className="px-4 py-2.5">Entry Type</th>
                          <th className="px-4 py-2.5">Reference #</th>
                          <th className="px-4 py-2.5">Description</th>
                          <th className="px-4 py-2.5 text-right">Debit / Billed (₹)</th>
                          <th className="px-4 py-2.5 text-right">Credit / Paid (₹)</th>
                          <th className="px-4 py-2.5 text-right">Running Balance (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {statementData.entries?.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-8 text-slate-400">
                              No statement entries found for the selected period.
                            </td>
                          </tr>
                        ) : (
                          statementData.entries?.map((e: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="px-4 py-2 text-slate-600">{e.date}</td>
                              <td className="px-4 py-2 font-semibold">
                                <span
                                  className={cn(
                                    "px-2 py-0.5 rounded text-[10px]",
                                    e.type === "INVOICE"
                                      ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                                      : e.type === "PAYMENT"
                                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                      : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                                  )}
                                >
                                  {e.type}
                                </span>
                              </td>
                              <td className="px-4 py-2 font-mono font-medium">
                                {e.reference_number}
                              </td>
                              <td className="px-4 py-2 text-slate-600 dark:text-slate-400">
                                {e.description}
                              </td>
                              <td className="px-4 py-2 text-right text-slate-800 dark:text-slate-200">
                                {e.debit > 0
                                  ? `₹${e.debit.toLocaleString("en-IN", {
                                      minimumFractionDigits: 2,
                                    })}`
                                  : "-"}
                              </td>
                              <td className="px-4 py-2 text-right text-emerald-600 font-medium">
                                {e.credit > 0
                                  ? `₹${e.credit.toLocaleString("en-IN", {
                                      minimumFractionDigits: 2,
                                    })}`
                                  : "-"}
                              </td>
                              <td className="px-4 py-2 text-right font-bold text-slate-900 dark:text-slate-100">
                                ₹{e.running_balance.toLocaleString("en-IN", {
                                  minimumFractionDigits: 2,
                                })}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* ========================================================= */}
          {/* Tab 3: Disbursal Register                                  */}
          {/* ========================================================= */}
          <TabsContent value="payments" className="space-y-6 pt-4">
            <Card className="overflow-hidden">
              <div className="p-4 border-b bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between">
                <span className="font-semibold text-xs text-slate-600 dark:text-slate-300 uppercase">
                  Supplier Disbursal Register
                </span>
                <span className="text-xs text-slate-500">
                  Total Disbursed: ₹
                  {paymentsList
                    .reduce((acc, p) => acc + Number(p.amount || 0), 0)
                    .toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase">
                    <tr>
                      <th className="px-4 py-2.5">Date</th>
                      <th className="px-4 py-2.5">Payment Ref</th>
                      <th className="px-4 py-2.5">Supplier</th>
                      <th className="px-4 py-2.5">Method</th>
                      <th className="px-4 py-2.5">Bank / UTR</th>
                      <th className="px-4 py-2.5 text-right">Amount (₹)</th>
                      <th className="px-4 py-2.5 text-right">Allocated</th>
                      <th className="px-4 py-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {paymentsList.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-2 text-slate-600">{p.payment_date}</td>
                        <td className="px-4 py-2 font-mono font-medium">
                          {p.payment_reference}
                        </td>
                        <td className="px-4 py-2 font-medium">{p.supplier_name || "-"}</td>
                        <td className="px-4 py-2">
                          <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-semibold text-[10px]">
                            {p.payment_method}
                          </span>
                        </td>
                        <td className="px-4 py-2 font-mono text-slate-500">
                          {p.transaction_reference || p.bank_name || "-"}
                        </td>
                        <td className="px-4 py-2 text-right font-bold text-slate-900 dark:text-slate-100">
                          ₹{Number(p.amount || 0).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-4 py-2 text-right text-emerald-600">
                          ₹{Number(p.allocated_amount || 0).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <StatusBadge status={p.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* ========================================================= */}
          {/* Tab 4: Finance Audit Trail                                 */}
          {/* ========================================================= */}
          <TabsContent value="audit" className="space-y-6 pt-4">
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl border">
              <div className="flex items-center gap-3">
                <History className="h-5 w-5 text-indigo-600" />
                <div>
                  <h3 className="text-sm font-semibold">Authoritative Financial Audit Trail</h3>
                  <p className="text-xs text-slate-500">
                    Immutable event log of approvals, disbursements, matches, and state transitions
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Select value={auditFilterType} onValueChange={setAuditFilterType}>
                  <SelectTrigger className="h-8 text-xs w-40">
                    <SelectValue placeholder="Entity Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Entity Types</SelectItem>
                    <SelectItem value="PURCHASE_ORDER">Purchase Orders</SelectItem>
                    <SelectItem value="INVOICE">Invoices</SelectItem>
                    <SelectItem value="PAYMENT">Payments</SelectItem>
                    <SelectItem value="BUDGET">Budgets</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={loadAudit}
                  disabled={loadingAudit}
                  className="h-8 text-xs"
                >
                  <RefreshCw className={cn("h-3 w-3 mr-1", loadingAudit && "animate-spin")} />
                  Refresh
                </Button>
              </div>
            </div>

            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase">
                    <tr>
                      <th className="px-4 py-2.5">Timestamp</th>
                      <th className="px-4 py-2.5">Action</th>
                      <th className="px-4 py-2.5">Entity</th>
                      <th className="px-4 py-2.5">Actor</th>
                      <th className="px-4 py-2.5">Transition</th>
                      <th className="px-4 py-2.5 text-right">Amount (₹)</th>
                      <th className="px-4 py-2.5">Audit Justification / Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {auditEvents.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-slate-400">
                          No audit events recorded matching criteria.
                        </td>
                      </tr>
                    ) : (
                      auditEvents.map((ev) => (
                        <tr key={ev.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-2 text-slate-500 whitespace-nowrap">
                            {new Date(ev.created_at).toLocaleString()}
                          </td>
                          <td className="px-4 py-2 font-mono font-semibold text-slate-800 dark:text-slate-200">
                            {ev.action}
                          </td>
                          <td className="px-4 py-2">
                            <span className="font-semibold">{ev.entity_type}:</span>{" "}
                            <span className="font-mono">{ev.entity_number}</span>
                          </td>
                          <td className="px-4 py-2">
                            <div className="font-medium">{ev.user_username}</div>
                            <div className="text-[10px] text-slate-400">{ev.user_role}</div>
                          </td>
                          <td className="px-4 py-2">
                            {ev.previous_status || ev.new_status ? (
                              <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                                <span className="text-slate-400">{ev.previous_status || "-"}</span>
                                <span>→</span>
                                <span className="text-indigo-600 font-semibold">
                                  {ev.new_status}
                                </span>
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="px-4 py-2 text-right font-medium">
                            {ev.financial_amount
                              ? `₹${Number(ev.financial_amount).toLocaleString("en-IN", {
                                  minimumFractionDigits: 2,
                                })}`
                              : "-"}
                          </td>
                          <td className="px-4 py-2 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                            {ev.notes || "-"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
