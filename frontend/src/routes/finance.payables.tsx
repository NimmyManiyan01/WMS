import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CreditCard,
  Search,
  Filter,
  Calendar,
  Building2,
  FileText,
  AlertCircle,
  Clock,
  ArrowUpRight,
  RefreshCw,
  Eye,
  DollarSign,
  TrendingDown,
  ShieldCheck,
  CalendarDays,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { AppShell, StatusBadge } from "@/components/wms/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/finance/payables")({
  component: AccountsPayablePage,
});

function AccountsPayablePage() {
  const navigate = useNavigate();
  const [agingData, setAgingData] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [asOfDate, setAsOfDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [search, setSearch] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("ALL");
  const [selectedBucket, setSelectedBucket] = useState("ALL");

  useEffect(() => {
    loadData();
  }, [asOfDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [agingRes, supRes] = await Promise.all([
        api.getApAging(asOfDate),
        api.listSuppliers().catch(() => []),
      ]);
      setAgingData(agingRes);
      setSuppliers(supRes || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load AP aging data");
    } finally {
      setLoading(false);
    }
  };

  const getSupplierName = (supplierId: string) => {
    const s = suppliers.find((sup) => sup.id === supplierId);
    return s ? s.name : "Supplier";
  };

  const filteredInvoices = (agingData?.invoices || []).filter((inv: any) => {
    const supName = getSupplierName(inv.supplier_id).toLowerCase();
    const invNum = (inv.invoice_number || "").toLowerCase();
    const q = search.toLowerCase();
    const matchesSearch = !q || supName.includes(q) || invNum.includes(q);

    const matchesSupplier =
      selectedSupplier === "ALL" || inv.supplier_id === selectedSupplier;

    const matchesBucket =
      selectedBucket === "ALL" || inv.bucket === selectedBucket;

    return matchesSearch && matchesSupplier && matchesBucket;
  });

  const buckets = agingData?.buckets || [];
  const currentBucket = buckets.find((b: any) => b.bucket_label?.includes("0-30")) || {
    total_amount: 0,
    invoice_count: 0,
  };
  const b3160 = buckets.find((b: any) => b.bucket_label?.includes("31-60")) || {
    total_amount: 0,
    invoice_count: 0,
  };
  const b6190 = buckets.find((b: any) => b.bucket_label?.includes("61-90")) || {
    total_amount: 0,
    invoice_count: 0,
  };
  const over90 = buckets.find((b: any) => b.bucket_label?.includes("90+")) || {
    total_amount: 0,
    invoice_count: 0,
  };

  return (
    <AppShell
      title="Accounts Payable (AP)"
      subtitle="Track outstanding supplier obligations, aging schedules, and upcoming payment maturities"
    >
      <div className="space-y-6">
        {/* Top bar with As of Date and Quick Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Aging Calculation Basis
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <Input
                  type="date"
                  value={asOfDate}
                  onChange={(e) => setAsOfDate(e.target.value)}
                  className="h-8 w-40 text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadData}
                  disabled={loading}
                  className="h-8"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5 mr-1", loading && "animate-spin")} />
                  Recalculate
                </Button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => navigate({ to: "/finance/reports" as any })}
            >
              <FileText className="h-4 w-4" />
              Full AP Report
            </Button>
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5"
              onClick={() => navigate({ to: "/finance/payments" as any })}
            >
              <CreditCard className="h-4 w-4" />
              Record Payment
            </Button>
          </div>
        </div>

        {/* AP Aging Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="border-l-4 border-l-slate-900 dark:border-l-slate-100 bg-white dark:bg-slate-900">
            <CardHeader className="p-4 pb-1">
              <CardTitle className="text-xs font-semibold uppercase text-slate-500 flex justify-between items-center">
                Total AP Outstanding
                <DollarSign className="h-4 w-4 text-slate-400" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                ₹{(agingData?.total_outstanding || 0).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {(agingData?.invoices || []).length} active payables
              </p>
            </CardContent>
          </Card>

          <Card
            className={cn(
              "border-l-4 border-l-emerald-500 cursor-pointer transition hover:shadow-md",
              selectedBucket === "0-30 Days" && "ring-2 ring-emerald-500"
            )}
            onClick={() =>
              setSelectedBucket(selectedBucket === "0-30 Days" ? "ALL" : "0-30 Days")
            }
          >
            <CardHeader className="p-4 pb-1">
              <CardTitle className="text-xs font-semibold uppercase text-emerald-700 dark:text-emerald-400 flex justify-between items-center">
                0-30 Days (Current)
                <Clock className="h-4 w-4 text-emerald-500" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
                ₹{(currentBucket.total_amount || 0).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {currentBucket.invoice_count || 0} invoices on schedule
              </p>
            </CardContent>
          </Card>

          <Card
            className={cn(
              "border-l-4 border-l-amber-500 cursor-pointer transition hover:shadow-md",
              selectedBucket === "31-60 Days" && "ring-2 ring-amber-500"
            )}
            onClick={() =>
              setSelectedBucket(selectedBucket === "31-60 Days" ? "ALL" : "31-60 Days")
            }
          >
            <CardHeader className="p-4 pb-1">
              <CardTitle className="text-xs font-semibold uppercase text-amber-700 dark:text-amber-400 flex justify-between items-center">
                31-60 Days Past Due
                <AlertCircle className="h-4 w-4 text-amber-500" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
                ₹{(b3160.total_amount || 0).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {b3160.invoice_count || 0} overdue invoices
              </p>
            </CardContent>
          </Card>

          <Card
            className={cn(
              "border-l-4 border-l-orange-500 cursor-pointer transition hover:shadow-md",
              selectedBucket === "61-90 Days" && "ring-2 ring-orange-500"
            )}
            onClick={() =>
              setSelectedBucket(selectedBucket === "61-90 Days" ? "ALL" : "61-90 Days")
            }
          >
            <CardHeader className="p-4 pb-1">
              <CardTitle className="text-xs font-semibold uppercase text-orange-700 dark:text-orange-400 flex justify-between items-center">
                61-90 Days Past Due
                <AlertCircle className="h-4 w-4 text-orange-500" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
                ₹{(b6190.total_amount || 0).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {b6190.invoice_count || 0} aging invoices
              </p>
            </CardContent>
          </Card>

          <Card
            className={cn(
              "border-l-4 border-l-rose-500 cursor-pointer transition hover:shadow-md",
              selectedBucket === "90+ Days" && "ring-2 ring-rose-500"
            )}
            onClick={() =>
              setSelectedBucket(selectedBucket === "90+ Days" ? "ALL" : "90+ Days")
            }
          >
            <CardHeader className="p-4 pb-1">
              <CardTitle className="text-xs font-semibold uppercase text-rose-700 dark:text-rose-400 flex justify-between items-center">
                90+ Days Critical
                <AlertCircle className="h-4 w-4 text-rose-500" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
                ₹{(over90.total_amount || 0).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {over90.invoice_count || 0} high risk payables
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filter bar */}
        <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex flex-1 items-center gap-3 w-full">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by invoice number or supplier..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>

              <div className="w-56">
                <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="All Suppliers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Suppliers</SelectItem>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-44">
                <Select value={selectedBucket} onValueChange={setSelectedBucket}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Aging Bucket" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Buckets</SelectItem>
                    <SelectItem value="0-30 Days">0-30 Days (Current)</SelectItem>
                    <SelectItem value="31-60 Days">31-60 Days</SelectItem>
                    <SelectItem value="61-90 Days">61-90 Days</SelectItem>
                    <SelectItem value="90+ Days">90+ Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(search || selectedSupplier !== "ALL" || selectedBucket !== "ALL") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setSelectedSupplier("ALL");
                  setSelectedBucket("ALL");
                }}
                className="text-xs text-slate-500 h-9"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </Card>

        {/* Invoices List Table */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-xs uppercase font-medium border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3">Invoice Ref</th>
                  <th className="px-5 py-3">Supplier</th>
                  <th className="px-5 py-3">Invoice Date</th>
                  <th className="px-5 py-3">Due Date</th>
                  <th className="px-5 py-3 text-right">Grand Total</th>
                  <th className="px-5 py-3 text-right">Outstanding</th>
                  <th className="px-5 py-3 text-center">Aging Bucket</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-500">
                      <RefreshCw className="h-6 w-6 animate-spin mx-auto text-indigo-500 mb-2" />
                      Loading payables schedule...
                    </td>
                  </tr>
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-500">
                      <ShieldCheck className="h-8 w-8 mx-auto text-emerald-500 mb-2" />
                      No outstanding payables match your filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv: any) => {
                    const isOverdue = inv.days_overdue > 0;
                    return (
                      <tr
                        key={inv.invoice_id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="px-5 py-3 font-semibold text-slate-900 dark:text-slate-100">
                          <Link
                            to={`/finance/invoices/${inv.invoice_id}` as any}
                            className="text-indigo-600 hover:underline flex items-center gap-1.5"
                          >
                            <FileText className="h-4 w-4 text-slate-400" />
                            {inv.invoice_number}
                          </Link>
                        </td>
                        <td className="px-5 py-3">
                          <div className="font-medium text-slate-800 dark:text-slate-200">
                            {getSupplierName(inv.supplier_id)}
                          </div>
                          <div className="text-xs text-slate-400">
                            ID: {inv.supplier_id.slice(0, 8)}...
                          </div>
                        </td>
                        <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                          {inv.invoice_date}
                        </td>
                        <td className="px-5 py-3">
                          <div className="text-slate-700 dark:text-slate-300 font-medium">
                            {inv.due_date}
                          </div>
                          {isOverdue ? (
                            <span className="inline-flex items-center text-xs font-semibold text-rose-600 dark:text-rose-400">
                              {inv.days_overdue} days overdue
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-xs text-emerald-600 dark:text-emerald-400">
                              Current
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right font-medium text-slate-700 dark:text-slate-300">
                          ₹{inv.grand_total.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-5 py-3 text-right font-bold text-slate-900 dark:text-slate-100">
                          ₹{inv.outstanding_amount.toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span
                            className={cn(
                              "inline-flex px-2 py-0.5 rounded-full text-xs font-medium",
                              inv.bucket === "0-30 Days"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
                                : inv.bucket === "31-60 Days"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300"
                                : inv.bucket === "61-90 Days"
                                ? "bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300"
                                : "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300"
                            )}
                          >
                            {inv.bucket}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          <StatusBadge status={inv.status} />
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 px-2.5 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                              onClick={() =>
                                navigate({
                                  to: `/finance/invoices/${inv.invoice_id}` as any,
                                })
                              }
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              className="h-8 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() =>
                                navigate({
                                  to: `/finance/payments` as any,
                                })
                              }
                            >
                              <CreditCard className="h-3.5 w-3.5 mr-1" />
                              Pay
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
