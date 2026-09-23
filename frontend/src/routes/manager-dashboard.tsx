import { createFileRoute, Link } from "@tanstack/react-router";
import { Children, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardList,
  Loader2,
  PackageCheck,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell, StatusBadge } from "@/components/wms/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api-client";
import { requireRole } from "@/lib/auth-utils";

export const Route = createFileRoute("/manager-dashboard")({
  beforeLoad: () => requireRole(["MANAGER", "ADMIN", "SUPERUSER"]),
  component: ManagerDashboard,
});

function ManagerDashboard() {
  const [materialRequests, setMaterialRequests] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const loadData = async (quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      const [requests, pendingSuppliers] = await Promise.all([
        api.getMaterialRequests(),
        api.getSuppliers(),
      ]);
      setMaterialRequests(Array.isArray(requests) ? requests : []);
      setSuppliers(
        Array.isArray(pendingSuppliers)
          ? pendingSuppliers.filter(
              (supplier) =>
                normalizeStatus(supplier.status || "Pending Approval") === "pending approval",
            )
          : [],
      );
    } catch (error) {
      console.error("Failed to load manager dashboard", error);
      if (!quiet) toast.error("Failed to load manager dashboard");
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();

    const refreshQuietly = () => void loadData(true);
    window.addEventListener("focus", refreshQuietly);
    window.addEventListener("material-requests:changed", refreshQuietly);
    window.addEventListener("suppliers:changed", refreshQuietly);
    return () => {
      window.removeEventListener("focus", refreshQuietly);
      window.removeEventListener("material-requests:changed", refreshQuietly);
      window.removeEventListener("suppliers:changed", refreshQuietly);
    };
  }, []);

  const normalizeStatus = (status: unknown) =>
    String(status || "")
      .trim()
      .toLowerCase();

  const requestId = (request: any) => String(request?.id || request?.requestId || "");
  const supplierIdOf = (supplier: any) => String(supplier?.supplierId || supplier?.supplier_id || supplier?.id || "");

  const pendingRequests = useMemo(
    () =>
      materialRequests.filter((request) =>
        ["submitted", "pending approval"].includes(normalizeStatus(request.status)),
      ),
    [materialRequests],
  );

  const approvedRequests = useMemo(
    () => materialRequests.filter((request) => normalizeStatus(request.status) === "approved"),
    [materialRequests],
  );

  const rejectedRequests = useMemo(
    () => materialRequests.filter((request) => normalizeStatus(request.status) === "rejected"),
    [materialRequests],
  );

  const recentRequests = useMemo(
    () =>
      [...materialRequests]
        .sort((a, b) => {
          const aTime = new Date(
            a.updatedAt || a.updated_at || a.createdAt || a.created_at || 0,
          ).getTime();
          const bTime = new Date(
            b.updatedAt || b.updated_at || b.createdAt || b.created_at || 0,
          ).getTime();
          return bTime - aTime;
        })
        .slice(0, 8),
    [materialRequests],
  );

  const stats = useMemo(
    () => ({
      totalRequests: materialRequests.length,
      pending: pendingRequests.length,
      approved: approvedRequests.length,
      rejected: rejectedRequests.length,
      supplierApprovals: suppliers.length,
    }),
    [
      approvedRequests.length,
      materialRequests.length,
      pendingRequests.length,
      rejectedRequests.length,
      suppliers.length,
    ],
  );

  const updateMaterialRequest = async (request: any, nextStatus: "Approved" | "Rejected") => {
    const id = requestId(request);
    const key = `mr-${id}`;
    try {
      setBusyKey(key);
      await api.updateMaterialRequestStatus(
        id,
        nextStatus,
        nextStatus === "Approved"
          ? "Manager approved material request"
          : "Manager rejected material request",
        "Manager",
      );
      toast.success(
        nextStatus === "Approved"
          ? "Material request approved"
          : "Material request rejected",
      );
      await loadData(true);
      window.dispatchEvent(new Event("material-requests:changed"));
    } catch (error: any) {
      toast.error(error.message || "Failed to update material request");
    } finally {
      setBusyKey(null);
    }
  };

  const updateSupplier = async (supplier: any, nextStatus: "Active" | "Blocked") => {
    const supplierId = supplierIdOf(supplier);
    const key = `supplier-${supplierId}`;
    try {
      setBusyKey(key);
      await api.updateSupplierStatus(
        supplierId,
        nextStatus,
        nextStatus === "Active"
          ? "Manager approved supplier onboarding"
          : "Manager rejected supplier onboarding",
      );
      toast.success(nextStatus === "Active" ? "Supplier approved" : "Supplier rejected");
      await loadData(true);
      window.dispatchEvent(new Event("suppliers:changed"));
    } catch (error: any) {
      toast.error(error.message || "Failed to update supplier");
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <AppShell
      title="Manager Dashboard"
      subtitle="Approve warehouse material requests and new supplier onboarding"
      actions={
        <Button variant="outline" className="rounded-xl" onClick={() => loadData()}>
          <RefreshCw className="size-4" /> Refresh
        </Button>
      }
    >
      <div className="mb-6 grid gap-4 md:grid-cols-5">
        <MetricCard title="Total Requests" value={stats.totalRequests} icon={ClipboardList} />
        <MetricCard title="Pending" value={stats.pending} icon={PackageCheck} />
        <MetricCard title="Approved" value={stats.approved} icon={CheckCircle2} />
        <MetricCard title="Rejected" value={stats.rejected} icon={XCircle} />
        <MetricCard title="Supplier Approvals" value={stats.supplierApprovals} icon={PackageCheck} />
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <ApprovalQueue
            title="Material Request Approvals"
            emptyText="No warehouse material requests are waiting for manager approval."
          >
            {pendingRequests.map((request) => (
              <RequestCard key={requestId(request)} request={request}>
                <div className="mt-4 flex flex-wrap justify-end gap-2">
                  <Button
                    variant="outline"
                    className="rounded-xl"
                    disabled={busyKey === `mr-${requestId(request)}`}
                    onClick={() => updateMaterialRequest(request, "Rejected")}
                  >
                    <XCircle className="size-4" /> Reject
                  </Button>
                  <Button
                    className="rounded-xl"
                    disabled={busyKey === `mr-${requestId(request)}`}
                    onClick={() => updateMaterialRequest(request, "Approved")}
                  >
                    <CheckCircle2 className="size-4" /> Approve
                  </Button>
                </div>
              </RequestCard>
            ))}
          </ApprovalQueue>

          <ApprovalQueue title="Recent Requests" emptyText="No material requests found.">
            {recentRequests.map((request) => (
              <RequestCard key={requestId(request)} request={request} />
            ))}
          </ApprovalQueue>

          <ApprovalQueue
            title="Supplier Onboarding Approvals"
            emptyText="No suppliers are waiting for manager approval."
          >
            {suppliers.map((supplier) => {
              const supplierId = supplierIdOf(supplier);
              const category = supplier.category || supplier.categories || supplier.materialCategories;
              const categoryText = Array.isArray(category)
                ? category.filter(Boolean).join(", ")
                : String(category || "").trim();
              return (
                <div key={supplierId} className="rounded-xl border border-border/60 bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-black">
                          {supplier.supplierName || supplier.supplier_name || "Supplier"}
                        </p>
                        <StatusBadge status={supplier.status || "Pending Approval"} />
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {supplier.registeredCompanyName ||
                          supplier.registered_company_name ||
                          "Company"}{" "}
                        {" / "}
                        {categoryText || "Category not set"}
                      </p>
                    </div>
                    <Link
                      to="/supplier/$supplierId"
                      params={{ supplierId }}
                      search={{ module: "manager" } as any}
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      View profile
                    </Link>
                  </div>
                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <Button
                      variant="outline"
                      className="rounded-xl"
                      disabled={busyKey === `supplier-${supplierId}`}
                      onClick={() => updateSupplier(supplier, "Blocked")}
                    >
                      <XCircle className="size-4" /> Reject
                    </Button>
                    <Button
                      className="rounded-xl"
                      disabled={busyKey === `supplier-${supplierId}`}
                      onClick={() => updateSupplier(supplier, "Active")}
                    >
                      <CheckCircle2 className="size-4" /> Approve Supplier
                    </Button>
                  </div>
                </div>
              );
            })}
          </ApprovalQueue>
        </div>
      )}
    </AppShell>
  );
}

