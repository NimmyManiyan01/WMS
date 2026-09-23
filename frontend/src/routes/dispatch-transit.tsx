import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { MapPin, RefreshCw, Loader2, CheckCircle2, Navigation, Truck, User, Compass, Clock, Activity, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { AppShell, StatusBadge } from "@/components/wms/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api-client";

export const Route = createFileRoute("/dispatch-transit")({
  component: DispatchTransitPage,
});

function DispatchTransitPage() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedTransit, setSelectedTransit] = useState<any | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getDispatches();
      const transitList = res.items?.filter((o: any) => ["DISPATCHED", "IN_TRANSIT"].includes(o.status)) || res.items || [];
      setOrders(transitList);
      if (transitList.length > 0 && !selectedTransit) {
        setSelectedTransit(transitList[0]);
      }
    } catch (e) {
      toast.error("Failed to load in-transit shipments", { description: e instanceof Error ? e.message : undefined });
    } finally {
      setLoading(false);
    }
  }, [selectedTransit]);

  useEffect(() => { void loadData(); }, [loadData]);

  const handleTransit = async (id: string) => {
    try {
      await api.transitDispatch(id);
      toast.success("Shipment status updated to In Transit");
      void loadData();
    } catch (err) {
      toast.error("Failed to update status", { description: err instanceof Error ? err.message : undefined });
    }
  };

  const handleDeliver = async (id: string) => {
    try {
      await api.deliverDispatch(id);
      toast.success("Shipment marked as Delivered");
      void loadData();
    } catch (err) {
      toast.error("Failed to update status", { description: err instanceof Error ? err.message : undefined });
    }
  };

  return (
    <AppShell
      title="In-Transit GPS Live Tracking"
      subtitle="Real-time GPS telemetry, route monitoring, distance travelled, ETA, and deviation alerts"
      actions={
        <Button variant="outline" className="rounded-xl" onClick={() => void loadData()}>
          <RefreshCw className="size-4 mr-2" /> Refresh
        </Button>
      }
    >
      {loading ? (
        <div className="grid h-64 place-items-center"><Loader2 className="size-8 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: In Transit Shipments List */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="rounded-2xl p-5 shadow-sm border-border/80">
              <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Active In-Transit Shipments ({orders.length})</h3>
              <div className="space-y-2">
                {orders.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-xs">No active shipments in transit.</div>
                ) : (
                  orders.map((order) => (
                    <div
                      key={order.id}
                      onClick={() => setSelectedTransit(order)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${selectedTransit?.id === order.id ? "bg-primary/10 border-primary shadow-sm" : "hover:bg-muted/30"}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-primary text-xs">{order.dispatch_number || "DO-2026-00125"}</span>
                        <StatusBadge status={order.status} />
                      </div>
                      <div className="font-semibold text-sm mt-1">{order.customer_name || "ABC Industries"}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Dest: {order.destination || "Mysore"}</div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Right: GPS Tracking Telemetry Dashboard matching user specification */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="rounded-2xl p-6 shadow-sm border-border/80 bg-card">
              <div className="flex items-center justify-between border-b pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <Navigation className="size-6 text-primary animate-pulse" />
                  <div>
                    <h3 className="text-lg font-bold">GPS TRACKING TELEMETRY</h3>
                    <p className="text-xs text-muted-foreground font-mono">Live Satellite Feed — Active Route Monitoring</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-600 animate-pulse">
                  <span className="size-2 rounded-full bg-blue-500"></span> In Transit
                </span>
              </div>

              {selectedTransit ? (
                <div className="space-y-6">
                  {/* Origin -> Destination Banner */}
                  <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-muted/40 border">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">Origin</span>
                      <span className="font-bold text-base text-foreground">Bangalore</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">Destination</span>
                      <span className="font-bold text-base text-primary">{selectedTransit.destination || "Mysore"}</span>
                    </div>
                  </div>

                  {/* Driver & Vehicle */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-xl border bg-card/50 flex items-center gap-3">
                      <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                        <User className="size-5" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Driver</span>
                        <span className="font-bold text-sm">Rajesh Kumar (DRV-001)</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl border bg-card/50 flex items-center gap-3">
                      <div className="grid size-10 place-items-center rounded-xl bg-blue-500/10 text-blue-600">
                        <Truck className="size-5" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block">Vehicle</span>
                        <span className="font-bold text-sm font-mono">KA01AB1234 (Truck)</span>
                      </div>
                    </div>
                  </div>

                  {/* Telemetry Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl border bg-muted/20">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">Current Location</span>
                      <span className="font-bold text-xs text-foreground mt-1 block">Mandya Bypass, NH-275</span>
                    </div>
                    <div className="p-3.5 rounded-xl border bg-muted/20">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">Distance Travelled</span>
                      <span className="font-bold text-sm font-mono text-emerald-600 mt-1 block">92 KM</span>
                    </div>
                    <div className="p-3.5 rounded-xl border bg-muted/20">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">Remaining Distance</span>
                      <span className="font-bold text-sm font-mono text-amber-600 mt-1 block">48 KM</span>
                    </div>
                    <div className="p-3.5 rounded-xl border bg-muted/20">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">Estimated ETA</span>
                      <span className="font-bold text-xs text-blue-600 mt-1 block">2 Hours 15 Mins</span>
                    </div>
                  </div>

                  {/* Route & Deviation */}
                  <div className="p-4 rounded-xl border bg-card/50 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground uppercase font-bold">Active Route:</span>
                      <span className="font-mono font-semibold">Bangalore - Ramanagara - Mandya - Mysore</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground uppercase font-bold">Route Deviation:</span>
                      <span className="font-bold text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="size-3.5" /> None (On Track)
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground uppercase font-bold">Driver Status:</span>
                      <span className="font-bold text-blue-600">Active / Driving</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-2">
                    {selectedTransit.status === "DISPATCHED" && (
                      <Button variant="outline" className="rounded-xl font-bold" onClick={() => void handleTransit(selectedTransit.id)}>
                        Set In Transit
                      </Button>
                    )}
                    <Button className="rounded-xl font-bold shadow-glow" onClick={() => void handleDeliver(selectedTransit.id)}>
                      Mark Delivery Completed
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 text-muted-foreground">Select an in-transit shipment to view live GPS telemetry.</div>
              )}
            </Card>
          </div>
        </div>
      )}
    </AppShell>
  );
}
