import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Receipt,
  Search,
  Filter,
  PlusCircle,
  Loader2,
  Calendar,
  Building2,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  RefreshCw,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Layers,
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
import { requireRole } from "@/lib/auth-utils";

export const Route = createFileRoute("/finance/invoices/")({
  beforeLoad: () => requireRole("FINANCE"),
  component: InvoicesList,
});

function InvoicesList() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [matchStatusFilter, setMatchStatusFilter] = useState("ALL");
  const [supplierFilter, setSupplierFilter] = useState("ALL");
  const [poFilter, setPoFilter] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Create Invoice Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [pos, setPos] = useState<any[]>([]);
  const [formData, setFormData] = useState<any>({
    supplier_id: "",
    po_id: "",
    invoice_number: "",
    invoice_date: new Date().toISOString().split("T")[0],
    due_date: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
    payment_terms: "Net 30",
    freight_charges: 0,
    other_charges: 0,
    notes: "",
    items: [],
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invData, suppData, posData] = await Promise.all([
        api.listSupplierInvoices({
          status: statusFilter !== "ALL" ? statusFilter : undefined,
          match_status: matchStatusFilter !== "ALL" ? matchStatusFilter : undefined,
          supplier_id: supplierFilter !== "ALL" ? supplierFilter : undefined,
          search: search || undefined,
          limit: 100,
        }),
        api.getSuppliers().catch(() => []),
        api.getPurchaseOrders().catch(() => []),
      ]);
      setInvoices(invData || []);
      setSuppliers(suppData || []);
      setPos(posData || []);
    } catch (e: any) {
      toast.error("Failed to load invoices: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, matchStatusFilter, supplierFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const handlePoChange = async (val: string) => {
    if (val === "none" || !val) {
      setFormData((prev: any) => ({ ...prev, po_id: "" }));
      return;
    }
    const selectedPo = pos.find((p) => p.id === val);
    let autoItems: any[] = [];
    try {
      const fullPo = await api.getPurchaseOrder(val);
      if (fullPo?.items && fullPo.items.length > 0) {
        autoItems = fullPo.items.map((it: any) => ({
          material_code: it.itemCode || it.item_code || it.material_code || "",
          material_name: it.materialName || it.material_name || "",
          quantity: Number(it.quantity || 1),
          uom: it.uom || "PCS",
          unit_price: Number(it.unitPrice || it.unit_price || 0),
          tax: Number(it.taxRate || it.tax || 18),
        }));
      }
    } catch {
      // fallback
    }

    setFormData((prev: any) => ({
      ...prev,
      po_id: val,
      supplier_id: selectedPo?.supplierId || selectedPo?.supplier_id || prev.supplier_id,
      items: autoItems.length > 0 ? autoItems : prev.items,
    }));
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          material_code: "",
          material_name: "",
          quantity: 1,
          uom: "PCS",
          unit_price: 0,
          tax: 18,
        },
      ],
    });
  };

  const handleRemoveItem = (idx: number) => {
    const next = [...formData.items];
    next.splice(idx, 1);
    setFormData({ ...formData, items: next });
  };

  const handleItemChange = (idx: number, field: string, val: any) => {
    const next = [...formData.items];
    next[idx] = { ...next[idx], [field]: val };
    setFormData({ ...formData, items: next });
  };

  const handleCreateSubmit = async () => {
    if (!formData.supplier_id) {
      toast.error("Please select a supplier");
      return;
    }
    if (!formData.invoice_number.trim()) {
      toast.error("Please enter an invoice number");
      return;
    }
    if (formData.items.length === 0) {
      toast.error("Please add at least one line item");
      return;
    }

    try {
      setCreating(true);
      const payload = {
        ...formData,
        po_id: formData.po_id || undefined,
        freight_charges: Number(formData.freight_charges || 0),
        other_charges: Number(formData.other_charges || 0),
        items: formData.items.map((it: any) => ({
          material_code: it.material_code,
          material_name: it.material_name,
          quantity: Number(it.quantity),
          unit_price: Number(it.unit_price),
          uom: it.uom || "PCS",
          tax: Number(it.tax || 0),
        })),
      };

      await api.createSupplierInvoice(payload);
      toast.success("Supplier invoice created successfully!");
      setIsCreateOpen(false);
      await fetchData();
    } catch (e: any) {
      toast.error("Failed to create invoice: " + e.message);
    } finally {
      setCreating(false);
    }
  };

  // Filter invoices by PO filter on frontend if typed
  const filteredInvoices = invoices.filter((inv) => {
    if (poFilter.trim()) {
      const pNum = String(inv.po_number || "").toLowerCase();
      if (!pNum.includes(poFilter.toLowerCase().trim())) return false;
    }
    return true;
  });

  // Client pagination
  const totalPages = Math.ceil(filteredInvoices.length / pageSize) || 1;
  const paginatedInvoices = filteredInvoices.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  return (
    <AppShell
      title="Supplier Invoices"
      subtitle="Accounts Payable Invoice Management & Matching Queue"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl font-bold"
            onClick={fetchData}
          >
            <RefreshCw className="size-4 mr-1.5" /> Refresh
          </Button>
          <Button
            size="sm"
            className="rounded-xl font-bold shadow-soft"
            onClick={() => setIsCreateOpen(true)}
          >
            <PlusCircle className="size-4 mr-1.5" /> New Invoice
          </Button>
        </div>
      }
    >
      {/* Search and Filters Bar */}
      <Card className="border-border/40 shadow-soft mb-6">
        <CardContent className="p-4 space-y-4">
          <form
            onSubmit={handleSearchSubmit}
            className="grid gap-3 sm:grid-cols-2 md:grid-cols-5"
          >
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search invoice number, notes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 rounded-xl text-xs h-9"
              />
            </div>

            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="rounded-xl h-9 text-xs">
                  <SelectValue placeholder="Invoice Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="RECEIVED">Received</SelectItem>
                  <SelectItem value="READY_FOR_APPROVAL">Ready for AP Approval</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="ON_HOLD">On Hold</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={matchStatusFilter} onValueChange={setMatchStatusFilter}>
                <SelectTrigger className="rounded-xl h-9 text-xs">
                  <SelectValue placeholder="Match Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Match States</SelectItem>
                  <SelectItem value="PENDING">Pending Match</SelectItem>
                  <SelectItem value="MATCHED">3-Way Matched</SelectItem>
                  <SelectItem value="TOLERANCE_WARNING">Tolerance Warning</SelectItem>
                  <SelectItem value="DISCREPANCY">Discrepancy</SelectItem>
                  <SelectItem value="OVERRIDDEN">Overridden</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Select value={supplierFilter} onValueChange={setSupplierFilter}>
                <SelectTrigger className="rounded-xl h-9 text-xs">
                  <SelectValue placeholder="Filter Supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Suppliers</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.supplierName || s.name || s.supplier_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Invoices List Table */}
      <Card className="border-border/40 shadow-soft overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          ) : paginatedInvoices.length === 0 ? (
            <div className="py-16 text-center">
              <Receipt className="size-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-semibold text-foreground">No invoices found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Try adjusting your search criteria or create a new invoice.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/40 border-b border-border/60 text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                    <th className="p-3.5">Invoice #</th>
                    <th className="p-3.5">Supplier</th>
                    <th className="p-3.5">PO / GRN</th>
                    <th className="p-3.5">Invoice Date</th>
                    <th className="p-3.5">Due Date</th>
                    <th className="p-3.5 text-right">Grand Total</th>
                    <th className="p-3.5 text-right">Outstanding</th>
                    <th className="p-3.5">Match Status</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {paginatedInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted/5 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-primary">
                        <Link
                          to="/finance/invoices/$invoiceId"
                          params={{ invoiceId: inv.id }}
                          className="hover:underline flex items-center gap-1.5"
                        >
                          <Receipt className="size-3.5" /> {inv.invoice_number}
                        </Link>
                      </td>
                      <td className="p-3.5 font-medium text-foreground">
                        {inv.supplier_name || "Supplier"}
                      </td>
                      <td className="p-3.5 font-mono text-[11px] text-muted-foreground">
                        {inv.po_number || (inv.po_id ? inv.po_id.slice(0, 8) : "Direct")}
                        {inv.grn_number ? ` · ${inv.grn_number}` : ""}
                      </td>
                      <td className="p-3.5 text-muted-foreground">{inv.invoice_date}</td>
                      <td className="p-3.5 text-muted-foreground">{inv.due_date}</td>
                      <td className="p-3.5 text-right font-mono font-black text-foreground">
                        ₹{Number(inv.grand_total || 0).toLocaleString()}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                        ₹{Number(inv.outstanding_amount ?? inv.grand_total ?? 0).toLocaleString()}
                      </td>
                      <td className="p-3.5">
                        <StatusBadge status={inv.match_status} />
                      </td>
                      <td className="p-3.5">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {inv.match_status === "PENDING" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 rounded-lg text-[10px] font-bold text-sky-600 border-sky-500/30 hover:bg-sky-50"
                              asChild
                            >
                              <Link to="/finance/matching">
                                <Layers className="size-3 mr-1" /> Match
                              </Link>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 rounded-lg text-xs"
                            asChild
                          >
                            <Link to="/finance/invoices/$invoiceId" params={{ invoiceId: inv.id }}>
                              <Eye className="size-3.5" />
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {filteredInvoices.length > pageSize && (
            <div className="p-4 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Showing {(page - 1) * pageSize + 1} to{" "}
                {Math.min(page * pageSize, filteredInvoices.length)} of{" "}
                {filteredInvoices.length} invoices
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg h-8"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="size-3.5" /> Previous
                </Button>
                <span className="px-2 font-mono font-bold">
                  {page} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg h-8"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Supplier Invoice Modal */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">New Supplier Invoice</DialogTitle>
            <DialogDescription className="text-xs">
              Record an incoming invoice for Procure-to-Pay 3-way matching and payment processing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Supplier*</Label>
                <Select
                  value={formData.supplier_id}
                  onValueChange={(val) => setFormData({ ...formData, supplier_id: val })}
                >
                  <SelectTrigger className="rounded-xl h-9 text-xs">
                    <SelectValue placeholder="Select supplier..." />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.supplierName || s.name || s.supplier_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Linked Purchase Order (Optional)</Label>
                <Select
                  value={formData.po_id}
                  onValueChange={(val) => setFormData({ ...formData, po_id: val })}
                >
                  <SelectTrigger className="rounded-xl h-9 text-xs">
                    <SelectValue placeholder="Select PO..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Direct Invoice (No PO)</SelectItem>
                    {pos.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.poNumber || p.po_number} (₹{Number(p.totalAmount || p.total_amount || 0).toLocaleString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-xs">Invoice Number*</Label>
                <Input
                  placeholder="e.g. INV-2026-9001"
                  value={formData.invoice_number}
                  onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                  className="rounded-xl h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Invoice Date*</Label>
                <Input
                  type="date"
                  value={formData.invoice_date}
                  onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                  className="rounded-xl h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Due Date*</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="rounded-xl h-9 text-xs"
                />
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-2 pt-2 border-t border-border/40">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider">Line Items</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-lg h-7 text-xs"
                  onClick={handleAddItem}
                >
                  + Add Item
                </Button>
              </div>

              <div className="space-y-2">
                {formData.items.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-border/50 bg-muted/10 grid gap-2 sm:grid-cols-6 items-end"
                  >
                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-[10px]">Material Name / Code</Label>
                      <Input
                        placeholder="Material Name"
                        value={item.material_name}
                        onChange={(e) => handleItemChange(idx, "material_name", e.target.value)}
                        className="rounded-lg h-8 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px]">Qty</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                        className="rounded-lg h-8 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px]">Price (₹)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(idx, "unit_price", e.target.value)}
                        className="rounded-lg h-8 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px]">GST (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={item.tax}
                        onChange={(e) => handleItemChange(idx, "tax", e.target.value)}
                        className="rounded-lg h-8 text-xs"
                      />
                    </div>

                    <div>
                      {formData.items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 text-rose-500 rounded-lg w-full text-xs"
                          onClick={() => handleRemoveItem(idx)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Freight and Other Charges */}
            <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-border/40">
              <div className="space-y-1">
                <Label className="text-xs">Freight Charges (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.freight_charges}
                  onChange={(e) => setFormData({ ...formData, freight_charges: e.target.value })}
                  className="rounded-xl h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Payment Terms</Label>
                <Input
                  value={formData.payment_terms}
                  onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                  className="rounded-xl h-9 text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              variant="ghost"
              className="rounded-xl text-xs"
              onClick={() => setIsCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="rounded-xl font-bold text-xs"
              onClick={handleCreateSubmit}
              disabled={creating}
            >
              {creating ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
              Save Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
