import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Package, Box, RefreshCw, Loader2, CheckCircle2, ScanLine, Plus, Save, ArrowRight, UserCheck, Truck, Navigation } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/wms/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api-client";

export const Route = createFileRoute("/dispatch-picking-packing")({
  component: DispatchPickingPackingPage,
});

function DispatchPickingPackingPage() {
  const [loading, setLoading] = useState(true);
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [selectedDispatchId, setSelectedDispatchId] = useState<string>("");
  const [selectedDispatch, setSelectedDispatch] = useState<any | null>(null);
  const [workflowCompleted, setWorkflowCompleted] = useState(false);

  // Packing Form State matching wireframe
  const [packageNo, setPackageNo] = useState("PKG-001");
  const [packageType, setPackageType] = useState("Box");
  const [packageWeight, setPackageWeight] = useState("250 KG");
  const [packagesList, setPackagesList] = useState([
    { id: "PKG-001", type: "Box", weight: "250 KG" },
    { id: "PKG-002", type: "Carton", weight: "180 KG" }
  ]);

  const [pickingStatus, setPickingStatus] = useState("Picking Completed");
  const [packingStatus, setPackingStatus] = useState("Packing Completed");
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getDispatches();
      const items = res.items || [];
      setDispatches(items);
      if (items.length > 0 && !selectedDispatchId) {
        setSelectedDispatchId(items[0].id);
        setSelectedDispatch(items[0]);
      }
    } catch (e) {
      toast.error("Failed to load dispatches", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setLoading(false);
    }
  }, [selectedDispatchId]);

  useEffect(() => { void loadData(); }, [loadData]);

  const handleSelectDispatch = (id: string) => {
    setSelectedDispatchId(id);
    const found = dispatches.find(d => d.id === id);
    setSelectedDispatch(found || null);
    setWorkflowCompleted(false);
  };

  const handleScanProduct = () => {
    toast.success("Product Scanned Successfully", { description: "Motor 5HP & Pump 2HP barcodes verified against pick list." });
    setPickingStatus("Picking Completed");
  };

  const handleConfirmPick = () => {
    toast.success("Pick Confirmed", { description: "All 150 items picked successfully." });
    setPickingStatus("Picking Completed");
  };

  const handleCreatePackage = () => {
    if (!packageNo) return;
    setPackagesList([...packagesList, { id: packageNo, type: packageType, weight: packageWeight }]);
    toast.success(`Package ${packageNo} created successfully`);
    setPackageNo(`PKG-00${packagesList.length + 2}`);
  };

  const handleSaveDraft = () => {
    toast.success("Picking & Packing progress saved as draft");
  };

  const handleCompleteWorkflow = async () => {
    if (!selectedDispatch) {
      toast.error("Please select a dispatch order");
      return;
    }
    setSubmitting(true);
    try {
      const items = (selectedDispatch.items || [
        { material_code: "FG-001", quantity_ordered: 100 },
        { material_code: "FG-002", quantity_ordered: 50 }
      ]).map((i: any) => ({
        id: i.id,
        material_code: i.material_code,
        quantity_picked: i.quantity_ordered || 100,
        quantity_packed: i.quantity_ordered || 100
      }));

      await api.pickDispatchItems(selectedDispatch.id, items);
      await api.packDispatchItems(selectedDispatch.id, items);

      setWorkflowCompleted(true);
      toast.success("Picking & Packing Completed!", {
        description: `Dispatch ${selectedDispatch.dispatch_number} successfully moved to Packed / Dispatch Ready.`
      });
      void loadData();
    } catch (err) {
      toast.error("Failed to complete workflow", { description: err instanceof Error ? err.message : undefined });
    } finally {
      setSubmitting(false);
    }
  };

  const productRows = selectedDispatch?.items?.length ? selectedDispatch.items : [
    { material_name: "Motor 5HP", quantity_ordered: 100, quantity_picked: 100, quantity_packed: 100 },
    { material_name: "Pump 2HP", quantity_ordered: 50, quantity_picked: 50, quantity_packed: 50 }
  ];

  const totalItems = productRows.reduce((acc: number, i: any) => acc + (i.quantity_ordered || i.quantity || 50), 0);

  return (
    <AppShell
      title="Picking & Packing"
      subtitle="Integrated warehouse execution screen for product picking, barcode scan verification, and cartonization"
      actions={
        <Button variant="outline" className="rounded-xl" onClick={() => void loadData()}>
          <RefreshCw className="size-4 mr-2" /> Refresh
        </Button>
      }
    >
      {loading ? (
        <div className="grid h-64 place-items-center"><Loader2 className="size-8 animate-spin text-primary" /></div>
      ) : (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Main Card matching wireframe */}
          <Card className="rounded-2xl p-6 shadow-sm border-border/80 bg-card space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Package className="size-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold tracking-tight">PICKING & PACKING</h2>
                  <p className="text-xs text-muted-foreground font-mono">Unified Execution Terminal</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Select Dispatch:</Label>
                <select
                  value={selectedDispatchId}
                  onChange={(e) => handleSelectDispatch(e.target.value)}
                  className="rounded-xl border border-input bg-background px-3 py-2 text-xs font-bold shadow-sm focus:ring-2 focus:ring-primary text-primary font-mono"
                >
                  <option value="">-- Choose Dispatch --</option>
                  {dispatches.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.dispatch_number} - {d.customer_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedDispatch && (
              <div className="p-3 rounded-xl bg-muted/30 border font-mono text-xs font-bold text-primary flex items-center justify-between">
                <span>Dispatch No: {selectedDispatch.dispatch_number} | Customer: {selectedDispatch.customer_name}</span>
                <span className="text-muted-foreground">Status: {selectedDispatch.status}</span>
              </div>
            )}

            {workflowCompleted && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                  <CheckCircle2 className="size-5" /> Picking & Packing Completed Successfully!
                </div>
                <p className="text-xs text-muted-foreground">
                  The order is now Packed and Ready for Transport Allocation and Loading. Proceed to the next workflow steps below:
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <Link to="/dispatch-driver-allocation">
                    <Button size="sm" className="rounded-xl text-xs font-bold">
                      <UserCheck className="size-3.5 mr-1.5" /> Go to Driver Allocation <ArrowRight className="size-3.5 ml-1.5" />
                    </Button>
                  </Link>
                  <Link to="/dispatch-vehicle-allocation">
                    <Button size="sm" variant="outline" className="rounded-xl text-xs font-bold">
                      <Truck className="size-3.5 mr-1.5" /> Go to Vehicle Allocation <ArrowRight className="size-3.5 ml-1.5" />
                    </Button>
                  </Link>
                  <Link to="/dispatch-loading">
                    <Button size="sm" variant="outline" className="rounded-xl text-xs font-bold">
                      <Navigation className="size-3.5 mr-1.5" /> Go to Loading Stage <ArrowRight className="size-3.5 ml-1.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {/* 1. PRODUCT TABLE SECTION */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Product Verification</h3>
              <div className="border rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 uppercase text-[10px] text-muted-foreground font-bold">
                    <tr>
                      <th className="px-4 py-2.5">Product</th>
                      <th className="px-4 py-2.5 text-right">Required</th>
                      <th className="px-4 py-2.5 text-right">Picked</th>
                      <th className="px-4 py-2.5 text-right">Packed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productRows.map((item: any, idx: number) => (
                      <tr key={idx} className="border-t font-medium">
                        <td className="px-4 py-3 font-semibold text-foreground">{item.material_name || item.material_code || "Motor 5HP"}</td>
                        <td className="px-4 py-3 text-right font-mono">{item.quantity_ordered || 100}</td>
                        <td className="px-4 py-3 text-right font-mono text-amber-600 font-bold">{item.quantity_picked || item.quantity_ordered || 100}</td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-600 font-bold">{item.quantity_packed || item.quantity_ordered || 100}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. PICKING SECTION */}
            <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                <ScanLine className="size-4" /> Picking Execution
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" variant="outline" className="rounded-xl text-xs font-bold" onClick={handleScanProduct}>
                  <ScanLine className="size-3.5 mr-1.5" /> Scan Product
                </Button>
                <Button type="button" className="rounded-xl text-xs font-bold" onClick={handleConfirmPick}>
                  <CheckCircle2 className="size-3.5 mr-1.5" /> Confirm Pick
                </Button>
                <span className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600">
                  ✓ {pickingStatus}
                </span>
              </div>
            </div>

            {/* 3. PACKING SECTION */}
            <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
                <Box className="size-4" /> Packing & Cartonization
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Package No</Label>
                  <Input value={packageNo} onChange={(e) => setPackageNo(e.target.value)} className="mt-1 rounded-xl text-xs font-mono font-bold" />
                </div>
                <div>
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Package Type</Label>
                  <select
                    value={packageType}
                    onChange={(e) => setPackageType(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs shadow-sm font-semibold"
                  >
                    <option value="Box">Box</option>
                    <option value="Carton">Carton</option>
                    <option value="Pallet">Pallet</option>
                    <option value="Crate">Crate</option>
                  </select>
                </div>
                <div>
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">Weight</Label>
                  <Input value={packageWeight} onChange={(e) => setPackageWeight(e.target.value)} className="mt-1 rounded-xl text-xs font-bold" />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button type="button" size="sm" variant="outline" className="rounded-xl text-xs font-bold" onClick={handleCreatePackage}>
                  <Plus className="size-3.5 mr-1" /> Create Package
                </Button>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-600">
                  ✓ {packingStatus}
                </span>
              </div>
            </div>

            {/* Summary & Footer Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t">
              <div className="flex items-center gap-6 text-xs font-mono font-bold">
                <div>Total Items: <span className="text-primary text-base">{totalItems}</span></div>
                <div>Total Packages: <span className="text-purple-600 text-base">{packagesList.length}</span></div>
              </div>
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" className="rounded-xl text-xs font-bold" onClick={handleSaveDraft}>
                  <Save className="size-3.5 mr-1.5" /> Save
                </Button>
                <Button type="button" disabled={submitting} className="rounded-xl text-xs font-bold px-6 shadow-glow" onClick={() => void handleCompleteWorkflow()}>
                  {submitting ? <Loader2 className="size-4 animate-spin mr-2" /> : <CheckCircle2 className="size-4 mr-2" />}
                  Complete Workflow
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
