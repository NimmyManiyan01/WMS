import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Boxes,
  Clock3,
  Eye,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Truck,
  Warehouse,
} from "lucide-react";
import { AppShell, StatusBadge } from "@/components/wms/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { StatCard } from "@/components/wms/primitives";
import { api } from "@/lib/api-client";

export const Route = createFileRoute("/vehicle-queue")({
  head: () => ({ meta: [{ title: "Inbound Arrivals · Warehub 360 degree" }] }),
  component: InboundArrivals,
});

type Arrival = {
  id: string;
  gate_entry_number: string;
  asn_id: string;
  asn_number: string;
  po_number: string;
  supplier_name: string;
  vehicle_number: string;
  driver_name: string;
  driver_contact?: string | null;
  arrival_time: string;
  expected_arrival_at?: string | null;
  status: string;
  exited_at?: string | null;
  exited_by?: string | null;
  assigned_dock_id?: string | null;
  po_id?: string | null;
  assigned_by?: string | null;
  assigned_at?: string | null;
  movement_started_by?: string | null;
  movement_started_at?: string | null;
  dock_checked_in_by?: string | null;
  dock_arrival_at?: string | null;
  shipment: {
    transporter?: string;
    number_of_packages?: number;
    package_type?: string;
    shipping_method?: string;
  };
  expected_materials: Array<{
    item_code: string;
    material_name?: string;
    quantity: number;
    uom?: string;
  }>;
};

type Dock = {
  id: string;
  zone: string;
  type: string;
  status: "AVAILABLE" | "OCCUPIED";
  vehicle_number?: string;
};

