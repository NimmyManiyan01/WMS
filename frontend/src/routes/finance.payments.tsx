import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CreditCard,
  Search,
  Filter,
  PlusCircle,
  Loader2,
  Calendar,
  Building2,
  FileText,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Split,
  Sparkles,
  Layers,
  ArrowUpRight,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/finance/payments")({
  component: PaymentsPage,
});

function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState("ALL");
  const [selectedMethod, setSelectedMethod] = useState("ALL");

  // Record Payment Dialog State
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [supplierInvoices, setSupplierInvoices] = useState<any[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  // New Payment Form Fields
  const [formSupplierId, setFormSupplierId] = useState("");
  const [formPaymentDate, setFormPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [formAmount, setFormAmount] = useState<string>("");
  const [formMethod, setFormMethod] = useState("NEFT");
  const [formTxnRef, setFormTxnRef] = useState("");
  const [formBankRef, setFormBankRef] = useState("");
  const [formBankName, setFormBankName] = useState("");
  const [formNotes, setFormNotes] = useState("");
  // Invoice allocations: map of invoice_id -> allocated amount
  const [allocations, setAllocations] = useState<{ [invoiceId: string]: string }>({});

  // View Details Modal
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [pmtsRes, supsRes] = await Promise.all([
        api.listPayments(),
        api.listSuppliers().catch(() => []),
      ]);
      setPayments(pmtsRes || []);
      setSuppliers(supsRes || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load payments");
    } finally {
      setLoading(false);
    }
  };

  // When supplier is selected in payment dialog, fetch their unpaid / approved invoices
  const handleSupplierChange = async (supId: string) => {
    setFormSupplierId(supId);
    setAllocations({});
    if (!supId) {
      setSupplierInvoices([]);
      return;
    }

    try {
      setLoadingInvoices(true);
      const allInvoices = await api.listSupplierInvoices({ supplier_id: supId });
      // Filter to invoices that have an outstanding amount > 0 and status is APPROVED or PARTIALLY_PAID
      const eligible = (allInvoices || []).filter(
        (inv: any) =>
          Number(inv.outstanding_amount || 0) > 0 &&
          (inv.status === "APPROVED" ||
            inv.status === "PARTIALLY_PAID" ||
            inv.status === "MATCHED")
      );
      // Sort oldest due date first
      eligible.sort(
        (a: any, b: any) =>
          new Date(a.due_date || a.invoice_date).getTime() -
          new Date(b.due_date || b.invoice_date).getTime()
      );
      setSupplierInvoices(eligible);
    } catch (err: any) {
      toast.error(err.message || "Failed to load supplier invoices");
      setSupplierInvoices([]);
    } finally {
      setLoadingInvoices(false);
    }
  };

  // Auto Allocate using FIFO (First-In, First-Out)
  const handleAutoAllocate = () => {
    const totalPay = parseFloat(formAmount) || 0;
    if (totalPay <= 0) {
      toast.error("Please enter a valid payment amount first");
      return;
    }

    let remaining = totalPay;
    const newAllocs: { [invoiceId: string]: string } = {};

    for (const inv of supplierInvoices) {
      if (remaining <= 0) break;
      const outstanding = Number(inv.outstanding_amount || 0);
      if (outstanding <= 0) continue;

      const toAllocate = Math.min(outstanding, remaining);
      newAllocs[inv.id] = toAllocate.toFixed(2);
      remaining -= toAllocate;
    }

    setAllocations(newAllocs);
    toast.success("Auto-allocated payment amount against oldest invoices");
  };

  const handleAllocationInput = (invoiceId: string, value: string) => {
    setAllocations((prev) => ({
      ...prev,
      [invoiceId]: value,
    }));
  };

  const totalAllocated = Object.values(allocations).reduce(
    (acc, val) => acc + (parseFloat(val) || 0),
    0
  );
  const paymentAmountNum = parseFloat(formAmount) || 0;
  const unallocatedAmount = Math.max(0, paymentAmountNum - totalAllocated);

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSupplierId) {
      toast.error("Please select a supplier");
      return;
    }
    if (!formAmount || paymentAmountNum <= 0) {
      toast.error("Payment amount must be greater than zero");
      return;
    }
    if (totalAllocated > paymentAmountNum + 0.001) {
      toast.error(
        `Total allocated (₹${totalAllocated.toFixed(2)}) exceeds payment amount (₹${paymentAmountNum.toFixed(2)})`
      );
      return;
    }

    // Build allocation payload
    const allocationList: any[] = [];
    for (const [invId, amtStr] of Object.entries(allocations)) {
      const amt = parseFloat(amtStr);
      if (amt > 0) {
        // Validate against outstanding
        const inv = supplierInvoices.find((i) => i.id === invId);
        if (inv && amt > Number(inv.outstanding_amount || 0) + 0.001) {
          toast.error(
            `Allocation for invoice ${inv.invoice_number} exceeds outstanding balance`
          );
          return;
        }
        allocationList.push({
          invoice_id: invId,
          allocated_amount: amt,
          notes: `Settlement via ${formMethod}`,
        });
      }
    }

    try {
      setSubmitting(true);
      await api.createPayment({
        supplier_id: formSupplierId,
        payment_date: formPaymentDate,
        amount: paymentAmountNum,
        currency: "INR",
        payment_method: formMethod,
        transaction_reference: formTxnRef || undefined,
        bank_reference: formBankRef || undefined,
        bank_name: formBankName || undefined,
        notes: formNotes || undefined,
        allocations: allocationList,
      });

      toast.success("Payment recorded and allocated successfully");
      setIsRecordOpen(false);
      resetForm();
      loadInitialData();
    } catch (err: any) {
      toast.error(err.message || "Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormSupplierId("");
    setFormAmount("");
    setFormTxnRef("");
    setFormBankRef("");
    setFormBankName("");
    setFormNotes("");
    setAllocations({});
    setSupplierInvoices([]);
  };

  const getSupplierName = (id: string) => {
    const s = suppliers.find((sup) => sup.id === id);
    return s ? s.name : "Supplier";
  };

  const filteredPayments = payments.filter((p) => {
    const supName = (p.supplier_name || getSupplierName(p.supplier_id)).toLowerCase();
    const ref = (p.payment_reference || "").toLowerCase();
    const txn = (p.transaction_reference || "").toLowerCase();
    const q = search.toLowerCase();

    const matchesSearch =
      !q || supName.includes(q) || ref.includes(q) || txn.includes(q);
    const matchesSupplier =
      selectedSupplier === "ALL" || p.supplier_id === selectedSupplier;
    const matchesMethod =
      selectedMethod === "ALL" || p.payment_method === selectedMethod;

    return matchesSearch && matchesSupplier && matchesMethod;
  });

  const totalDisbursed = payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const totalAllocatedAll = payments.reduce(
    (acc, p) => acc + Number(p.allocated_amount || 0),
    0
  );
  const totalUnallocatedAll = payments.reduce(
    (acc, p) => acc + Number(p.unallocated_amount || 0),
    0
  );

  return (
    <AppShell
      title="Payments & Disbursals"
      subtitle="Execute supplier disbursements, track payment methods, and manage multi-invoice allocations"
    >
      <div className="space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-indigo-600 bg-white dark:bg-slate-900">
            <CardHeader className="p-4 pb-1">
              <CardTitle className="text-xs font-semibold uppercase text-slate-500 flex justify-between items-center">
                Total Disbursed
                <CreditCard className="h-4 w-4 text-indigo-500" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                ₹{totalDisbursed.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-slate-500 mt-1">{payments.length} transactions executed</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-600 bg-white dark:bg-slate-900">
            <CardHeader className="p-4 pb-1">
              <CardTitle className="text-xs font-semibold uppercase text-slate-500 flex justify-between items-center">
                Allocated to Invoices
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                ₹{totalAllocatedAll.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-slate-500 mt-1">Matched directly against AP debt</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-600 bg-white dark:bg-slate-900">
            <CardHeader className="p-4 pb-1">
              <CardTitle className="text-xs font-semibold uppercase text-slate-500 flex justify-between items-center">
                Unallocated Advance / Credit
                <DollarSign className="h-4 w-4 text-amber-500" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                ₹{totalUnallocatedAll.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-slate-500 mt-1">Available for future invoices</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-slate-700 bg-white dark:bg-slate-900">
            <CardHeader className="p-4 pb-1">
              <CardTitle className="text-xs font-semibold uppercase text-slate-500 flex justify-between items-center">
                Actions & Shortcuts
                <ArrowUpRight className="h-4 w-4 text-slate-400" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <Button
                onClick={() => {
                  resetForm();
                  setIsRecordOpen(true);
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 h-9"
              >
                <PlusCircle className="h-4 w-4" />
                Record Disbursal
              </Button>
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
                  placeholder="Search by payment ref, supplier, or transaction id..."
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

              <div className="w-40">
                <Select value={selectedMethod} onValueChange={setSelectedMethod}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Methods</SelectItem>
                    <SelectItem value="NEFT">NEFT</SelectItem>
                    <SelectItem value="RTGS">RTGS</SelectItem>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="CHEQUE">Cheque</SelectItem>
                    <SelectItem value="WIRE">Wire Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={loadInitialData}
              disabled={loading}
              className="h-9"
            >
              <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </Card>

        {/* Payments Table */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-xs uppercase font-medium border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3">Payment Ref</th>
                  <th className="px-5 py-3">Supplier</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Method</th>
                  <th className="px-5 py-3">Bank / Txn Ref</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3 text-right">Allocated</th>
                  <th className="px-5 py-3 text-right">Unallocated</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-500">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-500 mb-2" />
                      Loading payments history...
                    </td>
                  </tr>
                ) : filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-500">
                      <CreditCard className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                      No payment records found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((p) => {
                    const supName = p.supplier_name || getSupplierName(p.supplier_id);
                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="px-5 py-3 font-semibold text-slate-900 dark:text-slate-100">
                          <span className="font-mono text-xs">{p.payment_reference}</span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="font-medium text-slate-800 dark:text-slate-200">
                            {supName}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-slate-600 dark:text-slate-400">
                          {p.payment_date}
                        </td>
                        <td className="px-5 py-3">
                          <span className="inline-flex px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {p.payment_method}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs text-slate-600 dark:text-slate-400">
                          <div>{p.bank_name || "-"}</div>
                          <div className="font-mono text-[11px] text-slate-500">
                            {p.transaction_reference || p.bank_reference || "-"}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-right font-bold text-slate-900 dark:text-slate-100">
                          ₹{Number(p.amount || 0).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-5 py-3 text-right text-emerald-600 dark:text-emerald-400 font-medium">
                          ₹{Number(p.allocated_amount || 0).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-5 py-3 text-right text-slate-500 font-medium">
                          ₹{Number(p.unallocated_amount || 0).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <StatusBadge status={p.status} />
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2 text-xs gap-1"
                            onClick={() => setSelectedPayment(p)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                            Allocations ({p.allocations?.length || 0})
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Record Payment Dialog */}
        <Dialog open={isRecordOpen} onOpenChange={setIsRecordOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-indigo-600" />
                Record Supplier Payment & Allocation
              </DialogTitle>
              <DialogDescription>
                Post an authoritative banking disbursal and link it directly against
                outstanding approved supplier invoices.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-5">
              {/* Supplier & Basics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Supplier *</Label>
                  <Select
                    value={formSupplierId}
                    onValueChange={handleSupplierChange}
                    required
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Payment Date *</Label>
                  <Input
                    type="date"
                    value={formPaymentDate}
                    onChange={(e) => setFormPaymentDate(e.target.value)}
                    required
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Payment Amount (₹) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    required
                    className="h-9 text-sm font-semibold"
                  />
                </div>
              </div>

              {/* Banking & Method details */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Payment Method *</Label>
                  <Select value={formMethod} onValueChange={setFormMethod}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NEFT">NEFT</SelectItem>
                      <SelectItem value="RTGS">RTGS</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="CHEQUE">Cheque</SelectItem>
                      <SelectItem value="WIRE">Wire Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Transaction / UTR #</Label>
                  <Input
                    placeholder="e.g. UTR12345678"
                    value={formTxnRef}
                    onChange={(e) => setFormTxnRef(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Bank Name</Label>
                  <Input
                    placeholder="e.g. HDFC Bank"
                    value={formBankName}
                    onChange={(e) => setFormBankName(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Bank Ref / Cheque #</Label>
                  <Input
                    placeholder="Bank reference"
                    value={formBankRef}
                    onChange={(e) => setFormBankRef(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Disbursal Notes</Label>
                <Input
                  placeholder="Optional notes or remittance reference"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              {/* Multi-Invoice Allocation Section */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Split className="h-4 w-4 text-indigo-600" />
                      Invoice Settlement Allocation
                    </h4>
                    <p className="text-xs text-slate-500">
                      Allocate this disbursal across eligible outstanding invoices
                    </p>
                  </div>

                  {supplierInvoices.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAutoAllocate}
                      className="gap-1.5 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Auto-Allocate (FIFO)
                    </Button>
                  )}
                </div>

                {loadingInvoices ? (
                  <div className="py-6 text-center text-slate-500 text-xs">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-indigo-500 mb-1" />
                    Loading supplier payables...
                  </div>
                ) : !formSupplierId ? (
                  <div className="py-6 text-center text-slate-400 text-xs">
                    Select a supplier above to view open invoices available for allocation.
                  </div>
                ) : supplierInvoices.length === 0 ? (
                  <div className="py-6 text-center text-slate-500 text-xs">
                    This supplier has no outstanding approved invoices. Any disbursal will
                    be recorded as unallocated advance credit.
                  </div>
                ) : (
                  <div className="border rounded bg-white dark:bg-slate-900 overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                        <tr>
                          <th className="px-3 py-2">Invoice #</th>
                          <th className="px-3 py-2">Due Date</th>
                          <th className="px-3 py-2 text-right">Grand Total</th>
                          <th className="px-3 py-2 text-right">Outstanding</th>
                          <th className="px-3 py-2 text-right w-44">Allocate (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {supplierInvoices.map((inv) => {
                          const outstanding = Number(inv.outstanding_amount || 0);
                          const allocVal = allocations[inv.id] || "";
                          return (
                            <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="px-3 py-2 font-medium">
                                {inv.invoice_number}
                              </td>
                              <td className="px-3 py-2 text-slate-500">
                                {inv.due_date || inv.invoice_date}
                              </td>
                              <td className="px-3 py-2 text-right text-slate-600">
                                ₹{Number(inv.grand_total || 0).toLocaleString("en-IN", {
                                  minimumFractionDigits: 2,
                                })}
                              </td>
                              <td className="px-3 py-2 text-right font-semibold text-slate-800 dark:text-slate-200">
                                ₹{outstanding.toLocaleString("en-IN", {
                                  minimumFractionDigits: 2,
                                })}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max={outstanding}
                                    placeholder="0.00"
                                    value={allocVal}
                                    onChange={(e) =>
                                      handleAllocationInput(inv.id, e.target.value)
                                    }
                                    className="h-7 w-28 text-right text-xs"
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-1 text-[10px] text-indigo-600"
                                    onClick={() =>
                                      handleAllocationInput(
                                        inv.id,
                                        outstanding.toFixed(2)
                                      )
                                    }
                                  >
                                    Max
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Allocation Summary Bar */}
                <div className="flex items-center justify-between bg-indigo-50/70 dark:bg-indigo-950/40 p-3 rounded border border-indigo-100 dark:border-indigo-900 text-xs font-medium">
                  <div className="flex items-center gap-4">
                    <span>
                      Payment Amount:{" "}
                      <strong className="text-slate-900 dark:text-slate-100">
                        ₹{paymentAmountNum.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </strong>
                    </span>
                    <span>
                      Allocated:{" "}
                      <strong className="text-emerald-700 dark:text-emerald-400">
                        ₹{totalAllocated.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </strong>
                    </span>
                    <span>
                      Unallocated:{" "}
                      <strong className="text-amber-700 dark:text-amber-400">
                        ₹{unallocatedAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </strong>
                    </span>
                  </div>
                  {totalAllocated > paymentAmountNum + 0.001 && (
                    <span className="text-rose-600 font-semibold flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Allocation exceeds payment amount!
                    </span>
                  )}
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsRecordOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || totalAllocated > paymentAmountNum + 0.001}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Recording...
                    </>
                  ) : (
                    "Record & Settle"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* View Payment Details & Allocations Dialog */}
        <Dialog
          open={!!selectedPayment}
          onOpenChange={(open) => !open && setSelectedPayment(null)}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Payment Details: {selectedPayment?.payment_reference}</span>
                {selectedPayment && <StatusBadge status={selectedPayment.status} />}
              </DialogTitle>
              <DialogDescription>
                Disbursed to{" "}
                <strong>
                  {selectedPayment?.supplier_name ||
                    (selectedPayment && getSupplierName(selectedPayment.supplier_id))}
                </strong>{" "}
                on {selectedPayment?.payment_date}
              </DialogDescription>
            </DialogHeader>

            {selectedPayment && (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded border text-xs">
                  <div>
                    <span className="text-slate-500 block">Total Amount</span>
                    <strong className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      ₹{Number(selectedPayment.amount || 0).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Allocated</span>
                    <strong className="text-sm font-bold text-emerald-600">
                      ₹{Number(selectedPayment.allocated_amount || 0).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Unallocated</span>
                    <strong className="text-sm font-bold text-amber-600">
                      ₹{Number(selectedPayment.unallocated_amount || 0).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </strong>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">Method:</span>{" "}
                    <strong className="font-semibold">{selectedPayment.payment_method}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Bank Name:</span>{" "}
                    <strong>{selectedPayment.bank_name || "-"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Transaction Ref:</span>{" "}
                    <strong className="font-mono">{selectedPayment.transaction_reference || "-"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Recorded By:</span>{" "}
                    <strong>{selectedPayment.created_by}</strong>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase text-slate-500 mb-2">
                    Settled Invoice Allocations
                  </h4>
                  {selectedPayment.allocations?.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">
                      No invoices currently allocated to this disbursal.
                    </p>
                  ) : (
                    <div className="border rounded overflow-hidden">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                          <tr>
                            <th className="px-3 py-2">Invoice ID</th>
                            <th className="px-3 py-2 text-right">Settled Amount</th>
                            <th className="px-3 py-2">Settlement Notes</th>
                            <th className="px-3 py-2 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {selectedPayment.allocations.map((al: any) => (
                            <tr key={al.id}>
                              <td className="px-3 py-2 font-mono">
                                {al.invoice_number || al.invoice_id.slice(0, 12)}...
                              </td>
                              <td className="px-3 py-2 text-right font-semibold text-emerald-600">
                                ₹{Number(al.allocated_amount).toLocaleString("en-IN", {
                                  minimumFractionDigits: 2,
                                })}
                              </td>
                              <td className="px-3 py-2 text-slate-500">{al.notes || "-"}</td>
                              <td className="px-3 py-2 text-right">
                                <Link
                                  to={`/finance/invoices/${al.invoice_id}` as any}
                                  className="text-indigo-600 hover:underline inline-flex items-center gap-1"
                                >
                                  View Invoice
                                  <ArrowRight className="h-3 w-3" />
                                </Link>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedPayment(null)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
