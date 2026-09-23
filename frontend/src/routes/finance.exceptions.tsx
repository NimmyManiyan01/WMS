import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Loader2,
  ExternalLink,
  ShieldAlert,
  Building2,
  FileText,
  DollarSign,
  Layers,
  ChevronRight,
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

export const Route = createFileRoute("/finance/exceptions")({
  component: FinanceExceptionsPage,
});

function FinanceExceptionsPage() {
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [severityFilter, setSeverityFilter] = useState("ALL");

  // Resolve Dialog State
  const [resolvingException, setResolvingException] = useState<any | null>(null);
  const [resolutionComment, setResolutionComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadExceptions();
  }, [statusFilter, severityFilter]);

  const loadExceptions = async () => {
    try {
      setLoading(true);
      const res = await api.listFinanceExceptions({
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        severity: severityFilter !== "ALL" ? severityFilter : undefined,
      });
      setExceptions(res || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load finance exceptions");
    } finally {
      setLoading(false);
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingException) return;
    if (!resolutionComment.trim()) {
      toast.error("Please provide a resolution justification comment");
      return;
    }

    try {
      setIsSubmitting(true);
      await api.resolveFinanceException(resolvingException.id, {
        resolution_comment: resolutionComment.trim(),
      });
      toast.success("Finance exception resolved successfully");
      setResolvingException(null);
      setResolutionComment("");
      loadExceptions();
    } catch (err: any) {
      toast.error(err.message || "Failed to resolve exception");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = exceptions.filter((ex) => {
    const q = search.toLowerCase();
    const entityNum = (ex.entity_number || "").toLowerCase();
    const reason = (ex.reason || "").toLowerCase();
    const supp = (ex.supplier_name || "").toLowerCase();
    return !q || entityNum.includes(q) || reason.includes(q) || supp.includes(q);
  });

  const openCount = exceptions.filter((e) => e.status === "OPEN").length;
  const criticalCount = exceptions.filter(
    (e) => (e.severity === "CRITICAL" || e.severity === "HIGH") && e.status === "OPEN"
  ).length;
  const totalVariance = exceptions
    .filter((e) => e.status === "OPEN")
    .reduce((acc, e) => acc + Number(e.variance_amount || 0), 0);
  const resolvedCount = exceptions.filter((e) => e.status === "RESOLVED").length;

  const getSeverityBadge = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case "CRITICAL":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            CRITICAL
          </span>
        );
      case "HIGH":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300">
            HIGH
          </span>
        );
      case "MEDIUM":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            MEDIUM
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            LOW
          </span>
        );
    }
  };

  return (
    <AppShell
      title="Finance Exceptions & Variances"
      subtitle="Investigate match variances, price discrepancies, hold locks, and audit resolutions"
    >
      <div className="space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-rose-600 bg-white dark:bg-slate-900">
            <CardHeader className="p-4 pb-1">
              <CardTitle className="text-xs font-semibold uppercase text-slate-500 flex justify-between items-center">
                Open Exceptions
                <AlertTriangle className="h-4 w-4 text-rose-500" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {openCount}
              </div>
              <p className="text-xs text-slate-500 mt-1">Requiring finance adjudication</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-600 bg-white dark:bg-slate-900">
            <CardHeader className="p-4 pb-1">
              <CardTitle className="text-xs font-semibold uppercase text-slate-500 flex justify-between items-center">
                Critical & High Severity
                <ShieldAlert className="h-4 w-4 text-orange-500" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {criticalCount}
              </div>
              <p className="text-xs text-slate-500 mt-1">High risk financial barriers</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-amber-600 bg-white dark:bg-slate-900">
            <CardHeader className="p-4 pb-1">
              <CardTitle className="text-xs font-semibold uppercase text-slate-500 flex justify-between items-center">
                Total Open Variance Exposure
                <DollarSign className="h-4 w-4 text-amber-500" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                ₹{totalVariance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-slate-500 mt-1">Cumulative dispute value</p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-emerald-600 bg-white dark:bg-slate-900">
            <CardHeader className="p-4 pb-1">
              <CardTitle className="text-xs font-semibold uppercase text-slate-500 flex justify-between items-center">
                Resolved Exceptions
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {resolvedCount}
              </div>
              <p className="text-xs text-slate-500 mt-1">Adjudicated with audit trail</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex flex-1 items-center gap-3 w-full">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by entity number, reason, or supplier..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>

              <div className="w-44">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="OPEN">Open Only</SelectItem>
                    <SelectItem value="INVESTIGATING">Investigating</SelectItem>
                    <SelectItem value="RESOLVED">Resolved</SelectItem>
                    <SelectItem value="WAIVED">Waived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-40">
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Severities</SelectItem>
                    <SelectItem value="CRITICAL">Critical</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={loadExceptions}
              disabled={loading}
              className="h-9"
            >
              <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </Card>

        {/* Exceptions Table */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 text-xs uppercase font-medium border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3">Exception Type</th>
                  <th className="px-5 py-3">Severity</th>
                  <th className="px-5 py-3">Entity</th>
                  <th className="px-5 py-3">Supplier</th>
                  <th className="px-5 py-3 text-right">Variance Amount</th>
                  <th className="px-5 py-3">Reason / Description</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-500 mb-2" />
                      Loading exceptions queue...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500 mb-2" />
                      No active finance exceptions found. Everything is balanced!
                    </td>
                  </tr>
                ) : (
                  filtered.map((ex) => (
                    <tr
                      key={ex.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-5 py-3 font-semibold text-slate-900 dark:text-slate-100">
                        <span className="font-mono text-xs">{ex.exception_type}</span>
                      </td>
                      <td className="px-5 py-3">{getSeverityBadge(ex.severity)}</td>
                      <td className="px-5 py-3">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {ex.entity_type}
                        </div>
                        {ex.entity_type === "INVOICE" ? (
                          <Link
                            to={`/finance/invoices/${ex.entity_id}` as any}
                            className="text-indigo-600 hover:underline text-xs flex items-center gap-1 mt-0.5"
                          >
                            <FileText className="h-3 w-3" />
                            {ex.entity_number}
                          </Link>
                        ) : ex.entity_type === "PURCHASE_ORDER" ? (
                          <Link
                            to={`/finance/approvals/${ex.entity_id}` as any}
                            className="text-indigo-600 hover:underline text-xs flex items-center gap-1 mt-0.5"
                          >
                            <FileText className="h-3 w-3" />
                            {ex.entity_number}
                          </Link>
                        ) : (
                          <span className="text-xs text-slate-500">{ex.entity_number}</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-700 dark:text-slate-300">
                        {ex.supplier_name || "-"}
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-slate-900 dark:text-slate-100">
                        ₹{Number(ex.variance_amount || 0).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-600 dark:text-slate-400 max-w-xs">
                        <div className="line-clamp-2">{ex.reason}</div>
                        {ex.resolution_comment && (
                          <div className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                            Resolution: {ex.resolution_comment}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <StatusBadge status={ex.status} />
                      </td>
                      <td className="px-5 py-3 text-right">
                        {ex.status === "OPEN" || ex.status === "INVESTIGATING" ? (
                          <Button
                            size="sm"
                            className="h-8 px-2.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                            onClick={() => {
                              setResolvingException(ex);
                              setResolutionComment("");
                            }}
                          >
                            Resolve
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Resolved</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Resolve Exception Dialog */}
        <Dialog
          open={!!resolvingException}
          onOpenChange={(open) => !open && setResolvingException(null)}
        >
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                Resolve Finance Exception
              </DialogTitle>
              <DialogDescription>
                Provide formal adjudication and audit trail notes to resolve this
                financial variance.
              </DialogDescription>
            </DialogHeader>

            {resolvingException && (
              <form onSubmit={handleResolveSubmit} className="space-y-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded border text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Exception:</span>
                    <strong className="font-semibold">
                      {resolvingException.exception_type}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Entity:</span>
                    <span>
                      {resolvingException.entity_type} - {resolvingException.entity_number}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Variance Amount:</span>
                    <strong className="text-rose-600 font-bold">
                      ₹{Number(resolvingException.variance_amount || 0).toLocaleString(
                        "en-IN",
                        { minimumFractionDigits: 2 }
                      )}
                    </strong>
                  </div>
                  <div className="pt-1 border-t text-slate-600 dark:text-slate-300">
                    <span className="text-slate-500 block mb-0.5">Discrepancy Reason:</span>
                    {resolvingException.reason}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">
                    Resolution & Settlement Justification *
                  </Label>
                  <Textarea
                    placeholder="Document supplier agreement, tolerance override rationale, debit note issued, or adjustment reference..."
                    rows={3}
                    value={resolutionComment}
                    onChange={(e) => setResolutionComment(e.target.value)}
                    required
                    className="text-sm"
                  />
                </div>

                <DialogFooter className="gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setResolvingException(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Resolving...
                      </>
                    ) : (
                      "Confirm Resolution"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
