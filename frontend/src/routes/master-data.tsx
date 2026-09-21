import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowRight, Building2, ClipboardList, Loader2, Plus, RefreshCw, Search } from "lucide-react";
import { AppShell, StatusBadge } from "@/components/wms/app-shell";
import { SectionCard, StatCard } from "@/components/wms/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";
export const Route = createFileRoute("/master-data")({
  head: () => ({
    meta: [
      { title: "Master Data · NexusWMS" },
      {
        name: "description",
        content:
          "Maintain supplier master records used across procurement and receiving workflows.",
      },
      { property: "og:title", content: "Master Data · NexusWMS" },
      { property: "og:description", content: "Supplier master records for procurement." },
    ],
  }),
  component: MasterData,
});
function MasterData() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const loadSuppliers = async () => {
    setLoading(true);
    setError(null);
    try {
      const [supplierData, requestData] = await Promise.all([
        api.getSuppliers(),
        api.getMaterialRequests().catch(() => []),
      ]);
      setSuppliers(supplierData);
      setPendingRequests(
        requestData.filter((request) => request.status === "Pending Approval").length,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load suppliers.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadSuppliers();
  }, []);
  const filteredSuppliers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return suppliers.filter((supplier) => {
      const matchesStatus =
        statusFilter === "all" ||
        (supplier.status || "Pending Approval").toLowerCase() === statusFilter;
      const matchesQuery =
        !normalizedQuery ||
        [supplier.supplierName, supplier.registeredCompanyName, supplier.category, supplier.gstin]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));
      return matchesStatus && matchesQuery;
    });
  }, [query, statusFilter, suppliers]);
  return (
    <AppShell
      title="Supplier Management"
      subtitle="Manage suppliers used for procurement and warehouse operations"
      actions={
        <Button className="rounded-xl shadow-glow" asChild>
          <Link to="/new-supplier">
            <Plus className="size-4" /> Add Supplier
          </Link>
        </Button>
      }
    >
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Pending Requests"
          value={loading ? "…" : String(pendingRequests)}
          delta={pendingRequests > 0 ? "View Requests →" : "From Warehouse"}
          icon={ClipboardList}
          tone="warning"
          to="/procurement/material-requests?status=pending-procurement"
          showArrow
        />
        <StatCard
          label="Total Suppliers"
          value={loading ? "…" : String(suppliers.length)}
          delta="Vendor master records"
          icon={Building2}
          tone="primary"
          to="/master-data"
        />
        <StatCard
          label="Active Suppliers"
          value={
            loading
              ? "…"
              : String(
                  suppliers.filter((supplier) => (supplier.status || "Pending Approval") === "Active").length,
                )
          }
          delta="Available for operations"
          icon={Building2}
          tone="success"
          to="/master-data"
        />
        <StatCard
          label="Blocked Suppliers"
          value={
            loading
              ? "…"
              : String(suppliers.filter((supplier) => supplier.status === "Blocked").length)
          }
          delta="Unavailable for operations"
          icon={Building2}
          tone="danger"
          to="/master-data"
        />
      </div>

      {/* ACTION REQUIRED OPERATIONAL SECTION */}
      <div className="mb-6">
        <SectionCard
          title="Action Required"
          description="High-priority procurement tasks requiring immediate review or authorization"
          icon={AlertCircle}
          actions={
            <Button variant="ghost" size="sm" className="rounded-xl text-xs font-bold text-primary hover:text-primary" asChild>
              <Link to="/procurement/material-requests">
                View All <ArrowRight className="ml-1 size-3.5" />
              </Link>
            </Button>
          }
        >
          <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/70 bg-card">
            {/* Task 1: Pending Material Requests */}
            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-muted/20 transition-colors">
              <div className="flex items-start gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-600 font-bold">
                  🟠
                </span>
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {loading ? "..." : `${pendingRequests} material request${pendingRequests === 1 ? "" : "s"} awaiting procurement review`}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    From Pune DC and Plant 1200
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="rounded-xl h-8 px-4 text-xs font-bold shrink-0" asChild>
                <Link to="/procurement/material-requests?status=pending-procurement">
                  Review <ArrowRight className="ml-1.5 size-3.5" />
                </Link>
              </Button>
            </div>

            {/* Task 2: Pending Supplier Registrations */}
            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-muted/20 transition-colors">
              <div className="flex items-start gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-yellow-500/10 text-yellow-600 font-bold">
                  🟡
                </span>
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {loading
                      ? "..."
                      : `${suppliers.filter((s) => (s.status || "").toLowerCase().includes("pending")).length} supplier registration${suppliers.filter((s) => (s.status || "").toLowerCase().includes("pending")).length === 1 ? "" : "s"} awaiting approval`}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Supplier master
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="rounded-xl h-8 px-4 text-xs font-bold shrink-0" onClick={() => setStatusFilter("pending approval")}>
                Review <ArrowRight className="ml-1.5 size-3.5" />
              </Button>
            </div>

            {/* Task 3: Expiring Supplier Documents */}
            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-muted/20 transition-colors">
              <div className="flex items-start gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-rose-500/10 text-rose-600 font-bold">
                  🔴
                </span>
                <div>
                  <p className="text-sm font-bold text-foreground">
                    2 supplier documents are expiring
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Check supplier documents
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="rounded-xl h-8 px-4 text-xs font-bold shrink-0" asChild>
                <Link to="/procurement/quality-issues">
                  Review <ArrowRight className="ml-1.5 size-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="mt-4">
        <SectionCard
          title="Supplier master"
          description="Registered vendors available for procurement and gate-entry workflows"
          icon={Building2}
          actions={
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg"
              onClick={loadSuppliers}
              disabled={loading}
            >
              <RefreshCw className={loading ? "animate-spin" : ""} /> Refresh
            </Button>
          }
        >
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search supplier, category or GSTIN"
              className="rounded-xl pl-9"
            />
          </div>
          <div className="mb-4 flex flex-wrap gap-2" aria-label="Supplier status navigation">
            {[
              { id: "all", label: "All suppliers", count: suppliers.length },
              { id: "draft", label: "Draft", count: suppliers.filter((supplier) => supplier.status === "Draft").length },
              {
                id: "pending approval",
                label: "Pending Approval",
                count: suppliers.filter((supplier) => (supplier.status || "Pending Approval") === "Pending Approval").length,
              },
              { id: "active", label: "Active", count: suppliers.filter((supplier) => supplier.status === "Active").length },
              { id: "suspended", label: "Suspended", count: suppliers.filter((supplier) => supplier.status === "Suspended").length },
              { id: "blocked", label: "Blocked", count: suppliers.filter((supplier) => supplier.status === "Blocked").length },
            ].map((item) => (
              <Button
                key={item.id}
                variant="outline"
                size="sm"
                onClick={() => setStatusFilter(item.id)}
                className={cn(
                  "rounded-full",
                  statusFilter === item.id &&
                    "border-primary bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
                )}
              >
                {item.label}{" "}
                <span className="rounded-full bg-background/30 px-1.5 py-0.5 text-[10px]">
                  {item.count}
                </span>
              </Button>
            ))}
          </div>

          {loading ? (
            <div className="flex h-44 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-5 animate-spin text-primary" /> Loading supplier records…
            </div>
          ) : error ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm font-medium text-destructive">
                Supplier records could not be loaded.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 rounded-lg"
                onClick={loadSuppliers}
              >
                Try again
              </Button>
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <Building2 className="size-8 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {query || statusFilter !== "all"
                    ? "No matching suppliers"
                    : "No suppliers registered yet"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {query || statusFilter !== "all"
                    ? "Try a different search term or status."
                    : "Add the first vendor to begin building your supplier master."}
                </p>
              </div>
              {!query && statusFilter === "all" && (
                <Button size="sm" className="rounded-lg" asChild>
                  <Link to="/new-supplier">
                    <Plus /> Add supplier
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="-mx-5 overflow-x-auto px-5">
              <table className="w-full min-w-[780px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="pb-3 font-medium">Supplier</th>
                    <th className="pb-3 font-medium">Category</th>
                    <th className="pb-3 font-medium">GSTIN</th>
                    <th className="pb-3 font-medium">Contact</th>
                    <th className="pb-3 font-medium">Last PO</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredSuppliers.map((supplier) => {
                    const phone =
                      supplier.contact?.phone ||
                      supplier.phone ||
                      supplier.contactPhone ||
                      "—";
                    const lastPo =
                      supplier.lastPoNumber ||
                      supplier.last_po_number ||
                      supplier.latestPoNumber ||
                      "—";
                    return (
                      <tr
                        key={supplier.supplierId || supplier.id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="py-3">
                          <Link
                            to="/supplier/$supplierId"
                            params={{ supplierId: supplier.supplierId || supplier.id }}
                            className="font-semibold text-primary hover:underline"
                          >
                            {supplier.supplierName || supplier.supplier_name}
                          </Link>
                          <p className="text-[11px] text-muted-foreground">
                            {supplier.registeredCompanyName ||
                              supplier.supplierCode ||
                              supplier.supplier_code ||
                              supplier.supplierId}
                          </p>
                        </td>
                        <td className="py-3 text-muted-foreground font-medium">
                          {Array.isArray(supplier.category)
                            ? supplier.category.join(", ")
                            : supplier.category || "—"}
                        </td>
                        <td className="py-3 font-mono text-xs">{supplier.gstin || "—"}</td>
                        <td className="py-3 text-xs font-mono text-muted-foreground">
                          {phone}
                        </td>
                        <td className="py-3 font-mono text-xs font-bold text-foreground">
                          {lastPo}
                        </td>
                        <td className="py-3">
                          <StatusBadge status={supplier.status || "Active"} />
                        </td>
                        <td className="py-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl h-8 text-xs font-bold"
                            asChild
                          >
                            <Link
                              to="/supplier/$supplierId"
                              params={{ supplierId: supplier.supplierId || supplier.id }}
                            >
                              View <ArrowRight className="ml-1 size-3.5" />
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>
    </AppShell>
  );
}