function RequestCard({ request, children }: any) {
  const id = String(request?.id || request?.requestId || "");
  const requestNumber =
    request?.requestNumber || request?.request_number || request?.number || (id ? `Request ${id.slice(0, 8)}` : "Material Request");
  const warehouse = request?.warehouseId || request?.warehouse_id || request?.warehouseName || request?.warehouse_name || "Warehouse";
  const department = request?.department || request?.departmentName || request?.department_name || "Department";
  const items = Array.isArray(request?.items) ? request.items : [];

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-sm font-black">
              {requestNumber}
            </p>
            <StatusBadge status={request?.status || "Unknown"} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {warehouse} {" / "}
            {department} {" / "} {items.length} item(s)
          </p>
        </div>
        <Link
          to="/procurement/material-requests"
          search={{ module: "manager" } as any}
          className="text-xs font-bold text-primary hover:underline"
        >
          View details
        </Link>
      </div>
      {children}
    </div>
  );
}

function MetricCard({ title, value, icon: Icon }: any) {
  return (
    <Card className="border-border/40 shadow-soft">
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <p className="mt-1 text-2xl font-black tabular-nums">{value}</p>
        </div>
        <div className="grid size-11 place-items-center rounded-xl bg-primary-soft/20 text-primary">
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function ApprovalQueue({ title, emptyText, children }: any) {
  const isEmpty = Children.count(children) === 0;
  return (
    <Card className="border-border/40 shadow-soft">
      <CardHeader>
        <CardTitle className="text-base font-bold tracking-tight">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 px-6 text-center text-sm text-muted-foreground">
            {emptyText}
          </div>
        ) : (
          <div className="space-y-3">{children}</div>
        )}
      </CardContent>
    </Card>
  );
}
