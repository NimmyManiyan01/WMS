import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import {
  ClipboardCheck,
  Search,
  Loader2,
  Calendar,
  Building2,
  CheckCircle2,
  Clock,
  ArrowRight,
  Warehouse,
  Boxes,
  Eye,
  Send,
  Sparkles,
  Plus,
  Package,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import { AppShell, StatusBadge } from "@/components/wms/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/warehouse/assembly-requisitions")({
  head: () => ({
    meta: [
      { title: "Assembly Material Requisitions · NexusWMS" },
      {
        name: "description",
        content:
          "Review Assembly material requisitions, approve and assign fulfilling Stores for pickup tasks.",
      },
    ],
  }),
  component: WarehouseAssemblyRequisitionsPage,
});

const DEFAULT_CATEGORIES = [
  "Raw Materials",
  "Mechanical Components",
  "Electrical",
  "Steel & Metals",
  "Fasteners & Hardware",
  "Chemicals & Coatings",
  "Pipes & Fittings",
  "Packaging",
  "Consumables",
];

const UOM_OPTIONS = ["PCS", "MTR", "KG", "LTR", "BOX", "PKT", "SET", "NOS", "ROLL", "TON"];

function WarehouseAssemblyRequisitionsPage() {
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Store Assignment modal
  const [assigningReq, setAssigningReq] = useState<any>(null);
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [assigning, setAssigning] = useState(false);

  // View details modal
  const [viewingReq, setViewingReq] = useState<any>(null);

  // Create Material modal for custom items
  const [creatingMaterialReq, setCreatingMaterialReq] = useState<any>(null);
  const [creatingMaterialItem, setCreatingMaterialItem] = useState<any>(null);
  const [materialForm, setMaterialForm] = useState({
    material_code: "",
    material_name: "",
    category: "Raw Materials",
    base_uom: "PCS",
    description: "",
  });
  const [suggestedCodeLoading, setSuggestedCodeLoading] = useState(false);
  const [creatingMaterialLoading, setCreatingMaterialLoading] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [reqData, storeData, hierarchyData, catData] = await Promise.all([
        api.getAssemblyRequisitions(),
        api.getStores({ status: "ACTIVE" }).catch(() => []),
        api.getStoreHierarchy().catch(() => []),
        api.getMaterialCategories().catch(() => DEFAULT_CATEGORIES),
      ]);
      setRequisitions(reqData || []);
      // Store endpoints have returned both a plain array and wrapped payloads
      // in older deployments. Normalize both shapes so the assignment list is
      // never empty when the store master is populated.
      const storeList = Array.isArray(storeData)
        ? storeData
        : Array.isArray((storeData as any)?.items)
          ? (storeData as any).items
          : [];
      const hierarchyList = Array.isArray(hierarchyData)
        ? hierarchyData
        : Array.isArray((hierarchyData as any)?.stores)
          ? (hierarchyData as any).stores
          : [];
      setStores(storeList.length ? storeList : hierarchyList);
      if (catData && catData.length > 0) {
        setCategories(catData);
      }
    } catch {
      toast.error("Failed to load assembly requisitions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCreateMaterial = async (req: any, item: any) => {
    setCreatingMaterialReq(req);
    setCreatingMaterialItem(item);
    setSuggestedCodeLoading(true);
    try {
      const codeRes = await api
        .getNextMaterialCode()
        .catch(() => ({ suggested_material_code: "MAT-001" }));
      const customName =
        item.custom_material_name ||
        item.customMaterialName ||
        item.material_name ||
        item.materialName ||
        "";

      setMaterialForm({
        material_code: codeRes?.suggested_material_code || "MAT-001",
        material_name: customName,
        category: "Raw Materials",
        base_uom: item.uom || "PCS",
        description: `Created from Assembly Requisition ${req.requisitionNumber || req.requisition_number}`,
      });
    } finally {
      setSuggestedCodeLoading(false);
    }
  };

  const handleCreateMaterialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creatingMaterialReq || !creatingMaterialItem) return;
    if (!materialForm.material_name.trim()) {
      toast.error("Material name is required");
      return;
    }

    setCreatingMaterialLoading(true);
    try {
      const res = await api.createMaterialForAssemblyRequisitionItem(
        creatingMaterialReq.id,
        creatingMaterialItem.id,
        {
          material_name: materialForm.material_name.trim(),
          category: materialForm.category,
          base_uom: materialForm.base_uom,
          description: materialForm.description,
        },
      );
      const updatedItem = (res?.items || []).find(
        (i: any) => i.id === creatingMaterialItem.id,
      );
      const generatedCode =
        updatedItem?.material_code ||
        updatedItem?.materialCode ||
        materialForm.material_code;

      toast.success(
        `Material ${generatedCode} created successfully in Material Master and linked to requisition line!`,
      );
      setCreatingMaterialReq(null);
      setCreatingMaterialItem(null);

      // Refresh viewing state if viewing modal is open
      if (viewingReq && viewingReq.id === res.id) {
        setViewingReq(res);
      }
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to create material master item");
    } finally {
      setCreatingMaterialLoading(false);
    }
  };

  const handleAssignStore = async () => {
    if (!assigningReq || !selectedStoreId) {
      toast.error("Please select a Store to fulfill this requisition");
      return;
    }

    setAssigning(true);
    try {
      const res = await api.assignAssemblyRequisitionStore(assigningReq.id, selectedStoreId);
      toast.success(
        `Requisition assigned to ${res?.assigned_store?.store_name || "Store"}! Pickup tasks created for Store Keepers.`,
      );
      setAssigningReq(null);
      setSelectedStoreId("");
      fetchData();
    } catch (err: any) {
      toast.error(err.message || "Failed to assign store to requisition");
    } finally {
      setAssigning(false);
    }
  };

  const filteredRequisitions = useMemo(() => {
    return requisitions.filter((r) => {
      const matchesStatus =
        statusFilter === "ALL" || (r.status || "").toUpperCase() === statusFilter.toUpperCase();
      const q = search.trim().toLowerCase();
      const reqNum = (r.requisitionNumber || r.requisition_number || "").toLowerCase();
      const matchesSearch =
        !q ||
        reqNum.includes(q) ||
        (r.department || "").toLowerCase().includes(q) ||
        (r.remarks || "").toLowerCase().includes(q) ||
        (r.items || []).some((it: any) =>
          (it.materialName || it.material_name || it.materialCode || it.material_code || "")
            .toLowerCase()
            .includes(q),
        );
      return matchesStatus && matchesSearch;
    });
  }, [requisitions, search, statusFilter]);

  return (
    <AppShell
      title="Assembly Material Requisitions"
      subtitle="Review internal requisitions from Assembly and assign destination Stores for physical pickup"
    >
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative w-72">
            <Search className="size-3.5 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Search requisition or item..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-xs rounded-xl bg-background/60 border-border/40"
            />
          </div>

          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44 h-9 text-xs rounded-xl border-border/40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="PENDING">Pending Store Assignment</SelectItem>
                <SelectItem value="ASSIGNED_TO_STORE">Assigned to Store</SelectItem>
                <SelectItem value="PICKING">Picking In Progress</SelectItem>
                <SelectItem value="PARTIALLY_ISSUED">Partially Issued</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              className="h-9 rounded-xl text-xs"
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm">Loading assembly requisitions...</p>
          </div>
        ) : filteredRequisitions.length === 0 ? (
          <Card className="border-dashed border-border/60 p-12 text-center bg-card/40">
            <ClipboardCheck className="size-10 mx-auto text-muted-foreground opacity-40 mb-3" />
            <h3 className="text-sm font-bold text-foreground">No Requisitions Found</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Assembly requisitions awaiting warehouse store assignment or processing will appear
              here.
            </p>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filteredRequisitions.map((req) => {
              const isAssigned = Boolean(req.assignedStoreId || req.assigned_store_id);
              const isPending = (req.status || "").toUpperCase() === "PENDING";
              const allAvailable = Boolean(
                req.allItemsAvailable ??
                req.all_items_available ??
                req.canAssignStore ??
                req.can_assign_store,
              );

              return (
                <Card
                  key={req.id}
                  className="border-border/40 hover:border-primary/40 transition-colors shadow-soft"
                >
                  <CardContent className="p-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-sm font-bold text-foreground">
                            {req.requisitionNumber || req.requisition_number}
                          </span>
                          <StatusBadge status={req.status} />
                          {req.priority && (
                            <span
                              className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                                req.priority === "URGENT"
                                  ? "bg-red-100 text-red-700"
                                  : req.priority === "HIGH"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-blue-100 text-blue-700",
                              )}
                            >
                              {req.priority}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Building2 className="size-3.5" /> Department:{" "}
                            <strong className="text-foreground">{req.department}</strong>
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="size-3.5" /> Required Date:{" "}
                            <strong className="text-foreground">
                              {new Date(req.requiredDate || req.required_date).toLocaleDateString()}
                            </strong>
                          </span>
                          <span className="flex items-center gap-1">
                            <Boxes className="size-3.5" /> Items:{" "}
                            <strong className="text-foreground">{(req.items || []).length}</strong>
                          </span>
                        </div>

                        {/* Custom Items Banner */}
                        {((req.items || []).some(
                          (it: any) =>
                            it.isCustom ||
                            it.is_custom ||
                            it.materialCode === "CUSTOM" ||
                            it.material_code === "CUSTOM",
                        )) && (
                          <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-medium">
                              <Sparkles className="size-4 text-amber-500 shrink-0" />
                              <span>
                                Contains{" "}
                                <strong>
                                  {
                                    (req.items || []).filter(
                                      (it: any) =>
                                        it.isCustom ||
                                        it.is_custom ||
                                        it.materialCode === "CUSTOM" ||
                                        it.material_code === "CUSTOM",
                                    ).length
                                  }{" "}
                                  New / Custom Raw Material(s)
                                </strong>{" "}
                                requiring Material Master creation.
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Store Info & Material Availability Banner */}
                        {isAssigned ? (
                          <div className="text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 px-3 py-1.5 rounded-xl flex items-center gap-2 font-medium">
                            <Warehouse className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>
                              Assigned Store:{" "}
                              <strong>{req.assignedStoreName || req.assigned_store_name}</strong> (
                              {req.assignedStoreCode || req.assigned_store_code})
                            </span>
                          </div>
                        ) : isPending ? (
                          allAvailable ? (
                            <div className="text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 px-3 py-1.5 rounded-xl flex items-center gap-2 font-medium">
                              <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span>
                                {req.availabilityMessage ||
                                  req.availability_message ||
                                  "All materials available in inventory — Ready for Store assignment"}
                              </span>
                            </div>
                          ) : (
                            <div className="text-xs bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 px-3 py-1.5 rounded-xl flex items-center gap-2 font-medium">
                              <AlertTriangle className="size-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                              <span>
                                {req.availabilityMessage ||
                                  req.availability_message ||
                                  "Material shortage — Store assignment unavailable"}
                              </span>
                            </div>
                          )
                        ) : (
                          <div className="text-xs bg-muted/40 border border-border/40 text-muted-foreground px-3 py-1.5 rounded-xl flex items-center gap-2 font-medium">
                            <Clock className="size-3.5 shrink-0" />
                            <span>Status: {req.status}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl h-9 text-xs"
                          onClick={() => setViewingReq(req)}
                        >
                          <Eye className="size-3.5 mr-1" /> View Items
                        </Button>

                        {isPending && allAvailable && (
                          <Button
                            size="sm"
                            className="rounded-xl h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold"
                            onClick={() => {
                              setAssigningReq(req);
                              setSelectedStoreId(
                                req.assignedStoreId ||
                                  req.assigned_store_id ||
                                  (stores.length === 1 ? String(stores[0].id) : ""),
                              );
                            }}
                          >
                            <Send className="size-3.5 mr-1.5" /> Assign Store
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Assign Store Modal */}
      <Dialog open={Boolean(assigningReq)} onOpenChange={(open) => !open && setAssigningReq(null)}>
        <DialogContent className="max-w-md rounded-3xl p-6 bg-card border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Warehouse className="size-5 text-blue-600" />
              Assign Fulfilling Store
            </DialogTitle>
          </DialogHeader>

          {assigningReq && (
            <div className="space-y-4 py-2">
              <div className="p-3 bg-muted/40 rounded-2xl space-y-1 text-xs">
                <p className="text-muted-foreground">Requisition Number:</p>
                <p className="font-mono font-bold text-sm text-foreground">
                  {assigningReq.requisitionNumber || assigningReq.requisition_number}
                </p>
                <p className="text-muted-foreground mt-1">
                  Department: <strong className="text-foreground">{assigningReq.department}</strong>{" "}
                  · Priority: <strong className="text-foreground">{assigningReq.priority}</strong>
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold">Select Fulfilling Store</Label>
                <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                  <SelectTrigger className="rounded-xl text-xs h-10 border-border/40">
                    <SelectValue placeholder="Choose a Store (e.g. Mechanical Store, Electrical Store)..." />
                  </SelectTrigger>
                  <SelectContent>
                    {stores.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-mono font-bold text-primary">
                            {s.store_code || s.storeCode}
                          </span>
                          <span>—</span>
                          <span className="font-medium">{s.store_name || s.storeName}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Assigning a Store will automatically create Pickup Tasks for that store's Store
                  Keepers and send them targeted notifications.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="ghost" className="rounded-xl" onClick={() => setAssigningReq(null)}>
              Cancel
            </Button>
            <Button
              className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
              disabled={assigning || !selectedStoreId}
              onClick={handleAssignStore}
            >
              {assigning ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : (
                <CheckCircle2 className="size-4 mr-2" />
              )}
              Confirm Pickup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Modal */}
      <Dialog open={Boolean(viewingReq)} onOpenChange={(open) => !open && setViewingReq(null)}>
        <DialogContent className="max-w-xl rounded-3xl p-6 bg-card border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <ClipboardCheck className="size-5 text-blue-600" />
              Requisition Details
            </DialogTitle>
          </DialogHeader>

          {viewingReq && (
            <div className="space-y-4 py-2 text-xs">
              <div className="flex justify-between items-center bg-muted/40 p-3 rounded-2xl">
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">
                    Requisition Number
                  </p>
                  <p className="font-mono font-bold text-sm text-foreground">
                    {viewingReq.requisitionNumber || viewingReq.requisition_number}
                  </p>
                </div>
                <StatusBadge status={viewingReq.status} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-muted-foreground">Department:</span>{" "}
                  <strong className="text-foreground">{viewingReq.department}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Requested By:</span>{" "}
                  <strong className="text-foreground">
                    {viewingReq.requested_by || viewingReq.requestedBy}
                  </strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Required Date:</span>{" "}
                  <strong className="text-foreground">
                    {new Date(
                      viewingReq.requiredDate || viewingReq.required_date,
                    ).toLocaleDateString()}
                  </strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Priority:</span>{" "}
                  <strong className="text-foreground">{viewingReq.priority}</strong>
                </div>
              </div>

              {/* Availability Alert in Modal */}
              {viewingReq.status === "PENDING" && (
                (viewingReq.allItemsAvailable ??
                viewingReq.all_items_available ??
                viewingReq.canAssignStore ??
                viewingReq.can_assign_store) ? (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-2.5 text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div className="flex-1">
                      <p className="font-bold text-xs">Inventory Available</p>
                      <p className="text-[11px] opacity-90">
                        {viewingReq.availabilityMessage ||
                          viewingReq.availability_message ||
                          "All requested materials are available in inventory — Ready for Store assignment."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-2.5 text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div className="flex-1">
                      <p className="font-bold text-xs">Store Assignment Unavailable</p>
                      <p className="text-[11px] opacity-90">
                        {viewingReq.availabilityMessage ||
                          viewingReq.availability_message ||
                          "Material shortage — Store assignment unavailable until inventory is replenished or custom items are registered."}
                      </p>
                    </div>
                  </div>
                )
              )}

              <div className="space-y-2">
                <p className="font-bold text-muted-foreground uppercase text-[11px]">
                  Requested Materials & Inventory Status
                </p>
                <div className="divide-y divide-border/30 border border-border/40 rounded-2xl overflow-hidden bg-card">
                  {(viewingReq.items || []).map((it: any, idx: number) => {
                    const isCustom =
                      it.isCustom ||
                      it.is_custom ||
                      it.materialCode === "CUSTOM" ||
                      it.material_code === "CUSTOM";
                    const isPendingCreation =
                      isCustom && (!it.materialId && !it.material_id);
                    const reqQty = Number(
                      it.requestedQuantity || it.requested_quantity || it.quantity || 0,
                    );
                    const availQty = Number(it.availableQuantity ?? it.available_quantity ?? 0);
                    const hasSufficient = Boolean(
                      it.hasSufficientStock ?? it.has_sufficient_stock ?? (availQty >= reqQty),
                    );
                    const shortageQty = Number(
                      it.shortageQuantity ?? it.shortage_quantity ?? Math.max(0, reqQty - availQty),
                    );

                    return (
                      <div
                        key={idx}
                        className={cn(
                          "p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs transition-colors",
                          isCustom
                            ? "bg-amber-500/5 hover:bg-amber-500/10"
                            : !hasSufficient
                              ? "bg-red-500/5 hover:bg-red-500/10"
                              : "hover:bg-muted/30",
                        )}
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-foreground text-sm">
                              {it.custom_material_name ||
                                it.customMaterialName ||
                                it.materialName ||
                                it.material_name}
                            </p>
                            {isCustom ? (
                              <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] font-bold">
                                ✨ NEW MATERIAL
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] font-mono">
                                {it.materialCode || it.material_code}
                              </Badge>
                            )}

                            {/* Inventory Stock Badge */}
                            {!isPendingCreation && (
                              hasSufficient ? (
                                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
                                  ✓ Stock Available ({availQty} in stock)
                                </Badge>
                              ) : (
                                <Badge className="bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30 text-[10px] font-bold">
                                  ⚠ Shortage: {shortageQty} {it.uom} (Avail: {availQty})
                                </Badge>
                              )
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                            {isCustom ? (
                              <span>
                                Status:{" "}
                                <strong
                                  className={
                                    isPendingCreation
                                      ? "text-amber-600 font-bold"
                                      : "text-emerald-600 font-bold"
                                  }
                                >
                                  {isPendingCreation
                                    ? "Pending Material Master Record"
                                    : `Linked (${it.materialCode || it.material_code})`}
                                </strong>
                              </span>
                            ) : (
                              <span>
                                Code:{" "}
                                <strong className="text-foreground">
                                  {it.materialCode || it.material_code}
                                </strong>
                                {it.variantCode || it.variant_code
                                  ? ` · Spec: ${it.variantCode || it.variant_code}`
                                  : ""}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 justify-between sm:justify-end">
                          <div className="text-right">
                            <span className="font-mono font-bold text-primary text-sm">
                              {reqQty} {it.uom}
                            </span>
                            {(it.issuedQuantity || it.issued_quantity) > 0 && (
                              <p className="text-[10px] text-emerald-600 font-bold">
                                Issued: {it.issuedQuantity || it.issued_quantity}
                              </p>
                            )}
                            <p className="text-[10px] text-muted-foreground">
                              Avail: <strong className={hasSufficient ? "text-emerald-600" : "text-red-600"}>{availQty}</strong> {it.uom}
                            </p>
                          </div>

                          {isPendingCreation && (
                            <Button
                              size="sm"
                              className="h-8 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm ml-2"
                              onClick={() => handleOpenCreateMaterial(viewingReq, it)}
                            >
                              <Sparkles className="size-3.5 mr-1" /> Create Material
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {viewingReq.remarks && (
                <div className="p-3 bg-muted/20 rounded-xl text-muted-foreground">
                  <strong>Remarks:</strong> {viewingReq.remarks}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setViewingReq(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Material Master Modal for Custom Requisition Items */}
      <Dialog
        open={Boolean(creatingMaterialReq && creatingMaterialItem)}
        onOpenChange={(open) => {
          if (!open) {
            setCreatingMaterialReq(null);
            setCreatingMaterialItem(null);
          }
        }}
      >
        <DialogContent className="max-w-lg rounded-3xl p-6 bg-card border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="size-5 text-amber-500" />
              Create Material in Master Data
            </DialogTitle>
          </DialogHeader>

          {creatingMaterialItem && (
            <form onSubmit={handleCreateMaterialSubmit} className="space-y-4 py-2 text-xs">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-1">
                <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">
                  Custom Assembly Request Line:
                </p>
                <p className="text-sm font-bold text-foreground">
                  {creatingMaterialItem.custom_material_name ||
                    creatingMaterialItem.customMaterialName ||
                    creatingMaterialItem.material_name ||
                    creatingMaterialItem.materialName}
                </p>
                <p className="text-muted-foreground text-[11px]">
                  Requested:{" "}
                  <strong>
                    {creatingMaterialItem.quantity || creatingMaterialItem.requested_quantity}{" "}
                    {creatingMaterialItem.uom}
                  </strong>{" "}
                  · Req #{creatingMaterialReq?.requisitionNumber || creatingMaterialReq?.requisition_number}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold flex items-center justify-between">
                    Generated Code
                    {suggestedCodeLoading && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
                  </Label>
                  <Input
                    value={materialForm.material_code}
                    readOnly
                    className="h-9 rounded-xl bg-muted/50 font-mono font-bold text-xs text-primary border-border/40"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Canonical auto-sequenced code
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Base UOM</Label>
                  <Select
                    value={materialForm.base_uom}
                    onValueChange={(val) => setMaterialForm({ ...materialForm, base_uom: val })}
                  >
                    <SelectTrigger className="h-9 rounded-xl text-xs border-border/40">
                      <SelectValue placeholder="Select UOM" />
                    </SelectTrigger>
                    <SelectContent>
                      {UOM_OPTIONS.map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Material Name *</Label>
                <Input
                  value={materialForm.material_name}
                  onChange={(e) =>
                    setMaterialForm({ ...materialForm, material_name: e.target.value })
                  }
                  className="h-9 rounded-xl text-xs border-border/40"
                  placeholder="e.g. Special Impeller Shaft"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Category</Label>
                <Select
                  value={materialForm.category}
                  onValueChange={(val) => setMaterialForm({ ...materialForm, category: val })}
                >
                  <SelectTrigger className="h-9 rounded-xl text-xs border-border/40">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Description / Technical Specifications</Label>
                <Textarea
                  value={materialForm.description}
                  onChange={(e) =>
                    setMaterialForm({ ...materialForm, description: e.target.value })
                  }
                  className="rounded-xl text-xs border-border/40 min-h-[60px]"
                  placeholder="Optional material specs, grade, dimensions, etc."
                />
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-xl"
                  onClick={() => {
                    setCreatingMaterialReq(null);
                    setCreatingMaterialItem(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold"
                  disabled={creatingMaterialLoading || !materialForm.material_name.trim()}
                >
                  {creatingMaterialLoading ? (
                    <Loader2 className="size-4 animate-spin mr-2" />
                  ) : (
                    <Sparkles className="size-4 mr-2" />
                  )}
                  Create & Link to Requisition
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
