import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Boxes,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Download,
  Eye,
  FileText,
  Loader2,
  Package,
  PackageCheck,
  Paperclip,
  RefreshCw,
  Search,
  ShieldCheck,
  Store,
  TrendingDown,
  X,
} from "lucide-react";
import { AppShell, StatusBadge } from "@/components/wms/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

function AssemblyFinishedGoodsRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await api.getFinishedGoodsRequests();
      setRequests(Array.isArray(data) ? data : []);
      if (selectedRequest) {
        const updated = (Array.isArray(data) ? data : []).find(
          (r: any) => r.id === selectedRequest.id || r.request_number === selectedRequest.request_number
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

  return (
    <AppShell
      title="Assembly Finished Goods Requests"
      subtitle="Inspect incoming Finished Goods Requests from Procurement and verify Finished Goods Store availability"
      actions={
        <Button variant="outline" onClick={() => void fetchRequests()} disabled={loading}>
          <RefreshCw className={`mr-2 size-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      }
    >
      <div className="space-y-6">
        {/* KPI Top Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="rounded-2xl border p-4 shadow-sm bg-card">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-bold uppercase">
              <span>Total Requests</span>
              <ClipboardList className="size-4 text-primary" />
            </div>
            <p className="text-3xl font-black mt-2 text-foreground">{requests.length}</p>
            <p className="text-xs text-muted-foreground mt-1">From Procurement</p>
          </Card>

          <Card className="rounded-2xl border p-4 shadow-sm bg-card">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-bold uppercase">
              <span>Sent to Assembly</span>
              <PackageCheck className="size-4 text-blue-600" />
            </div>
            <p className="text-3xl font-black mt-2 text-blue-600">
              {requests.filter((r) => r.status === "SENT_TO_ASSEMBLY" || !r.status).length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Pending FG store verification</p>
          </Card>

          <Card className="rounded-2xl border p-4 shadow-sm bg-card">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-bold uppercase">
              <span>In Stock (Zero Shortage)</span>
              <CheckCircle2 className="size-4 text-emerald-600" />
            </div>
            <p className="text-3xl font-black mt-2 text-emerald-600">
              {requests.filter((r) => (r.shortage ?? 0) <= 0).length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Covered by FG Store inventory</p>
          </Card>

          <Card className="rounded-2xl border p-4 shadow-sm bg-card">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-bold uppercase">
              <span>Shortage Detected</span>
              <TrendingDown className="size-4 text-red-600" />
            </div>
            <p className="text-3xl font-black mt-2 text-red-600">
              {requests.filter((r) => (r.shortage ?? 0) > 0).length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Shortage in Finished Goods Store</p>
          </Card>
        </div>

        {/* Search & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search request #, product name, code..."
              className="pl-9 h-10 rounded-xl"
            />
          </div>
        </div>

        {/* Requests Table */}
        <Card className="rounded-2xl border bg-card p-0 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 border-b border-border text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Request Number</th>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3 text-right">Requested Qty</th>
                  <th className="px-4 py-3 text-right">FG Store Available</th>
                  <th className="px-4 py-3 text-right">Shortage</th>
                  <th className="px-4 py-3">BOM Attachment</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created Date</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="h-48 text-center">
                      <Loader2 className="size-7 animate-spin mx-auto text-primary" />
                      <span className="block mt-2 text-xs text-muted-foreground">Loading Finished Goods Requests...</span>
                    </td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="h-48 text-center p-6">
                      <ClipboardList className="size-10 text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-muted-foreground">No Finished Goods Requests Received</p>
                      <p className="text-xs text-muted-foreground/80 mt-1">Requests sent from Procurement will appear here.</p>
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((req) => {
                    const avail = req.fg_store_available ?? req.available_quantity ?? 0;
                    const shortage = req.shortage ?? req.shortage_quantity ?? Math.max(0, req.quantity - avail);
                    const bomUrl = req.bom_attachment_url;
                    const bomName = req.bom_attachment_name || "BOM Attachment";

                    return (
                      <tr
                        key={req.id}
                        onClick={() => setSelectedRequest(req)}
                        className="hover:bg-muted/20 cursor-pointer transition-colors"
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
                          {bomUrl ? (
                            <a
                              href={`${BUSINESS_API_URL}${bomUrl}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                            >
                              <Paperclip className="size-3.5" />
                              <span className="max-w-[130px] truncate">{bomName}</span>
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">None</span>
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
          <Card className="rounded-2xl border-2 border-primary/30 bg-card p-6 shadow-lg">
            <div className="flex items-center justify-between border-b border-border/60 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Store className="size-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-foreground">{selectedRequest.request_number}</h3>
                    <StatusBadge status={selectedRequest.status || "SENT_TO_ASSEMBLY"} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Finished Goods Store Availability Inspection
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedRequest(null)} className="h-8 w-8 p-0">
                <X className="size-4" />
              </Button>
            </div>

            {/* Inventory Inspection Panel */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {/* Requested Card */}
              <div className="rounded-2xl border border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 p-5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                  Requested Quantity
                </span>
                <div className="text-3xl font-black text-blue-700 dark:text-blue-300 mt-2">
                  {selectedRequest.quantity || selectedRequest.requested_quantity} {selectedRequest.uom || "PCS"}
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
                  {selectedRequest.fg_store_available ?? selectedRequest.available_quantity ?? 0} {selectedRequest.uom || "PCS"}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Actual database quantity in FG Store
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
                  Calculated Shortage
                </span>
                <div
                  className={`text-3xl font-black mt-2 ${
                    (selectedRequest.shortage ?? 0) > 0
                      ? "text-red-700 dark:text-red-300"
                      : "text-emerald-700 dark:text-emerald-300"
                  }`}
                >
                  {selectedRequest.shortage ?? selectedRequest.shortage_quantity ?? 0} {selectedRequest.uom || "PCS"}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {(selectedRequest.shortage ?? 0) > 0
                    ? "Production required to fulfill shortage"
                    : "Zero shortage (fully available)"}
                </div>
              </div>
            </div>

            {/* Product & Request Details */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs border-t border-border/60 pt-4">
              <div>
                <span className="font-bold text-muted-foreground uppercase text-[10px]">Product Name</span>
                <p className="font-semibold text-foreground text-sm mt-0.5">
                  {selectedRequest.product_name || selectedRequest.finished_goods_name}
                </p>
              </div>

              <div>
                <span className="font-bold text-muted-foreground uppercase text-[10px]">Product Code</span>
                <p className="font-mono font-semibold text-foreground text-sm mt-0.5">
                  {selectedRequest.product_code || selectedRequest.finished_goods_code || "-"}
                </p>
              </div>

              <div>
                <span className="font-bold text-muted-foreground uppercase text-[10px]">Requested By</span>
                <p className="font-semibold text-foreground text-sm mt-0.5">
                  {selectedRequest.requested_by || selectedRequest.created_by || "Procurement"}
                </p>
              </div>

              <div>
                <span className="font-bold text-muted-foreground uppercase text-[10px]">Target Warehouse</span>
                <p className="font-semibold text-foreground text-sm mt-0.5">
                  {selectedRequest.warehouse_id || "MAIN"}
                </p>
              </div>
            </div>

            {/* BOM Attachment Download */}
            {selectedRequest.bom_attachment_url && (
              <div className="mt-5 flex items-center justify-between rounded-xl bg-primary/5 border border-primary/20 p-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="size-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-foreground block">
                      {selectedRequest.bom_attachment_name || "BOM Attachment"}
                    </span>
                    <span className="text-[11px] text-muted-foreground">Attached by Procurement</span>
                  </div>
                </div>
                <a
                  href={`${BUSINESS_API_URL}${selectedRequest.bom_attachment_url}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition shadow-sm"
                >
                  <Download className="size-3.5" /> Download BOM
                </a>
              </div>
            )}

            {/* Remarks if any */}
            {selectedRequest.remarks && (
              <div className="mt-4 rounded-xl bg-muted/30 p-3 border text-xs">
                <span className="font-bold text-muted-foreground uppercase text-[10px] block mb-1">Remarks</span>
                <p className="text-foreground">{selectedRequest.remarks}</p>
              </div>
            )}

            {/* Safety & Non-Deduction Notice */}
            <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground bg-muted/20 p-3 rounded-xl border border-dashed">
              <ShieldCheck className="size-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Availability Inspection Only:</strong> Checking inventory availability does not reserve or deduct finished goods stock.
              </span>
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}
