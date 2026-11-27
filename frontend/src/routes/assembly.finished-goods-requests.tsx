import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertCircle,
  Boxes,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Download,
  Edit3,
  Eye,
  FileText,
  Info,
  Layers,
  Loader2,
  Package,
  PackageCheck,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Store,
  Trash2,
  TrendingDown,
  X,
} from "lucide-react";
import { AppShell, StatusBadge } from "@/components/wms/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, BUSINESS_API_URL } from "@/lib/api-client";
import { requireRole } from "@/lib/auth-utils";
import { toast } from "sonner";

export const Route = createFileRoute("/assembly/finished-goods-requests")({
  beforeLoad: () => requireRole(["ASSEMBLY_MANAGER", "ASSEMBLY", "ADMIN", "SUPERUSER"]),
  component: AssemblyFinishedGoodsRequests,
});

function formatDisplayDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  const date = new Date(String(dateStr));
  if (Number.isNaN(date.getTime())) return String(dateStr).split("T")[0] || "-";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function generateUniqueProductCode(productName: string, requests: any[]): string {
  const nameToken =
    productName
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 12) || "PRODUCT";
  const prefix = `FG-${nameToken}-`;
  const usedCodes = new Set(
    requests.flatMap((request) =>
      [request.product_code, request.finished_goods_code, request.bom?.product_code]
        .filter(Boolean)
        .map((code) => String(code).trim().toUpperCase()),
    ),
  );
  let sequence = 1;
  let candidate = `${prefix}${String(sequence).padStart(3, "0")}`;
  while (usedCodes.has(candidate)) {
    sequence += 1;
    candidate = `${prefix}${String(sequence).padStart(3, "0")}`;
  }
  return candidate;
}

const CUSTOM_UOM_OPTIONS = ["PCS", "MTR", "KG", "LTR", "BOX", "PKT", "SET", "NOS", "ROLL", "TON"];

interface BOMItemRow {
  material_id: string;
  material_code: string;
  material_name: string;
  variant_code: string;
  quantity_per_unit: number | string;
  uom: string;
  notes?: string;
}

interface MaterialRequestRow {
  material_id: string;
  material_code: string;
  material_name: string;
  variant_code: string;
  bom_per_unit_qty: number;
  quantity: number | string;
  uom: string;
  notes?: string;
}

function AssemblyFinishedGoodsRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [masterMaterials, setMasterMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);

  // BOM Modal State (Create / View / Edit)
  const [bomModal, setBomModal] = useState<{
    open: boolean;
    mode: "create" | "view" | "edit";
    request: any | null;
    product_name: string;
    product_code: string;
    bom: any | null;
  }>({
    open: false,
    mode: "create",
    request: null,
    product_name: "",
    product_code: "",
    bom: null,
  });
  const [bomRows, setBomRows] = useState<BOMItemRow[]>([]);
  const [savingBom, setSavingBom] = useState(false);

  // Auto-filled Material Request from BOM Modal State
  const [mrModal, setMrModal] = useState<{
    open: boolean;
    request: any | null;
    bom: any | null;
    remainingAssemblyQty: number;
    warehouse_id: string;
    priority: string;
    required_date: string;
    remarks: string;
    items: MaterialRequestRow[];
  }>({
    open: false,
    request: null,
    bom: null,
    remainingAssemblyQty: 0,
    warehouse_id: "Main Warehouse",
    priority: "MEDIUM",
    required_date: "",
    remarks: "",
    items: [],
  });
  const [submittingMr, setSubmittingMr] = useState(false);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const [data, materials] = await Promise.all([
        api.getAssemblyFinishedGoodsRequests().catch(() => api.getFinishedGoodsRequests()),
        api.getMaterials({ status: "Active" }).catch(() => []),
      ]);
      setRequests(Array.isArray(data) ? data : []);
      setMasterMaterials(Array.isArray(materials) ? materials : []);
      if (selectedRequest) {
        const updated = (Array.isArray(data) ? data : []).find(
          (r: any) =>
            r.id === selectedRequest.id || r.request_number === selectedRequest.request_number,
        );
        if (updated) setSelectedRequest(updated);
      }
    } catch (error) {
      console.error("Failed to fetch Finished Goods Requests:", error);
      toast.error("Failed to load Finished Goods Requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchRequests();
    const timer = window.setInterval(() => void fetchRequests(), 10000);
    return () => window.clearInterval(timer);
  }, []);

  const filteredRequests = requests.filter((req) => {
    const q = searchQuery.toLowerCase();
    return (
      (req.request_number || "").toLowerCase().includes(q) ||
      (req.product_name || req.finished_goods_name || "").toLowerCase().includes(q) ||
      (req.product_code || req.finished_goods_code || "").toLowerCase().includes(q) ||
      (req.status || "").toLowerCase().includes(q)
    );
  });

  // --- Handlers for BOM modal ---
  const handleOpenCreateBom = (req: any) => {
    const pName = req.product_name || req.finished_goods_name || "";
    const requestedCode = String(req.product_code || req.finished_goods_code || "").trim();
    const pCode =
      !requestedCode || requestedCode.toLowerCase() === pName.trim().toLowerCase()
        ? generateUniqueProductCode(pName, requests)
        : requestedCode;
    setBomModal({
      open: true,
      mode: "create",
      request: req,
      product_name: pName,
      product_code: pCode,
      bom: null,
    });
    setBomRows([
      {
        material_id: "",
        material_code: "",
        material_name: "",
        variant_code: "",
        quantity_per_unit: 1,
        uom: "PCS",
        notes: "",
      },
    ]);
  };

  const handleOpenViewBom = (req: any) => {
    const pName = req.product_name || req.finished_goods_name || "";
    const pCode = req.product_code || req.finished_goods_code || "";
    setBomModal({
      open: true,
      mode: "view",
      request: req,
      product_name: pName,
      product_code: pCode,
      bom: req.bom,
    });
    setBomRows(
      (req.bom?.items || []).map((it: any) => ({
        material_id: it.material_id || "",
        material_code: it.material_code,
        material_name: it.material_name,
        variant_code: it.variant_code || "",
        quantity_per_unit: it.quantity_per_unit,
        uom: it.uom || "PCS",
        notes: it.notes || "",
      })),
    );
  };

  const handleAddBomRow = (custom = false) => {
    setBomRows([
      ...bomRows,
      {
        material_id: "",
        material_code: custom ? "CUSTOM" : "",
        material_name: "",
        variant_code: "",
        quantity_per_unit: 1,
        uom: "PCS",
        notes: "",
      },
    ]);
  };

  const handleRemoveBomRow = (index: number) => {
    if (bomRows.length <= 1) return;
    setBomRows(bomRows.filter((_, i) => i !== index));
  };

  const handleSelectMasterMaterialForBom = (index: number, selection: string) => {
    const [matId, selectedVariantCode = ""] = selection.split("::");
    const found = masterMaterials.find((m) => m.id === matId);
    if (!found) return;
    const selectedVariant = selectedVariantCode
      ? found.variants?.find((variant: any) => variant.variant_code === selectedVariantCode)
      : found.variants?.[0];
    const specDetails = selectedVariant
      ? [
          selectedVariant.specification,
          selectedVariant.size,
          selectedVariant.color,
          selectedVariant.grade,
        ]
          .filter(Boolean)
          .join(", ")
      : "";
    const nameWithSpec = specDetails
      ? `${found.material_name} (${specDetails})`
      : found.material_name;

    setBomRows(
      bomRows.map((row, i) =>
        i === index
          ? {
              ...row,
              material_id: found.id,
              material_code: found.material_code,
              material_name: nameWithSpec,
              variant_code: selectedVariant?.variant_code || "",
              uom: selectedVariant?.uom || found.base_uom || "PCS",
            }
          : row,
      ),
    );
  };

  const handleSaveBom = async () => {
    const pName = bomModal.product_name.trim();
    if (!pName) {
      toast.error("Product Name is required");
      return;
    }
    for (let i = 0; i < bomRows.length; i++) {
      const r = bomRows[i];
      if (!r.material_id && r.material_code === "CUSTOM") {
        if (!r.material_name.trim() || !r.uom.trim()) {
          toast.error(`Enter a custom material name and UOM for row ${i + 1}`);
          return;
        }
      } else if (!r.material_id) {
        toast.error(`Please select a warehouse material for component row ${i + 1}`);
        return;
      }
      const q = Number(r.quantity_per_unit);
      if (isNaN(q) || q <= 0) {
        toast.error(`Quantity per unit must be greater than 0 for component row ${i + 1}`);
        return;
      }
    }

    setSavingBom(true);
    try {
      const payload = {
        product_name: pName,
        product_code: bomModal.product_code?.trim() || null,
        description: `BOM recipe for ${pName}`,
        created_by: "Assembly",
        items: bomRows.map((r) => ({
          material_id: r.material_id || null,
          material_code: r.material_code.trim(),
          material_name: r.material_name.trim(),
          variant_code: r.variant_code?.trim() || null,
          quantity_per_unit: Number(r.quantity_per_unit),
          uom: r.uom || "PCS",
          notes: r.notes || null,
        })),
      };

      let saved;
      if (bomModal.mode === "edit" && bomModal.bom?.id) {
        saved = await api.updateBOM(bomModal.bom.id, payload);
        toast.success(`BOM ${saved.bom_number || ""} updated successfully for ${pName}`);
      } else {
        saved = await api.createBOM(payload);
        toast.success(`BOM ${saved.bom_number || ""} saved and linked to ${pName}`);
      }

      setBomModal((prev) => ({ ...prev, open: false }));
      await fetchRequests();
    } catch (err: any) {
      toast.error(err.message || "Failed to save BOM");
    } finally {
      setSavingBom(false);
    }
  };

  // --- Handlers for Auto-filled Material Request from BOM ---
  const handleOpenMaterialRequestFromBom = (req: any) => {
    const avail = Number(req.fg_store_available ?? req.available_quantity ?? 0);
    const requestedQty = Number(req.quantity ?? req.requested_quantity ?? 0);
    // Formula: remaining_assembly_qty = max(requested_fg_qty - fg_store_available, 0)
    const remainingAssemblyQty = Math.max(0, requestedQty - avail);

    if (remainingAssemblyQty <= 0) {
      toast.info("Zero Assembly Required", {
        description: `Finished Goods Store available stock (${avail} ${req.uom || "PCS"}) fully covers the request (${requestedQty} ${req.uom || "PCS"}). No material requisition is needed.`,
      });
      return;
    }

    const bom = req.bom;
    if (!bom || !Array.isArray(bom.items) || bom.items.length === 0) {
      toast.error("No BOM items found. Please define the BOM first.");
      return;
    }

    // Auto-fill Material Request:
    // material_request_qty = bom_per_unit_qty * remaining_assembly_qty
    const autoFilledItems: MaterialRequestRow[] = bom.items.map((it: any) => {
      const perUnit = Number(it.quantity_per_unit || 1);
      const calculatedQty = perUnit * remainingAssemblyQty;
      return {
        material_id: it.material_id || "",
        material_code: it.material_code,
        material_name: it.material_name,
        variant_code: it.variant_code || "",
        bom_per_unit_qty: perUnit,
        quantity: calculatedQty, // EDITABLE! Changing this will NOT alter the BOM
        uom: it.uom || "PCS",
        notes: "",
      };
    });

    setMrModal({
      open: true,
      request: req,
      bom: bom,
      remainingAssemblyQty,
      warehouse_id: req.warehouse_id || "Main Warehouse",
      priority: "MEDIUM",
      required_date:
        req.required_date ||
        new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      remarks: `Requisition auto-filled from BOM (${bom.bom_number}) for FG Request ${req.request_number} to assemble ${remainingAssemblyQty} unit(s).`,
      items: autoFilledItems,
    });
  };

  const handleAddMrRow = () => {
    setMrModal((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          material_id: "",
          material_code: "",
          material_name: "",
          variant_code: "",
          bom_per_unit_qty: 1,
          quantity: 1,
          uom: "PCS",
          notes: "",
        },
      ],
    }));
  };

  const handleRemoveMrRow = (index: number) => {
    if (mrModal.items.length <= 1) return;
    setMrModal((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleSelectMaterialForMr = (index: number, matId: string) => {
    const found = masterMaterials.find((m) => m.id === matId);
    if (!found) return;
    const defaultVariant = found.variants?.[0];
    const specDetails = defaultVariant
      ? [defaultVariant.size, defaultVariant.color, defaultVariant.grade].filter(Boolean).join(", ")
      : "";
    const nameWithSpec = specDetails
      ? `${found.material_name} (${specDetails})`
      : found.material_name;

    setMrModal((prev) => ({
      ...prev,
      items: prev.items.map((row, i) =>
        i === index
          ? {
              ...row,
              material_id: found.id,
              material_code: found.material_code,
              material_name: nameWithSpec,
              variant_code: defaultVariant?.variant_code || "",
              uom: defaultVariant?.uom || found.base_uom || "PCS",
            }
          : row,
      ),
    }));
  };

  const handleSubmitMaterialRequest = async () => {
    if (mrModal.items.length === 0) {
      toast.error("Please include at least one material component.");
      return;
    }
    for (let i = 0; i < mrModal.items.length; i++) {
      const it = mrModal.items[i];
      if (!it.material_code?.trim() || !it.material_name?.trim()) {
        toast.error(`Please select or specify material for row ${i + 1}`);
        return;
      }
      const q = Number(it.quantity);
      if (isNaN(q) || q <= 0) {
        toast.error(`Quantity must be greater than 0 for ${it.material_name || `row ${i + 1}`}`);
        return;
      }
    }

    setSubmittingMr(true);
    try {
      const payload = {
        warehouse_id: mrModal.warehouse_id,
        department: "Assembly",
        requested_by: "Assembly Operator",
        priority: mrModal.priority,
        required_date: mrModal.required_date,
        remarks: mrModal.remarks,
        items: mrModal.items.map((it) => ({
          material_id: it.material_id || null,
          material_variant_id: null,
          material_code: it.material_code,
          variant_code: it.variant_code || null,
          material_name: it.material_name,
          quantity: Number(it.quantity),
          uom: it.uom || "PCS",
          is_custom: !it.material_id && it.material_code === "CUSTOM",
          custom_material_name:
            !it.material_id && it.material_code === "CUSTOM" ? it.material_name : undefined,
        })),
      };

      const created = await api.createAssemblyRequisition(payload);
      const reqNum =
        created?.requisition_number ||
        created?.requisitionNumber ||
        created?.request_number ||
        "REQ";
      toast.success("Assembly Material Requisition submitted to Warehouse!", {
        description: `Requisition ${reqNum} generated for ${mrModal.remainingAssemblyQty} unit(s). Note: BOM recipe was preserved.`,
      });
      setMrModal((prev) => ({ ...prev, open: false }));
    } catch (err: any) {
      toast.error(err.message || "Failed to create material requisition");
    } finally {
      setSubmittingMr(false);
    }
  };

  return (
    <AppShell
      title="Assembly Finished Goods Requests"
      subtitle="Inspect incoming Finished Goods Requests from Procurement, check FG Store availability, and manage BOMs"
      actions={
        <Button variant="outline" onClick={() => void fetchRequests()} disabled={loading}>
          <RefreshCw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Request overview */}
        <div>
          <div className="mb-3">
            <h2 className="text-base font-extrabold text-[#101D3A]">Request overview</h2>
            <p className="mt-0.5 text-xs font-medium text-[#526580]">
              Finished-goods availability and assembly demand from Procurement
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Total Requests",
                value: requests.length,
                detail: "From Procurement",
                icon: ClipboardList,
                card: "border-[#CBE0FC] hover:border-[#0866FF]/50",
                iconTone: "bg-[#EBF3FF] text-[#0866FF]",
                valueTone: "text-[#0866FF]",
              },
              {
                label: "Sent to Assembly",
                value: requests.filter((r) => r.status === "SENT_TO_ASSEMBLY" || !r.status).length,
                detail: "Pending FG store verification",
                icon: PackageCheck,
                card: "border-amber-200 hover:border-amber-300",
                iconTone: "bg-amber-50 text-amber-600",
                valueTone: "text-amber-600",
              },
              {
                label: "In Stock (Zero Shortage)",
                value: requests.filter((r) => (r.shortage ?? 0) <= 0).length,
                detail: "Covered by FG Store inventory",
                icon: CheckCircle2,
                card: "border-emerald-200 hover:border-emerald-300",
                iconTone: "bg-emerald-50 text-emerald-600",
                valueTone: "text-emerald-600",
              },
              {
                label: "Shortage (To Assemble)",
                value: requests.filter((r) => (r.shortage ?? 0) > 0).length,
                detail: "Assembly production required",
                icon: TrendingDown,
                card: "border-red-200 hover:border-red-300",
                iconTone: "bg-red-50 text-[#E5484D]",
                valueTone: "text-[#E5484D]",
              },
            ].map((metric) => {
              const MetricIcon = metric.icon;
              return (
                <Card
                  key={metric.label}
                  className={`flex min-h-40 flex-col rounded-2xl border bg-white p-5 shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md ${metric.card}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="max-w-[75%] text-xs font-bold uppercase leading-5 tracking-wide text-[#526580]">
                      {metric.label}
                    </p>
                    <span
                      className={`grid size-10 shrink-0 place-items-center rounded-xl ${metric.iconTone}`}
                    >
                      <MetricIcon className="size-5" />
                    </span>
                  </div>
                  <p
                    className={`mt-auto pt-3 text-3xl font-black tabular-nums ${metric.valueTone}`}
                  >
                    {metric.value}
                  </p>
                  <p className="mt-1 min-h-4 text-xs font-medium text-[#526580]">{metric.detail}</p>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Search & Actions */}
        <div className="grid gap-3 rounded-2xl border border-[#DCE6F3] bg-white p-4 shadow-xs sm:grid-cols-[minmax(280px,1fr)_auto] sm:items-center">
          <div className="relative min-w-0 sm:max-w-2xl">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#526580]" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search request #, product name, code..."
              className="h-10 rounded-xl border-[#DCE6F3] bg-[#F5F8FF] pl-10 focus-visible:border-[#0866FF] focus-visible:ring-[#0866FF]/20"
            />
          </div>
          <span className="text-xs font-semibold text-[#526580]">
            Showing {filteredRequests.length} of {requests.length}
          </span>
        </div>

        {/* Requests Table */}
        <Card className="overflow-hidden rounded-2xl border border-[#DCE6F3] bg-white p-0 shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left text-sm">
              <thead className="border-b border-[#DCE6F3] bg-[#F1F5FA] text-[11px] font-bold uppercase tracking-wider text-[#526580]">
                <tr>
                  <th className="px-4 py-3">Request Number</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3 text-right">Requested Qty</th>
                  <th className="px-4 py-3 text-right">FG Store Available</th>
                  <th className="px-4 py-3 text-right">Shortage</th>
                  <th className="px-4 py-3">BOM Definition</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created Date</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE6F3]">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="h-48 text-center">
                      <Loader2 className="size-7 animate-spin mx-auto text-primary" />
                      <span className="block mt-2 text-xs text-muted-foreground">
                        Loading Finished Goods Requests...
                      </span>
                    </td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="h-48 text-center p-6">
                      <ClipboardList className="size-10 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-muted-foreground">
                        No Finished Goods Requests Received
                      </p>
                      <p className="text-xs text-muted-foreground/80 mt-1">
                        Requests sent from Procurement will appear here.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((req) => {
                    const avail = req.fg_store_available ?? req.available_quantity ?? 0;
                    const shortage =
                      req.shortage ?? req.shortage_quantity ?? Math.max(0, req.quantity - avail);

                    return (
                      <tr
                        key={req.id}
                        onClick={() => setSelectedRequest(req)}
                        className={`cursor-pointer transition-colors hover:bg-[#F8FAFD] ${
                          selectedRequest?.id === req.id ? "bg-[#EBF3FF]/60" : ""
                        }`}
                      >
                        <td className="px-4 py-3 font-mono font-bold text-primary">
                          {req.request_number}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground">
                            {req.product_name || req.finished_goods_name}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">
                            {req.product_code || req.finished_goods_code || "-"}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-foreground">
                          {req.quantity || req.requested_quantity} {req.uom || "PCS"}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-600">
                          {avail} {req.uom || "PCS"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {shortage > 0 ? (
                            <Badge variant="destructive" className="font-bold">
                              {shortage} {req.uom || "PCS"}
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none font-bold">
                              0 (In Stock)
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {req.has_bom ? (
                            <div className="flex items-center gap-1.5">
                              <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-none font-bold text-[11px]">
                                BOM Available
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenViewBom(req);
                                }}
                                className="h-6 px-1.5 text-xs text-primary font-bold hover:underline"
                              >
                                View BOM
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <Badge
                                variant="outline"
                                className="text-amber-700 border-amber-300 dark:text-amber-400 font-semibold text-[11px]"
                              >
                                No BOM exists
                              </Badge>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenCreateBom(req);
                                }}
                                className="h-6 px-2 text-xs font-bold text-primary border-primary/30 hover:bg-primary/10"
                              >
                                Create BOM
                              </Button>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={req.status || "SENT_TO_ASSEMBLY"} />
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {formatDisplayDate(req.created_at)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRequest(req);
                            }}
                            className="rounded-xl h-8 text-xs font-semibold gap-1.5"
                          >
                            <Eye className="size-3.5" />
                            Inspect FG Store
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

        {/* Selected Request Inspection Modal / Detailed Card */}
        {selectedRequest && (
          <div
            className="fixed inset-0 z-40 flex items-center justify-center bg-[#071D3B]/70 p-4 backdrop-blur-sm sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-label={`Inspect finished goods request ${selectedRequest.request_number}`}
            onClick={() => setSelectedRequest(null)}
          >
            <Card
              className="max-h-[92vh] w-full max-w-6xl space-y-6 overflow-y-auto rounded-2xl border border-[#DCE6F3] bg-white p-6 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="sticky -top-6 z-10 -m-6 mb-0 flex items-center justify-between bg-[#0B2A55] px-6 py-5 text-white">
                <div className="flex items-center gap-3">
                  <div className="grid size-12 place-items-center rounded-2xl border border-white/20 bg-white/10 text-white">
                    <Store className="size-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-white">
                        {selectedRequest.request_number}
                      </h3>
                      <StatusBadge status={selectedRequest.status || "SENT_TO_ASSEMBLY"} />
                    </div>
                    <p className="mt-0.5 text-xs text-blue-100/80">
                      Finished Goods Store Availability Inspection &amp; BOM Planning
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setSelectedRequest(null)}
                  className="h-10 gap-2 rounded-xl border-white/20 bg-white/10 px-3 text-white hover:bg-white/20 hover:text-white"
                >
                  <X className="size-4" />
                  Close
                </Button>
              </div>

              {/* Inventory Inspection Panel */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Requested Card */}
                <div className="rounded-2xl border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 p-5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                    Requested Quantity
                  </span>
                  <div className="text-3xl font-black text-blue-700 dark:text-blue-300 mt-2">
                    {selectedRequest.quantity || selectedRequest.requested_quantity}{" "}
                    {selectedRequest.uom || "PCS"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Required By: {formatDisplayDate(selectedRequest.required_date)}
                  </div>
                </div>

                {/* FG Store Available Card */}
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 p-5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                    FG Store Available
                  </span>
                  <div className="text-3xl font-black text-emerald-700 dark:text-emerald-300 mt-2">
                    {selectedRequest.fg_store_available ?? selectedRequest.available_quantity ?? 0}{" "}
                    {selectedRequest.uom || "PCS"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Actual database inventory in FG Store
                  </div>
                </div>

                {/* Shortage Card */}
                <div
                  className={`rounded-2xl border p-5 ${
                    (selectedRequest.shortage ?? 0) > 0
                      ? "border-red-200 bg-red-50/50 dark:bg-red-950/20"
                      : "border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20"
                  }`}
                >
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider ${
                      (selectedRequest.shortage ?? 0) > 0
                        ? "text-red-700 dark:text-red-300"
                        : "text-emerald-700 dark:text-emerald-300"
                    }`}
                  >
                    Assembly Required
                  </span>
                  <div
                    className={`text-3xl font-black mt-2 ${
                      (selectedRequest.shortage ?? 0) > 0
                        ? "text-red-700 dark:text-red-300"
                        : "text-emerald-700 dark:text-emerald-300"
                    }`}
                  >
                    {selectedRequest.shortage ?? selectedRequest.shortage_quantity ?? 0}{" "}
                    {selectedRequest.uom || "PCS"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {(selectedRequest.shortage ?? 0) > 0
                      ? "Production required to fulfill shortage"
                      : "0 units needed (completely in stock)"}
                  </div>
                </div>
              </div>

              {/* BOM Management & Material Requisition Callout */}
              <div className="rounded-2xl border border-border/80 bg-muted/20 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Layers className="size-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-foreground">
                        Bill of Materials (BOM) —{" "}
                        {selectedRequest.product_name || selectedRequest.finished_goods_name}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Reusable product-level recipe (quantity per 1 finished good unit)
                      </p>
                    </div>
                  </div>

                  {selectedRequest.has_bom ? (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenViewBom(selectedRequest)}
                        className="rounded-xl text-xs font-semibold gap-1.5"
                      >
                        <Eye className="size-3.5" /> View BOM
                      </Button>
                      {(selectedRequest.shortage ?? 0) > 0 ? (
                        <Button
                          size="sm"
                          onClick={() => handleOpenMaterialRequestFromBom(selectedRequest)}
                          className="rounded-xl font-bold text-xs gap-1.5 bg-primary text-primary-foreground"
                        >
                          <ClipboardList className="size-3.5" /> Create Material Request from BOM
                        </Button>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 border-none font-bold text-xs px-2.5 py-1">
                          Zero Assembly Required
                        </Badge>
                      )}
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleOpenCreateBom(selectedRequest)}
                      className="rounded-xl font-bold text-xs gap-1.5 bg-primary text-primary-foreground"
                    >
                      <Plus className="size-3.5" /> Create BOM
                    </Button>
                  )}
                </div>

                {selectedRequest.has_bom ? (
                  <div className="rounded-xl border bg-card p-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <CheckCircle2 className="size-4 text-emerald-600" />
                        BOM Available: {selectedRequest.bom?.bom_number}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {selectedRequest.bom?.items?.length || 0} component(s) defined
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs">
                      {(selectedRequest.bom?.items || []).map((itm: any, idx: number) => (
                        <div
                          key={idx}
                          className="rounded-lg bg-muted/40 p-2 border border-border/40"
                        >
                          <span
                            className="font-semibold text-foreground block truncate"
                            title={itm.material_name}
                          >
                            {itm.material_name}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {itm.quantity_per_unit} {itm.uom} / unit
                          </span>
                        </div>
                      ))}
                    </div>

                    {(selectedRequest.shortage ?? 0) <= 0 && (
                      <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-2 text-xs text-emerald-800 dark:text-emerald-300">
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                        <span>
                          <strong>In Stock:</strong> The requested quantity is completely covered by
                          FG Store inventory ({selectedRequest.fg_store_available ?? 0} available).
                          No raw materials needed.
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/40 dark:bg-amber-950/20 p-4 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2.5">
                    <AlertCircle className="size-4 shrink-0 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-bold">No BOM exists for this Finished Good</p>
                      <p className="text-muted-foreground mt-0.5">
                        Click <strong>"Create BOM"</strong> to define the standard components and
                        quantities needed to assemble one unit of{" "}
                        <strong>
                          {selectedRequest.product_name || selectedRequest.finished_goods_name}
                        </strong>
                        . The saved BOM will be reused for all future requests.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Product & Request Details */}
              <div className="overflow-hidden rounded-2xl border border-[#DCE6F3] bg-[#F8FAFD]">
                <div className="border-b border-[#DCE6F3] px-4 py-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#526580]">
                    Request Details
                  </h4>
                </div>
                <div className="grid text-xs sm:grid-cols-2 lg:grid-cols-4 [&>div]:px-4 [&>div]:py-4 lg:[&>div:not(:last-child)]:border-r lg:[&>div:not(:last-child)]:border-[#DCE6F3]">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-[#526580]">
                      Product Name
                    </span>
                    <p className="mt-1 text-sm font-bold text-[#101D3A]">
                      {selectedRequest.product_name || selectedRequest.finished_goods_name}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase text-[#526580]">
                      Product Code
                    </span>
                    <p className="mt-1 font-mono text-sm font-bold text-[#101D3A]">
                      {selectedRequest.product_code || selectedRequest.finished_goods_code || "-"}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase text-[#526580]">
                      Requested By
                    </span>
                    <p className="mt-1 text-sm font-bold text-[#101D3A]">
                      {selectedRequest.requested_by || selectedRequest.created_by || "Procurement"}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase text-[#526580]">
                      Target Warehouse
                    </span>
                    <p className="mt-1 text-sm font-bold text-[#101D3A]">
                      {selectedRequest.warehouse_id || "MAIN"}
                    </p>
                  </div>
                </div>
              </div>

              {/* BOM Attachment Download if any from Procurement */}
              {selectedRequest.bom_attachment_url && (
                <div className="flex items-center justify-between rounded-xl bg-primary/5 border border-primary/20 p-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="size-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-foreground block">
                        {selectedRequest.bom_attachment_name || "BOM Attachment"}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Document attached by Procurement
                      </span>
                    </div>
                  </div>
                  <a
                    href={`${BUSINESS_API_URL}${selectedRequest.bom_attachment_url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition shadow-sm"
                  >
                    <Download className="size-3.5" /> Download Attachment
                  </a>
                </div>
              )}

              {/* Remarks if any */}
              {selectedRequest.remarks && (
                <div className="rounded-xl bg-muted/30 p-3 border text-xs">
                  <span className="font-bold text-muted-foreground uppercase text-[10px] block mb-1">
                    Remarks
                  </span>
                  <p className="text-foreground">{selectedRequest.remarks}</p>
                </div>
              )}

              {/* Safety & Non-Deduction Notice */}
              <div className="flex items-center gap-2.5 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/60 p-3 text-xs text-[#526580]">
                <ShieldCheck className="size-4 shrink-0 text-emerald-600" />
                <span>
                  <strong>Availability Inspection Only:</strong> Checking inventory availability
                  does not reserve or deduct finished goods stock.
                </span>
              </div>
            </Card>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 1: CREATE / VIEW / EDIT BOM MODAL                                   */}
        {/* ========================================================================= */}
        <Dialog
          open={bomModal.open}
          onOpenChange={(open) => !open && setBomModal((prev) => ({ ...prev, open: false }))}
        >
          <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col gap-0 overflow-hidden rounded-2xl border-[#DCE6F3] bg-white p-0 shadow-2xl [&>button]:right-5 [&>button]:top-5 [&>button]:text-white [&>button]:opacity-80 [&>button:hover]:bg-white/10 [&>button:hover]:opacity-100">
            <DialogHeader className="shrink-0 bg-[#0B2A55] px-6 py-5 pr-14 text-left">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="flex items-center gap-3 text-lg font-bold text-white">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/20 bg-white/10">
                      <Layers className="size-5" />
                    </span>
                    {bomModal.mode === "create"
                      ? "Create Product Bill of Materials (BOM)"
                      : bomModal.mode === "edit"
                        ? `Edit BOM — ${bomModal.bom?.bom_number || bomModal.product_name}`
                        : `View BOM — ${bomModal.bom?.bom_number || bomModal.product_name}`}
                  </DialogTitle>
                  <DialogDescription className="mt-1 pl-[52px] text-xs text-blue-100/80">
                    Define the raw materials and components required to manufacture{" "}
                    <strong>ONE unit</strong> of this finished good.
                  </DialogDescription>
                </div>
                {bomModal.mode === "view" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setBomModal((prev) => ({ ...prev, mode: "edit" }))}
                    className="gap-1.5 rounded-xl border-white/25 bg-white/10 text-xs font-bold text-white hover:bg-white/20 hover:text-white"
                  >
                    <Edit3 className="size-3.5" /> Edit BOM
                  </Button>
                )}
              </div>
            </DialogHeader>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
              {/* Product Info Fields */}
              <div className="grid grid-cols-1 gap-4 rounded-xl border border-[#DCE6F3] bg-[#F8FAFD] p-4 sm:grid-cols-2">
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-[#526580]">
                    Product Name
                  </Label>
                  <Input
                    value={bomModal.product_name}
                    onChange={(e) => {
                      const productName = e.target.value;
                      setBomModal((prev) => ({
                        ...prev,
                        product_name: productName,
                        product_code:
                          prev.mode === "create"
                            ? generateUniqueProductCode(productName, requests)
                            : prev.product_code,
                      }));
                    }}
                    disabled={bomModal.mode === "view"}
                    className="mt-1.5 h-10 rounded-xl border-[#DCE6F3] bg-white text-sm font-bold focus-visible:border-[#0866FF] focus-visible:ring-[#0866FF]/20"
                    placeholder="e.g. Laptop"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-[#526580]">
                    Product Code
                  </Label>
                  <Input
                    value={bomModal.product_code}
                    readOnly
                    aria-readonly="true"
                    className="mt-1.5 h-10 cursor-not-allowed rounded-xl border-[#DCE6F3] bg-[#EEF3FA] font-mono text-sm font-semibold text-[#526580] focus-visible:ring-0"
                    placeholder="Generated automatically"
                  />
                  <p className="mt-1.5 text-xs font-medium text-[#526580]">
                    Generated automatically from the product name and cannot be edited.
                  </p>
                </div>
              </div>

              {/* Standard Recipe Rule Notice */}
              <div className="flex items-start gap-2.5 rounded-xl border border-[#CBE0FC] bg-[#EBF3FF] p-3 text-xs font-medium leading-5 text-[#0866FF]">
                <Info className="size-4 shrink-0" />
                <span>
                  <strong>Standard Recipe:</strong> BOM quantities are ALWAYS defined per{" "}
                  <strong>ONE unit</strong> of the finished good. This recipe is reusable across all
                  future requests.
                </span>
              </div>

              {/* Components Table */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-[#526580]">
                    Required Components &amp; Raw Materials ({bomRows.length})
                  </Label>
                  {bomModal.mode !== "view" && (
                    <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddBomRow()}
                      className="h-8 gap-1 rounded-xl border-[#0866FF]/30 text-xs font-bold text-[#0866FF] hover:bg-[#EBF3FF]"
                    >
                      <Plus className="size-3.5" /> Add Component
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddBomRow(true)}
                      className="h-8 gap-1 rounded-xl border-amber-400 bg-amber-300 text-xs font-bold text-amber-950 hover:bg-amber-400 hover:text-amber-950"
                    >
                      <Plus className="size-3.5" /> Add Custom Item
                    </Button>
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto rounded-xl border border-[#DCE6F3]">
                  <table className="w-full min-w-[700px] text-left text-xs">
                    <thead className="border-b border-[#DCE6F3] bg-[#F1F5FA] text-[10px] font-bold uppercase tracking-wider text-[#526580]">
                      <tr>
                        <th className="p-2.5">Material / Component</th>
                        <th className="p-2.5 w-32">Material Code</th>
                        <th className="p-2.5 w-24 text-center">Qty / Unit</th>
                        <th className="p-2.5 w-20">UOM</th>
                        {bomModal.mode !== "view" && <th className="p-2.5 w-10 text-right"></th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DCE6F3]">
                      {bomRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-[#F8FAFD]">
                          <td className="p-2.5">
                            {bomModal.mode === "view" ? (
                              <span className="font-semibold text-foreground">
                                {row.material_name}
                              </span>
                            ) : !row.material_id && row.material_code === "CUSTOM" ? (
                              <Input
                                aria-label="Custom material name"
                                placeholder="Custom material name"
                                value={row.material_name}
                                onChange={(e) =>
                                  setBomRows((rows) =>
                                    rows.map((r, i) =>
                                      i === idx ? { ...r, material_name: e.target.value } : r,
                                    ),
                                  )
                                }
                                className="h-8 rounded-lg text-xs"
                              />
                            ) : (
                              <div className="space-y-1">
                                {masterMaterials.length > 0 ? (
                                  <Select
                                    value={
                                      row.material_id
                                        ? `${row.material_id}::${row.variant_code || ""}`
                                        : ""
                                    }
                                    onValueChange={(val) =>
                                      handleSelectMasterMaterialForBom(idx, val)
                                    }
                                  >
                                    <SelectTrigger className="h-8 text-xs rounded-lg">
                                      <SelectValue placeholder="Select from Master Materials...">
                                        {(() => {
                                          if (!row.material_id) return null;
                                          const material = masterMaterials.find(
                                            (item) => item.id === row.material_id,
                                          );
                                          const variant = material?.variants?.find(
                                            (item: any) => item.variant_code === row.variant_code,
                                          );
                                          const specification =
                                            variant?.specification?.trim() ||
                                            [variant?.size, variant?.color, variant?.grade]
                                              .filter(Boolean)
                                              .join(", ") ||
                                            "Standard specification";
                                          return material
                                            ? `${material.material_name} · ${specification}`
                                            : row.material_name;
                                        })()}
                                      </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                      {masterMaterials.flatMap((mat) => {
                                        const variants =
                                          Array.isArray(mat.variants) && mat.variants.length
                                            ? mat.variants
                                            : [null];
                                        return variants.map((variant: any) => {
                                          const specification =
                                            variant?.specification?.trim() ||
                                            [variant?.size, variant?.color, variant?.grade]
                                              .filter(Boolean)
                                              .join(", ") ||
                                            "Standard specification";
                                          const variantCode = variant?.variant_code || "";
                                          return (
                                            <SelectItem
                                              key={`${mat.id}-${variantCode || "base"}`}
                                              value={`${mat.id}::${variantCode}`}
                                            >
                                              {mat.material_name} · {specification}
                                            </SelectItem>
                                          );
                                        });
                                      })}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <p className="text-[11px] font-medium text-amber-700">
                                    No active warehouse materials are available.
                                  </p>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-2.5">
                            {bomModal.mode === "view" ? (
                              <span className="font-mono text-muted-foreground">
                                {row.material_code}
                              </span>
                            ) : (
                              <Input
                                placeholder="Code"
                                value={row.material_code}
                                readOnly
                                tabIndex={-1}
                                className="h-8 text-xs font-mono rounded-lg"
                              />
                            )}
                          </td>
                          <td className="p-2.5 text-center">
                            {bomModal.mode === "view" ? (
                              <span className="font-bold text-primary text-sm">
                                {row.quantity_per_unit}
                              </span>
                            ) : (
                              <Input
                                type="number"
                                min="0.01"
                                step="any"
                                value={row.quantity_per_unit}
                                onChange={(e) =>
                                  setBomRows(
                                    bomRows.map((r, i) =>
                                      i === idx ? { ...r, quantity_per_unit: e.target.value } : r,
                                    ),
                                  )
                                }
                                className="h-8 text-xs font-bold text-center rounded-lg w-20 mx-auto"
                              />
                            )}
                          </td>
                          <td className="p-2.5">
                            {bomModal.mode === "view" ? (
                              <span className="text-muted-foreground font-semibold">{row.uom}</span>
                            ) : !row.material_id && row.material_code === "CUSTOM" ? (
                              <Select
                                value={row.uom}
                                onValueChange={(uom) =>
                                  setBomRows((rows) =>
                                    rows.map((r, i) =>
                                      i === idx ? { ...r, uom } : r,
                                    ),
                                  )
                                }
                              >
                                <SelectTrigger
                                  aria-label="Custom material unit of measure"
                                  className="h-8 rounded-lg text-xs"
                                >
                                  <SelectValue placeholder="UOM" />
                                </SelectTrigger>
                                <SelectContent>
                                  {[...new Set([...CUSTOM_UOM_OPTIONS, row.uom].filter(Boolean))].map(
                                    (uom) => (
                                      <SelectItem key={uom} value={uom}>
                                        {uom}
                                      </SelectItem>
                                    ),
                                  )}
                                </SelectContent>
                              </Select>
                            ) : (
                              <Input
                                value={row.uom}
                                readOnly
                                aria-readonly="true"
                                tabIndex={-1}
                                title="Fetched from the selected material master"
                                className="h-8 cursor-not-allowed rounded-lg bg-[#EEF3FA] text-xs font-semibold uppercase text-[#526580] focus-visible:ring-0"
                              />
                            )}
                          </td>
                          {bomModal.mode !== "view" && (
                            <td className="p-2.5 text-right">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveBomRow(idx)}
                                disabled={bomRows.length <= 1}
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <DialogFooter className="shrink-0 gap-2 border-t border-[#DCE6F3] bg-[#F8FAFD] px-6 py-4">
              <Button
                variant="outline"
                onClick={() => setBomModal((prev) => ({ ...prev, open: false }))}
                className="rounded-xl border-[#DCE6F3] bg-white text-[#101D3A] hover:bg-[#F5F8FF]"
              >
                {bomModal.mode === "view" ? "Close" : "Cancel"}
              </Button>
              {bomModal.mode !== "view" && (
                <Button
                  onClick={handleSaveBom}
                  disabled={savingBom}
                  className="gap-1.5 rounded-xl bg-[#0866FF] font-bold text-white hover:bg-[#0054D6]"
                >
                  {savingBom ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                  Save BOM Recipe
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ========================================================================= */}
        {/* MODAL 2: AUTO-FILLED MATERIAL REQUEST FROM BOM (EDITABLE QUANTITIES)     */}
        {/* ========================================================================= */}
        <Dialog
          open={mrModal.open}
          onOpenChange={(open) => !open && setMrModal((prev) => ({ ...prev, open: false }))}
        >
          <DialogContent className="flex max-h-[90vh] max-w-5xl flex-col gap-0 overflow-hidden rounded-2xl border-[#DCE6F3] bg-white p-0 shadow-2xl">
            <DialogHeader className="shrink-0 bg-[#0B2A55] px-6 py-5 text-left">
              <DialogTitle className="flex items-center gap-3 text-xl font-extrabold text-white">
                <span className="grid size-10 place-items-center rounded-xl border border-white/20 bg-white/10">
                  <ClipboardList className="size-5" />
                </span>
                Assembly Material Requisition
              </DialogTitle>
              <DialogDescription className="pl-[52px] text-xs font-medium text-blue-100">
                Auto-calculated material quantities for Finished Goods Request{" "}
                <strong className="font-mono text-white">{mrModal.request?.request_number}</strong>{" "}
                ({mrModal.request?.product_name || mrModal.request?.finished_goods_name}).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 overflow-y-auto bg-[#F8FAFD] px-6 py-5">
              {/* Formula & Availability Summary Banner */}
              <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[#DCE6F3] bg-white p-4 text-xs sm:grid-cols-3">
                <div className="rounded-xl border border-[#CBE0FC] bg-[#F5F9FF] p-3.5">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[#526580]">
                    Requested FG Qty
                  </span>
                  <span className="mt-1 block text-xl font-black text-[#0866FF]">
                    {mrModal.request?.quantity || mrModal.request?.requested_quantity}{" "}
                    {mrModal.request?.uom || "PCS"}
                  </span>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    FG Store Available
                  </span>
                  <span className="mt-1 block text-xl font-black text-emerald-600">
                    {mrModal.request?.fg_store_available ?? 0} {mrModal.request?.uom || "PCS"}
                  </span>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-amber-700">
                    Remaining Assembly Qty
                  </span>
                  <span className="mt-1 block text-xl font-black text-amber-600">
                    {mrModal.remainingAssemblyQty} {mrModal.request?.uom || "PCS"}
                  </span>
                </div>
              </div>

              {/* Crucial Separation Notice */}
              <div className="flex items-start gap-2.5 rounded-xl border border-[#CBE0FC] bg-[#EBF3FF] p-3.5 text-xs text-[#101D3A]">
                <Info className="mt-0.5 size-4 shrink-0 text-[#0866FF]" />
                <div>
                  <span className="font-bold text-[#0866FF]">Editable requisition quantities</span>
                  <p className="mt-0.5 leading-5 text-[#526580]">
                    Quantities have been auto-populated based on the BOM recipe multiplied by{" "}
                    <strong>{mrModal.remainingAssemblyQty} unit(s)</strong> to assemble. You may
                    adjust quantities below as needed for this particular assembly order.{" "}
                    <strong>Adjustments here will NOT alter the master BOM definition.</strong>
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-[#526580]">
                    Requisition Materials ({mrModal.items.length})
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddMrRow}
                    className="h-8 gap-1 rounded-xl border-[#0866FF]/30 bg-white text-xs font-bold text-[#0866FF] hover:bg-[#EBF3FF]"
                  >
                    <Plus className="size-3.5" /> Add Material
                  </Button>
                </div>

                <div className="overflow-hidden rounded-xl border border-[#DCE6F3] bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-[#DCE6F3] bg-[#F1F5FA] text-[10px] font-bold uppercase tracking-wider text-[#526580]">
                      <tr>
                        <th className="p-2.5">Component Material</th>
                        <th className="p-2.5 w-28">Code</th>
                        <th className="p-2.5 w-24 text-center">BOM / Unit</th>
                        <th className="w-28 p-2.5 text-center font-black text-[#0866FF]">
                          Req. Qty (Editable)
                        </th>
                        <th className="p-2.5 w-16">UOM</th>
                        <th className="p-2.5 w-10 text-right"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DCE6F3]">
                      {mrModal.items.map((row, idx) => (
                        <tr key={idx} className="hover:bg-[#F8FAFD]">
                          <td className="p-2.5">
                            {row.material_code && row.material_name ? (
                              <span className="font-semibold text-foreground">
                                {row.material_name}
                              </span>
                            ) : (
                              <Select
                                value={row.material_id || ""}
                                onValueChange={(val) => handleSelectMaterialForMr(idx, val)}
                              >
                                <SelectTrigger className="h-8 text-xs rounded-lg">
                                  <SelectValue placeholder="Select material..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {masterMaterials.map((mat) => (
                                    <SelectItem key={mat.id} value={mat.id}>
                                      {mat.material_name} ({mat.material_code})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </td>
                          <td className="p-2.5 font-mono text-muted-foreground">
                            {row.material_code || "-"}
                          </td>
                          <td className="p-2.5 text-center text-muted-foreground font-semibold">
                            {row.bom_per_unit_qty ? `${row.bom_per_unit_qty} / unit` : "-"}
                          </td>
                          <td className="p-2.5 text-center">
                            <Input
                              type="number"
                              min="0.01"
                              step="any"
                              value={row.quantity}
                              onChange={(e) =>
                                setMrModal((prev) => ({
                                  ...prev,
                                  items: prev.items.map((r, i) =>
                                    i === idx ? { ...r, quantity: e.target.value } : r,
                                  ),
                                }))
                              }
                              className="mx-auto h-8 w-24 rounded-lg border-[#0866FF]/40 text-center text-xs font-bold text-[#0866FF] focus-visible:border-[#0866FF] focus-visible:ring-[#0866FF]/20"
                            />
                          </td>
                          <td className="p-2.5 font-semibold text-muted-foreground">{row.uom}</td>
                          <td className="p-2.5 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveMrRow(idx)}
                              disabled={mrModal.items.length <= 1}
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Requisition Meta Details */}
              <div className="grid grid-cols-1 gap-4 rounded-2xl border border-[#DCE6F3] bg-white p-4 sm:grid-cols-3">
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-[#526580]">
                    Target Warehouse
                  </Label>
                  <Input
                    value={mrModal.warehouse_id}
                    onChange={(e) =>
                      setMrModal((prev) => ({ ...prev, warehouse_id: e.target.value }))
                    }
                    className="mt-1.5 h-10 rounded-xl border-[#DCE6F3] bg-[#F8FAFD] text-xs focus-visible:border-[#0866FF] focus-visible:ring-[#0866FF]/20"
                  />
                </div>
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-[#526580]">
                    Priority
                  </Label>
                  <Select
                    value={mrModal.priority}
                    onValueChange={(val) => setMrModal((prev) => ({ ...prev, priority: val }))}
                  >
                    <SelectTrigger className="mt-1.5 h-10 rounded-xl border-[#DCE6F3] bg-[#F8FAFD] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">LOW</SelectItem>
                      <SelectItem value="MEDIUM">MEDIUM</SelectItem>
                      <SelectItem value="HIGH">HIGH</SelectItem>
                      <SelectItem value="CRITICAL">CRITICAL</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-bold uppercase tracking-wider text-[#526580]">
                    Required Date
                  </Label>
                  <Input
                    type="date"
                    value={mrModal.required_date}
                    onChange={(e) =>
                      setMrModal((prev) => ({ ...prev, required_date: e.target.value }))
                    }
                    className="mt-1.5 h-10 rounded-xl border-[#DCE6F3] bg-[#F8FAFD] text-xs focus-visible:border-[#0866FF] focus-visible:ring-[#0866FF]/20"
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-[#DCE6F3] bg-white p-4">
                <Label className="text-xs font-bold uppercase tracking-wider text-[#526580]">
                  Requisition Remarks
                </Label>
                <Textarea
                  value={mrModal.remarks}
                  onChange={(e) => setMrModal((prev) => ({ ...prev, remarks: e.target.value }))}
                  rows={2}
                  className="mt-1.5 resize-none rounded-xl border-[#DCE6F3] bg-[#F8FAFD] text-xs focus-visible:border-[#0866FF] focus-visible:ring-[#0866FF]/20"
                />
              </div>
            </div>

            <DialogFooter className="shrink-0 gap-2 border-t border-[#DCE6F3] bg-white px-6 py-4">
              <Button
                variant="outline"
                onClick={() => setMrModal((prev) => ({ ...prev, open: false }))}
                className="rounded-xl border-[#DCE6F3] bg-white text-[#101D3A] hover:bg-[#F5F8FF]"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitMaterialRequest}
                disabled={submittingMr}
                className="gap-1.5 rounded-xl bg-[#0866FF] font-bold text-white hover:bg-[#0054D6]"
              >
                {submittingMr ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ClipboardList className="size-4" />
                )}
                Submit Material Requisition
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