function InboundArrivals() {
  const [arrivals, setArrivals] = useState<Arrival[]>([]);
  const [docks, setDocks] = useState<Dock[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [selectedDock, setSelectedDock] = useState<Record<string, string>>({});
  const [assigning, setAssigning] = useState<string | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const [arrivalRows, dockRows] = await Promise.all([api.getInboundArrivals(), api.getDocks()]);
      setArrivals(arrivalRows);
      setDocks(dockRows);
    } catch (error) {
      if (!quiet)
        toast.error("Unable to load inbound arrivals", {
          description: error instanceof Error ? error.message : undefined,
        });
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(true), 5000);
    return () => window.clearInterval(timer);
  }, [load]);

  async function assignDock(arrival: Arrival) {
    const dockId = selectedDock[arrival.id];
    if (!dockId) {
      toast.error("Select an available dock");
      return;
    }
    setAssigning(arrival.id);
    try {
      await api.assignDock(arrival.id, dockId);
      toast.success(`${dockId} assigned`, {
        description: `${arrival.vehicle_number} can proceed to the dock.`,
      });
      await load(true);
    } catch (error) {
      toast.error("Dock assignment failed", {
        description: error instanceof Error ? error.message : undefined,
      });
      await load(true);
    } finally {
      setAssigning(null);
    }
  }

  async function startMovement(arrival: Arrival) {
    setAssigning(arrival.id);
    try {
      await api.startDockMovement(arrival.id);
      toast.success("Vehicle instructed to move", {
        description: `${arrival.vehicle_number} is moving to ${arrival.assigned_dock_id}.`,
      });
      await load(true);
    } catch (error) {
      toast.error("Unable to start dock movement", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setAssigning(null);
    }
  }

  async function confirmDockArrival(arrival: Arrival) {
    setAssigning(arrival.id);
    try {
      await api.confirmDockCheckIn(arrival.id);
      toast.success("Vehicle arrived", {
        description: `${arrival.vehicle_number} checked in at ${arrival.assigned_dock_id}.`,
      });
      await load(true);
    } catch (error) {
      toast.error("Dock check-in failed", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setAssigning(null);
    }
  }

  const isEligibleForInboundExit = (statusStr: string) => {
    const upper = (statusStr || "").toUpperCase().trim();
    return [
      "RECEIVING_COMPLETED",
      "COMPLETED",
      "RELEASED",
      "DOCK_RELEASED",
      "GRN_POSTED",
      "QUALITY_PASSED",
      "UNLOADED",
    ].includes(upper);
  };

  async function approveGateExit(arrival: Arrival) {
    const vehName = arrival.vehicle_number || "this vehicle";
    if (
      !confirm(
        `Confirm gate exit approval for ${vehName}? Confirm that vehicle has completed unloading/receiving and is cleared to leave.`,
      )
    )
      return;
    setAssigning(arrival.id);
    try {
      const updated = await api.markInboundVehicleExited(arrival.id);
      toast.success(`Gate exit approved for ${vehName}`, {
        description: `Status updated to VEHICLE_EXITED by ${updated.exited_by || "Security"}.`,
      });
      await load(true);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("gate-entries:refresh"));
      }
    } catch (error: any) {
      toast.error("Gate exit approval failed", {
        description:
          error?.message || "Ensure receiving/unloading is complete before approving vehicle exit.",
      });
    } finally {
      setAssigning(null);
    }
  }

  return (
    <AppShell
      title="Inbound arrivals"
      subtitle="Track approved gate entries, dock movements, and vehicle status"
      actions={
        <Button
          className="rounded-xl bg-[#0866FF] text-white hover:bg-[#0054D6]"
          disabled={loading}
          onClick={() => void load()}
        >
          <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} /> Refresh
        </Button>
      }
    >
      <div className="mx-auto max-w-[1536px] space-y-6">
        <section
          aria-label="Inbound arrivals KPIs"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <StatCard
            label="Arrivals in queue"
            delta="Approved gate entries"
            value={loading ? "..." : String(arrivals.length)}
            icon={Truck}
          />
          <StatCard
            label="Awaiting dock"
            delta="Waiting for dock assignment"
            value={
              loading ? "..." : String(arrivals.filter((a) => a.status === "AWAITING_DOCK").length)
            }
            icon={Clock3}
            tone="warning"
          />
          <StatCard
            label="Moving to dock"
            delta="Vehicles en route to their dock"
            value={
              loading ? "..." : String(arrivals.filter((a) => a.status === "MOVING_TO_DOCK").length)
            }
            tone="teal"
          />
          <StatCard
            label="Available docks"
            delta="Ready for assignment"
            value={loading ? "..." : String(docks.filter((d) => d.status === "AVAILABLE").length)}
            icon={Warehouse}
            tone="success"
          />
        </section>

        <Card className="gap-0 overflow-hidden rounded-2xl border-[#DCE6F3] bg-white p-0 shadow-xs">
          <div className="flex items-center gap-3 border-b border-[#DCE6F3] px-4 py-4">
            <span className="grid size-9 place-items-center rounded-xl bg-[#EBF3FF] text-[#0866FF]">
              <Truck className="size-[18px]" aria-hidden="true" />
            </span>
            <h2 className="text-base font-bold text-[#101D3A]">Vehicle queue</h2>
          </div>
          {loading ? (
            <div className="grid h-64 place-items-center">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          ) : arrivals.length === 0 ? (
            <div className="m-4 flex flex-col items-center gap-3 rounded-xl border border-dashed border-[#DCE6F3] bg-[#F5F8FF] p-8 text-center text-[#526580]">
              <Truck className="size-6 text-[#0866FF]" aria-hidden="true" />
              <p className="text-sm font-medium">No inbound vehicles in queue</p>
            </div>
          ) : (
            <div
              className="overflow-x-auto"
              tabIndex={0}
              role="region"
              aria-label="Inbound vehicle queue"
            >
              <table className="w-full min-w-[1000px] table-fixed text-left text-sm [&_td]:align-middle [&_td:nth-child(7)]:text-right">
                <thead className="border-b border-[#DCE6F3] bg-[#F5F8FF] text-xs uppercase tracking-wide text-[#526580]">
                  <tr>
                    <th scope="col" className="w-[14%] px-4 py-3">
                      ASN Number
                    </th>
                    <th scope="col" className="w-[14%] px-4 py-3">
                      PO Number
                    </th>
                    <th scope="col" className="w-[13%] px-4 py-3">
                      Supplier
                    </th>
                    <th scope="col" className="w-[16%] px-4 py-3">
                      Vehicle / Driver
                    </th>
                    <th scope="col" className="w-[12%] px-4 py-3">
                      Arrival Time
                    </th>
                    <th scope="col" className="w-[19%] px-4 py-3">
                      Status / Dock
                    </th>
                    <th scope="col" className="w-[12%] px-4 py-3 text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {arrivals.map((arrival) => (
                    <ArrivalRows
                      key={arrival.id}
                      arrival={arrival}
                      expanded={expanded === arrival.id}
                      onToggle={() => setExpanded(expanded === arrival.id ? null : arrival.id)}
                      docks={docks}
                      selected={selectedDock[arrival.id] || ""}
                      onSelect={(dockId) =>
                        setSelectedDock((v) => ({ ...v, [arrival.id]: dockId }))
                      }
                      onAssign={() => void assignDock(arrival)}
                      onMove={() => void startMovement(arrival)}
                      onCheckIn={() => void confirmDockArrival(arrival)}
                      onApproveExit={() => void approveGateExit(arrival)}
                      isEligibleForInboundExit={isEligibleForInboundExit}
                      busy={assigning === arrival.id}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}

function ArrivalRows({
  arrival,
  expanded,
  onToggle,
  docks,
  selected,
  onSelect,
  onAssign,
  onMove,
  onCheckIn,
  onApproveExit,
  isEligibleForInboundExit,
  busy,
}: {
  arrival: Arrival;
  expanded: boolean;
  onToggle: () => void;
  docks: Dock[];
  selected: string;
  onSelect: (id: string) => void;
  onAssign: () => void;
  onMove: () => void;
  onCheckIn: () => void;
  onApproveExit: (arrival: Arrival) => void;
  isEligibleForInboundExit: (status: string) => boolean;
  busy: boolean;
}) {
  const isExited = arrival.status === "VEHICLE_EXITED" || !!arrival.exited_at;

  return (
    <Dialog
      open={expanded}
      onOpenChange={(open) => {
        if (open !== expanded) onToggle();
      }}
    >
      <tr className="hover:bg-muted/20">
        <td className="px-4 py-4">
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onToggle();
            }}
            aria-haspopup="dialog"
            className="font-mono font-semibold text-primary hover:underline"
          >
            {arrival.asn_number}
          </button>
        </td>
        <td className="px-4 py-4">
          <span className="font-mono">{arrival.po_number}</span>
        </td>
        <td className="px-4 py-4 font-medium">{arrival.supplier_name || "—"}</td>
        <td className="px-4 py-4">
          <p className="font-mono font-semibold">{arrival.vehicle_number}</p>
          <p className="text-xs text-muted-foreground">{arrival.driver_name || "—"}</p>
        </td>
        <td className="px-4 py-4">
          {new Date(arrival.arrival_time).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </td>
        <td className="px-4 py-4">
          <StatusBadge status={arrival.status} />
          {arrival.assigned_dock_id && (
            <p className="mt-1 text-xs font-semibold">{arrival.assigned_dock_id}</p>
          )}
          {isExited && (
            <p className="mt-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              Approved exit
            </p>
          )}
        </td>
        <td className="px-4 py-4">
          <div className="flex flex-wrap items-center gap-2">
            {!isExited && isEligibleForInboundExit(arrival.status) && (
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm gap-1.5 text-xs px-3"
                disabled={busy}
                onClick={() => onApproveExit(arrival)}
              >
                <ShieldCheck className="size-3.5" /> Approve Gate Exit
              </Button>
            )}
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="rounded-lg">
                <Eye className="size-3.5" /> Details
              </Button>
            </DialogTrigger>
          </div>
        </td>
      </tr>
      <DialogContent className="w-[calc(100%-2rem)] max-w-3xl grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden rounded-2xl border-[#DCE6F3] bg-[#F5F8FF] p-0 sm:rounded-2xl [&>button]:text-white [&>button:focus-visible]:ring-white">
        <DialogHeader className="flex-row items-center gap-3 space-y-0 bg-[#0B2A55] px-5 py-5 pr-12 text-left sm:px-6 sm:pr-12">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/20 bg-white/10 text-white">
            <Truck className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 space-y-1">
            <DialogTitle className="text-xl font-bold text-white">Vehicle details</DialogTitle>
            <DialogDescription className="break-words text-blue-100">
              {arrival.asn_number} · {arrival.vehicle_number}
            </DialogDescription>
          </div>
        </DialogHeader>
        <div className="min-h-0 min-w-0 overflow-y-auto overscroll-contain p-4 sm:p-6">
          <ArrivalDetails
            arrival={arrival}
            docks={docks}
            selected={selected}
            onSelect={onSelect}
            onAssign={onAssign}
            onMove={onMove}
            onCheckIn={onCheckIn}
            busy={busy}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ArrivalDetails({
  arrival,
  docks,
  selected,
  onSelect,
  onAssign,
  onMove,
  onCheckIn,
  busy,
}: {
  arrival: Arrival;
  docks: Dock[];
  selected: string;
  onSelect: (id: string) => void;
  onAssign: () => void;
  onMove: () => void;
  onCheckIn: () => void;
  busy: boolean;
}) {
  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-xl border border-[#DCE6F3] bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#DCE6F3] px-4 py-3">
          <h3 className="text-sm font-bold text-[#101D3A]">Inbound arrival details</h3>
          <StatusBadge status={arrival.status} />
        </div>
        <dl className="grid grid-cols-2 gap-x-5 gap-y-4 p-4 text-sm md:grid-cols-4">
          <Detail label="ASN number" value={arrival.asn_number} mono />
          <Detail label="PO number" value={arrival.po_number} mono />
          <Detail label="Supplier" value={arrival.supplier_name} />
          <Detail label="Assigned dock" value={arrival.assigned_dock_id} />
          <Detail label="Vehicle number" value={arrival.vehicle_number} mono />
          <Detail label="Driver" value={arrival.driver_name} />
          <Detail label="Driver contact" value={arrival.driver_contact} />
          <Detail label="Arrival time" value={new Date(arrival.arrival_time).toLocaleString()} />
        </dl>
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        <section className="min-w-0 rounded-xl border border-[#DCE6F3] bg-white">
          <h3 className="flex items-center gap-2 border-b border-[#DCE6F3] px-4 py-3 text-sm font-bold text-[#101D3A]">
            <ShieldCheck className="size-4 text-[#0866FF]" /> Gate entry information
          </h3>
          <dl className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-3 gap-y-2 p-4 text-xs [&_dd]:break-words">
            <dt className="text-muted-foreground">Gate entry</dt>
            <dd className="font-mono">{arrival.gate_entry_number}</dd>
            <dt className="text-muted-foreground">Entry time</dt>
            <dd>{new Date(arrival.arrival_time).toLocaleString()}</dd>
            <dt className="text-muted-foreground">Transporter</dt>
            <dd>{arrival.shipment.transporter || "—"}</dd>
            <dt className="text-muted-foreground">Packages</dt>
            <dd>
              {arrival.shipment.number_of_packages ?? "—"} {arrival.shipment.package_type || ""}
            </dd>
            <dt className="text-muted-foreground">Expected arrival</dt>
            <dd>
              {arrival.expected_arrival_at
                ? new Date(arrival.expected_arrival_at).toLocaleString()
                : "—"}
            </dd>
          </dl>
        </section>
        <section className="min-w-0 rounded-xl border border-[#DCE6F3] bg-white">
          <h3 className="flex items-center gap-2 border-b border-[#DCE6F3] px-4 py-3 text-sm font-bold text-[#101D3A]">
            <Boxes className="size-4 text-[#0866FF]" /> Expected materials
          </h3>
          <div className="divide-y divide-[#DCE6F3] px-4">
            {arrival.expected_materials.length === 0 && (
              <p className="py-3 text-xs text-[#526580]">No materials listed.</p>
            )}
            {arrival.expected_materials.map((m) => (
              <div key={m.item_code} className="flex justify-between gap-3 py-3 text-xs">
                <span className="min-w-0 break-words">
                  <b>{m.item_code}</b>
                  <br />
                  {m.material_name}
                </span>
                <span className="shrink-0 font-semibold tabular-nums">
                  {m.quantity} {m.uom}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Detail({
  label,
  value,
  mono = false,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
}) {
  return (
    <div className="min-w-0 break-words">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`mt-1 font-semibold ${mono ? "font-mono" : ""}`}>{value || "—"}</dd>
    </div>
  );
}
