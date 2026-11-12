import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef, useMemo } from "react";
import {
  Boxes,
  Package,
  Clock3,
  Truck,
  CheckCircle2,
  ClipboardList,
  Layers,
  Search,
  Plus,
  RefreshCw,
  Eye,
  Calendar,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  X,
  Send,
  Upload,
  Paperclip,
  Download,
  Loader2,
} from "lucide-react";
import { AppShell } from "@/components/wms/app-shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { api, BUSINESS_API_URL } from "@/lib/api-client";
import { getUserInfo, requireRole } from "@/lib/auth-utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/procurement/finished-goods")({
  beforeLoad: () => requireRole(["PROCUREMENT", "PROCUREMENT_MANAGER", "ADMIN", "SUPERUSER"]),
  component: ProcurementFinishedGoods,
});

const today = () => new Date().toISOString().split("T")[0];

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

function FGStatusBadge({ status }: { status: string }) {
  const norm = (status || "").toUpperCase().replace(/_/g, " ");
  let label = norm.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) || "Unknown";
  let color = "bg-slate-100 text-slate-700 border-slate-200";
  if (/PROGRESS|PENDING|SENT/.test(norm)) {
    label = norm === "SENT TO ASSEMBLY" ? "Sent to Assembly" : norm.includes("PENDING") ? "Pending" : "In Progress";
    color = "bg-amber-50 text-amber-800 border-amber-200";
  } else if (/PICKUP|READY/.test(norm)) {
    label = "Ready for Pickup";
    color = "bg-blue-50 text-blue-800 border-blue-200";
  } else if (/COMPLET|CLOSE|STORE/.test(norm)) {
    label = "Completed";
    color = "bg-emerald-50 text-emerald-800 border-emerald-200";
  } else if (norm === "DISPATCHED") {
    color = "bg-violet-50 text-violet-800 border-violet-200";
  }
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold ${color}`}>
    <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />{label}
  </span>;
}

function ProcurementFinishedGoods() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingBom, setUploadingBom] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [requestedByFilter, setRequestedByFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const [shortageOnly, setShortageOnly] = useState(false);
  const [hasBomOnly, setHasBomOnly] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const newRequestButtonRef = useRef<HTMLButtonElement>(null);
  const [bomFile, setBomFile] = useState<File | null>(null);
  const [uploadedBomUrl, setUploadedBomUrl] = useState<string | null>(null);
  const [uploadedBomName, setUploadedBomName] = useState<string | null>(null);

  const defaultRequester = getUserInfo()?.username?.trim() || "procurement";

  const [form, setForm] = useState({
    product_name: "",
    warehouse_id: "MAIN",
    quantity: "10",
    uom: "PCS",
    required_date: today(),
    requested_by: defaultRequester,
    requested_date: today(),
    remarks: "",
  });

  const fetchRequests = async () => {
    try {
      setLoadingRequests(true);
      const data = await api.getFinishedGoodsRequests();
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch finished goods requests:", error);
      toast.error("Unable to load requests. Please try refreshing.");
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    void fetchRequests();
    const user = getUserInfo()?.username?.trim();
    if (user) {
      setForm((prev) => ({ ...prev, requested_by: prev.requested_by || user }));
    }
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBomFile(file);
    setUploadingBom(true);
    try {
      const res = await api.uploadBomAttachment(file);
      setUploadedBomUrl(res.file_url);
      setUploadedBomName(res.file_name);
      toast.success("BOM attachment uploaded successfully");
    } catch (err: any) {
      console.error("BOM upload failed:", err);
      toast.error("Failed to upload BOM file", { description: err.message });
      setBomFile(null);
      setUploadedBomUrl(null);
      setUploadedBomName(null);
    } finally {
      setUploadingBom(false);
    }
  };

  const removeBomFile = () => {
    setBomFile(null);
    setUploadedBomUrl(null);
    setUploadedBomName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const requester = form.requested_by.trim() || getUserInfo()?.username?.trim() || "procurement";
    const requestDate = form.requested_date || today();
    const productName = form.product_name.trim();
    const quantity = Number(form.quantity);

    if (!productName) {
      toast.error("Finished Product name/code is required");
      return;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
      toast.error("Quantity must be a positive number greater than 0");
      return;
    }
    if (!requester) {
      toast.error("Requested By (Requester name) is required");
      return;
    }

    setSubmitting(true);
    try {
      const newItem = await api.createFinishedGoodsRequest({
          warehouse_id: form.warehouse_id.trim() || "MAIN",
          finished_goods_code: productName,
          finished_goods_name: productName,
          quantity,
          uom: form.uom.trim() || "PCS",
          required_date: form.required_date,
          requested_by: requester,
          requested_date: requestDate,
          bom_attachment_url: uploadedBomUrl,
          bom_attachment_name: uploadedBomName,
          remarks: form.remarks.trim() || null,
        });

      setRequests((prev) => [newItem, ...prev]);

      toast.success("Finished Goods Request created successfully!", {
        description: `Request for ${quantity} ${form.uom} of ${productName} sent to Assembly.`,
      });

      // Reset form & close drawer
      setForm({
        product_name: "",
        warehouse_id: "MAIN",
        quantity: "10",
        uom: "PCS",
        required_date: today(),
        requested_by: defaultRequester,
        requested_date: today(),
        remarks: "",
      });
      removeBomFile();
      setIsDrawerOpen(false);
    } catch (error: any) {
      toast.error("Failed to send Finished Goods Request", { description: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const total = requests.length;
    const inProgress = requests.filter((r) => {
      const s = (r.status || "").toUpperCase();
      return s.includes("PROGRESS") || s.includes("PENDING") || s.includes("SENT");
    }).length;
    const readyForPickup = requests.filter((r) => {
      const s = (r.status || "").toUpperCase();
      return s.includes("PICKUP") || s.includes("READY");
    }).length;
    const completed = requests.filter((r) => {
      const s = (r.status || "").toUpperCase();
      return s.includes("COMPLET") || s.includes("CLOSE") || s.includes("STORE");
    }).length;

    return { total, inProgress, readyForPickup, completed };
  }, [requests]);

  // Unique Requesters
  const uniqueRequesters = useMemo(() => {
    const set = new Set<string>();
    requests.forEach((r) => {
      const reqBy = r.requested_by || r.created_by;
      if (reqBy) set.add(reqBy);
    });
    return Array.from(set);
  }, [requests]);

  // Filtering & Sorting
  const filteredRequests = useMemo(() => {
    let result = requests.filter((req) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (req.request_number || "").toLowerCase().includes(q) ||
        (req.product_name || req.finished_goods_name || "").toLowerCase().includes(q) ||
        (req.product_code || req.finished_goods_code || "").toLowerCase().includes(q) ||
        (req.requested_by || "").toLowerCase().includes(q);

      const statusNorm = (req.status || "").toUpperCase();
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "IN_PROGRESS" &&
          (statusNorm.includes("PROGRESS") || statusNorm.includes("PENDING") || statusNorm.includes("SENT"))) ||
        (statusFilter === "READY_FOR_PICKUP" &&
          (statusNorm.includes("PICKUP") || statusNorm.includes("READY"))) ||
        (statusFilter === "COMPLETED" &&
          (statusNorm.includes("COMPLET") || statusNorm.includes("CLOSE") || statusNorm.includes("STORE")));

      const matchesRequester =
        requestedByFilter === "ALL" ||
        (req.requested_by || req.created_by || "").toLowerCase() === requestedByFilter.toLowerCase();

      const matchesDate =
        !dateFilter ||
        String(req.requested_date || req.created_at || "").startsWith(dateFilter);

      const avail = req.fg_store_available ?? req.available_quantity ?? 0;
      const reqQty = req.quantity ?? req.requested_quantity ?? 0;
      const shortage = req.shortage ?? req.shortage_quantity ?? Math.max(0, reqQty - avail);
      const matchesShortage = !shortageOnly || shortage > 0;

      const matchesBom = !hasBomOnly || Boolean(req.bom_attachment_url || req.bom_attachment_name);

      return matchesSearch && matchesStatus && matchesRequester && matchesDate && matchesShortage && matchesBom;
    });

    if (sortBy === "oldest") {
      result = [...result].sort(
        (a, b) => new Date(a.created_at || a.requested_date || 0).getTime() - new Date(b.created_at || b.requested_date || 0).getTime(),
      );
    } else if (sortBy === "qty_desc") {
      result = [...result].sort(
        (a, b) => (b.quantity ?? b.requested_quantity ?? 0) - (a.quantity ?? a.requested_quantity ?? 0),
      );
    } else if (sortBy === "qty_asc") {
      result = [...result].sort(
        (a, b) => (a.quantity ?? a.requested_quantity ?? 0) - (b.quantity ?? b.requested_quantity ?? 0),
      );
    } else if (sortBy === "product_name") {
      result = [...result].sort((a, b) =>
        String(a.product_name || a.finished_goods_name || "").localeCompare(
          String(b.product_name || b.finished_goods_name || ""),
        ),
      );
    } else {
      // Default: newest first
      result = [...result].sort(
        (a, b) => new Date(b.created_at || b.requested_date || 0).getTime() - new Date(a.created_at || a.requested_date || 0).getTime(),
      );
    }

    return result;
  }, [requests, searchQuery, statusFilter, requestedByFilter, dateFilter, shortageOnly, hasBomOnly, sortBy]);

  const hasActiveAdvancedFilters = shortageOnly || hasBomOnly || sortBy !== "newest";

  const resetAllFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setRequestedByFilter("ALL");
    setDateFilter("");
    setShortageOnly(false);
    setHasBomOnly(false);
    setSortBy("newest");
    setCurrentPage(1);
    setIsDatePickerOpen(false);
    setIsFilterMenuOpen(false);
  };

  // Paginated Slices
  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / pageSize));
  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [filteredRequests, currentPage, pageSize]);

  return (
    <AppShell title="" mainClassName="bg-[#F8FAFC] pb-24 font-sans min-w-0 overflow-x-clip">
      <div className="flex flex-col 2xl:flex-row gap-6 items-start">
        {/* Main Left Content Area */}
        <div className="flex-1 min-w-0 w-full space-y-5">
          {/* Breadcrumbs */}
          {/* Title and Top Header Action Buttons */}
          <div className="flex flex-col gap-4 rounded-2xl bg-[#0B2A55] p-5 shadow-sm sm:p-6">
            <div className="flex items-center gap-2 text-xs text-blue-100/75 font-medium">
              <span>Procurement</span>
              <ChevronRight className="size-3 text-blue-200/70" />
              <span className="font-semibold text-white">Finished Goods Requests</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-white shadow-lg ring-1 ring-inset ring-white/20"><Boxes className="size-6" aria-hidden="true" /></div>
              <div>
              <h1 className="text-2xl lg:text-[28px] font-bold tracking-tight text-white leading-tight">
                Finished Goods Requests
              </h1>
              <p className="text-xs sm:text-sm text-blue-100/85 mt-1">
                Request finished goods from Assembly and track production, warehouse pickup and completion.
              </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Button
                variant="outline"
                onClick={() => void fetchRequests()}
                disabled={loadingRequests}
                className="h-10 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-semibold text-xs sm:text-sm shadow-xs gap-2"
              >
                <RefreshCw className={`size-4 ${loadingRequests ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button
                ref={newRequestButtonRef}
                onClick={() => setIsDrawerOpen(true)}
                className="h-10 rounded-xl bg-[#0866FF] hover:bg-[#0052D6] text-white font-semibold text-xs sm:text-sm shadow-sm gap-1.5"
              >
                <Plus className="size-4" />
                New FG Request
              </Button>
            </div>
            </div>
          </div>

          {/* 4 KPI Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Card 1: Total Requests */}
            <div className="flex items-center gap-4 p-5 rounded-2xl bg-white border border-slate-200 border-t-4 border-t-[#0866FF] shadow-[0_4px_18px_-8px_rgba(7,29,59,0.18)]">
              <div className="size-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <Boxes className="size-6" />
              </div>
              <div>
                <p className="text-3xl font-extrabold text-slate-900 leading-none">{stats.total}</p>
                <p className="text-xs font-semibold text-slate-500 mt-1.5">Total Requests</p>
              </div>
            </div>

            {/* Card 2: In Progress */}
            <div className="flex items-center gap-4 p-5 rounded-2xl bg-white border border-slate-200 border-t-4 border-t-amber-400 shadow-[0_4px_18px_-8px_rgba(7,29,59,0.18)]">
              <div className="size-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                <Clock3 className="size-6" />
              </div>
              <div>
                <p className="text-3xl font-extrabold text-slate-900 leading-none">{stats.inProgress}</p>
                <p className="text-xs font-semibold text-amber-700 mt-1.5">In Progress</p>
              </div>
            </div>

            {/* Card 3: Ready for Pickup */}
            <div className="flex items-center gap-4 p-5 rounded-2xl bg-white border border-slate-200 border-t-4 border-t-[#00D4FF] shadow-[0_4px_18px_-8px_rgba(7,29,59,0.18)]">
              <div className="size-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <Truck className="size-6" />
              </div>
              <div>
                <p className="text-3xl font-extrabold text-slate-900 leading-none">{stats.readyForPickup}</p>
                <p className="text-xs font-semibold text-emerald-700 mt-1.5">Ready for Pickup</p>
              </div>
            </div>

            {/* Card 4: Completed */}
            <div className="flex items-center gap-4 p-5 rounded-2xl bg-white border border-slate-200 border-t-4 border-t-emerald-500 shadow-[0_4px_18px_-8px_rgba(7,29,59,0.18)]">
              <div className="size-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <CheckCircle2 className="size-6" />
              </div>
              <div>
                <p className="text-3xl font-extrabold text-slate-900 leading-none">{stats.completed}</p>
                <p className="text-xs font-semibold text-slate-500 mt-1.5">Completed</p>
              </div>
            </div>
          </div>

          <p className="text-xs leading-relaxed text-slate-600">Dispatched requests are included in Total Requests only; they are not counted as Completed.</p>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-0 basis-full sm:basis-64">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search request #, product name..."
                className="pl-9 h-10 rounded-xl border-slate-200 bg-white text-xs sm:text-sm placeholder:text-slate-400"
              />
            </div>

            {/* Status Dropdown */}
            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[150px] h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700">
                <SelectValue placeholder="Status: All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Status: All</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="READY_FOR_PICKUP">Ready for Pickup</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
              </SelectContent>
            </Select>

            {/* Requested By Dropdown */}
            <Select
              value={requestedByFilter}
              onValueChange={(val) => {
                setRequestedByFilter(val);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-[170px] h-10 rounded-xl border-slate-200 bg-white text-xs font-medium text-slate-700">
                <SelectValue placeholder="Requested By: All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Requested By: All</SelectItem>
                {uniqueRequesters.map((reqBy) => (
                  <SelectItem key={reqBy} value={reqBy}>
                    {reqBy}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Request Date Selector Popover */}
            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "h-10 rounded-xl border-slate-200 bg-white font-medium text-xs gap-2 transition-all cursor-pointer",
                    dateFilter
                      ? "border-[#0866FF] bg-blue-50/70 text-[#0866FF] font-semibold"
                      : "text-slate-700 hover:border-slate-300",
                  )}
                >
                  <Calendar className={cn("size-4", dateFilter ? "text-[#0866FF]" : "text-slate-500")} />
                  <span>{dateFilter ? formatDisplayDate(dateFilter) : "Request Date"}</span>
                  <ChevronDown className="size-3 text-slate-400" />
                  {dateFilter && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDateFilter("");
                        setCurrentPage(1);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.stopPropagation();
                          setDateFilter("");
                          setCurrentPage(1);
                        }
                      }}
                      className="ml-0.5 p-0.5 rounded-full hover:bg-blue-100 text-[#0866FF] transition-colors"
                      title="Clear date filter"
                    >
                      <X className="size-3" />
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-4 rounded-2xl border border-slate-200 shadow-xl bg-white" align="start">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-900">Filter by Request Date</span>
                    {dateFilter && (
                      <button
                        type="button"
                        onClick={() => {
                          setDateFilter("");
                          setCurrentPage(1);
                          setIsDatePickerOpen(false);
                        }}
                        className="text-[11px] font-semibold text-red-600 hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <div>
                    <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Select Date
                    </Label>
                    <input
                      type="date"
                      value={dateFilter}
                      onChange={(e) => {
                        setDateFilter(e.target.value);
                        setCurrentPage(1);
                        setIsDatePickerOpen(false);
                      }}
                      className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 outline-none focus:border-[#0866FF] focus:bg-white focus:ring-2 focus:ring-[#0866FF]/20 cursor-pointer"
                    />
                  </div>

                  <div className="pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Quick Presets
                    </span>
                    <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-lg text-xs font-medium border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                        onClick={() => {
                          setDateFilter(today());
                          setCurrentPage(1);
                          setIsDatePickerOpen(false);
                        }}
                      >
                        Today
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-lg text-xs font-medium border-slate-200 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200"
                        onClick={() => {
                          const d = new Date();
                          d.setDate(d.getDate() - 1);
                          setDateFilter(d.toISOString().split("T")[0]);
                          setCurrentPage(1);
                          setIsDatePickerOpen(false);
                        }}
                      >
                        Yesterday
                      </Button>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Filter Reset Button */}
            {(searchQuery || statusFilter !== "ALL" || requestedByFilter !== "ALL" || dateFilter || hasActiveAdvancedFilters) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetAllFilters}
                className="h-10 rounded-xl text-slate-500 hover:text-red-600 text-xs gap-1.5"
              >
                <X className="size-3.5" />
                Reset
              </Button>
            )}

          </div>

          {/* Full-Width Data Table Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto focus-visible:outline-2 focus-visible:outline-[#0866FF]" tabIndex={0} role="region" aria-label="Finished goods requests table. Scroll horizontally to see all columns.">
              <table className="w-full min-w-[1180px] text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    <th className="px-5 py-3.5">REQUEST</th>
                    <th className="px-5 py-3.5">PRODUCT</th>
                    <th className="px-5 py-3.5">QUANTITY</th>
                    <th className="px-5 py-3.5">REQUESTED BY</th>
                    <th className="px-5 py-3.5" title="Available inventory across matching product locations; not restricted to Assembly.">FG Available</th>
                    <th className="px-5 py-3.5">BOM ATTACHMENT</th>
                    <th className="px-5 py-3.5">STATUS</th>
                    <th className="px-5 py-3.5">REQUEST DATE</th>
                    <th className="px-5 py-3.5 text-center">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingRequests ? (
                    <tr>
                      <td colSpan={9} className="h-44 text-center">
                        <Loader2 className="size-6 animate-spin mx-auto text-blue-600" />
                        <span className="block mt-2 text-xs text-slate-500">Loading Finished Goods Requests...</span>
                      </td>
                    </tr>
                  ) : paginatedRequests.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="h-44 text-center p-6">
                        <ClipboardList className="size-10 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-slate-700">No Finished Goods Requests Found</p>
                        <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or create a new request.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedRequests.map((req) => {
                      const avail = req.fg_store_available ?? req.available_quantity ?? 0;
                      const reqQty = req.quantity ?? req.requested_quantity ?? 0;
                      const shortage = req.shortage ?? req.shortage_quantity ?? Math.max(0, reqQty - avail);
                      const bomUrl = req.bom_attachment_url;
                      const bomName = req.bom_attachment_name || "BOM Document";

                      return (
                        <tr
                          key={req.id || req.request_number}
                          onClick={() => setSelectedRequest(req)}
                          className="hover:bg-slate-50/70 cursor-pointer transition-colors"
                        >
                          {/* Request # */}
                          <td className="px-5 py-3.5 font-bold text-blue-600 hover:underline">
                            {req.request_number}
                          </td>

                          {/* Product */}
                          <td className="px-5 py-3.5">
                            <div className="font-semibold text-slate-900">
                              {req.product_name || req.finished_goods_name}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              {req.product_code || req.finished_goods_code || "-"}
                            </div>
                          </td>

                          {/* Quantity */}
                          <td className="px-5 py-3.5 font-bold text-slate-900 whitespace-nowrap">
                            {reqQty} {req.uom || "PCS"}
                          </td>

                          {/* Requested By */}
                          <td className="px-5 py-3.5 text-slate-700 font-medium whitespace-nowrap">
                            {req.requested_by || req.created_by || "procurement"}
                          </td>

                          {/* FG Avail. */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <div className="font-bold text-slate-900">
                              {avail} {req.uom || "PCS"}
                            </div>
                            {shortage > 0 ? (
                              <div className="text-[11px] font-semibold text-red-600">
                                Shortage: {shortage}
                              </div>
                            ) : (
                              <div className="text-[11px] font-semibold text-emerald-600">
                                In Stock
                              </div>
                            )}
                          </td>

                          {/* BOM Attachment */}
                          <td className="px-5 py-3.5">
                            {bomUrl ? (
                              <a
                                href={`${BUSINESS_API_URL}${bomUrl}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline"
                              >
                                <Paperclip className="size-3.5" />
                                <span className="max-w-[120px] truncate">{bomName}</span>
                              </a>
                            ) : (
                              <span className="text-xs text-slate-400 italic">None</span>
                            )}
                          </td>

                          {/* Status Badge */}
                          <td className="px-5 py-3.5 whitespace-nowrap">
                            <FGStatusBadge status={req.status || "IN PROGRESS"} />
                          </td>

                          {/* Request Date */}
                          <td className="px-5 py-3.5 text-xs text-slate-600 whitespace-nowrap">
                            {formatDisplayDate(req.requested_date || req.created_at)}
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="inline-flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedRequest(req)}
                                className="h-9 px-3 gap-2 text-[#0866FF] bg-blue-50 hover:bg-blue-100 rounded-lg font-semibold"
                                title="View Details"
                              >
                                <Eye className="size-4" /><span>View Details</span>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-3.5 border-t border-slate-100 bg-white text-xs text-slate-500 font-medium">
              <div>
                Showing {filteredRequests.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{" "}
                {Math.min(currentPage * pageSize, filteredRequests.length)} of {filteredRequests.length} requests
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="size-8 p-0 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronLeft className="size-4" />
                </Button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <Button
                    key={page}
                    variant={page === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className={`size-8 p-0 rounded-lg font-bold text-xs ${
                      page === currentPage
                        ? "bg-blue-600 text-white hover:bg-blue-700 border-blue-600 shadow-xs"
                        : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {page}
                  </Button>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="size-8 p-0 rounded-lg border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <span>Show</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(val) => {
                    setPageSize(Number(val));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[70px] h-8 rounded-lg border-slate-200 bg-white text-xs font-semibold text-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
                <span>per page</span>
              </div>
            </div>
          </div>
        </div>

        {/* Centered request dialog */}
        <Dialog open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <DialogContent
            className="flex max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-2xl border-slate-200 bg-white p-0 shadow-2xl"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              newRequestButtonRef.current?.focus();
            }}
          >
            {/* Dialog Header */}
            <div className="shrink-0 border-b border-[#0B2A55] bg-[#0B2A55] px-5 py-5 text-white sm:px-6">
              <div>
                <DialogTitle className="pr-6 text-xl font-bold tracking-tight text-white">
                  New Finished Goods Request
                </DialogTitle>
                <DialogDescription className="mt-2 pr-5 text-sm leading-relaxed text-blue-100/85">
                  Request product manufacturing and availability confirmation from Assembly.
                </DialogDescription>
              </div>

            </div>

            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="min-h-0 space-y-5 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">
              {/* Section 1: Request Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <div className="size-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <ClipboardList className="size-4" />
                  </div>
                  <span>Request Details</span>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Finished Product */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="finished-product" className="block text-sm font-medium leading-5 text-slate-700">
                    Finished Product <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="finished-product"
                    value={form.product_name}
                    onChange={(e) => setForm((c) => ({ ...c, product_name: e.target.value }))}
                    className="h-10 w-full min-w-0 rounded-lg border-slate-200 bg-white shadow-none text-sm placeholder:text-slate-400"
                    placeholder="e.g. PUMP-100"
                    required
                  />
                </div>

                {/* Quantity & UOM */}
                <div className="grid grid-cols-1 gap-4 sm:col-span-2 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="fg-quantity" className="block text-sm font-medium leading-5 text-slate-700">
                      Quantity <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="fg-quantity"
                      type="number"
                      min="0.01"
                      step="any"
                      value={form.quantity}
                      onChange={(e) => setForm((c) => ({ ...c, quantity: e.target.value }))}
                      className="h-10 w-full min-w-0 rounded-lg border-slate-200 bg-white shadow-none font-bold text-sm"
                      placeholder="10"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="fg-uom" className="block text-sm font-medium leading-5 text-slate-700">
                      UOM <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={form.uom}
                      onValueChange={(v) => setForm((c) => ({ ...c, uom: v }))}
                    >
                      <SelectTrigger id="fg-uom" className="h-10 w-full min-w-0 rounded-lg border-slate-200 bg-white shadow-none text-xs font-semibold text-slate-700">
                        <SelectValue placeholder="PCS (Pieces)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PCS">PCS (Pieces)</SelectItem>
                        <SelectItem value="KG">KG (Kilograms)</SelectItem>
                        <SelectItem value="MTR">MTR (Meters)</SelectItem>
                        <SelectItem value="LTR">LTR (Liters)</SelectItem>
                        <SelectItem value="BOX">BOX (Boxes)</SelectItem>
                        <SelectItem value="SET">SET (Sets)</SelectItem>
                        <SelectItem value="TON">TON (Metric Tons)</SelectItem>
                        <SelectItem value="PACK">PACK (Packages)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Required Date & Request Date */}
                <div className="grid grid-cols-1 gap-4 sm:col-span-2 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="fg-req-date" className="block text-sm font-medium leading-5 text-slate-700">
                      Required Date <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="fg-req-date"
                      type="date"
                      value={form.required_date}
                      onChange={(e) => setForm((c) => ({ ...c, required_date: e.target.value }))}
                      className="h-10 w-full min-w-0 rounded-lg border-slate-200 bg-white shadow-none text-sm"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="fg-requested-date" className="block text-sm font-medium leading-5 text-slate-700">
                      Request Date <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="fg-requested-date"
                      type="date"
                      value={form.requested_date}
                      onChange={(e) => setForm((c) => ({ ...c, requested_date: e.target.value }))}
                      className="h-10 w-full min-w-0 rounded-lg border-slate-200 bg-white shadow-none text-xs"
                      required
                    />
                  </div>
                </div>

                {/* Requested By */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="fg-requested-by" className="block text-sm font-medium leading-5 text-slate-700">
                    Requested By <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="fg-requested-by"
                    value={form.requested_by}
                    onChange={(e) => setForm((c) => ({ ...c, requested_by: e.target.value }))}
                    className="h-10 w-full min-w-0 rounded-lg border-slate-200 bg-white shadow-none font-medium text-sm"
                    placeholder="procurement"
                    required
                  />
                </div>
              </div>

                </div>

              {/* Section 2: Additional Details */}
              <div className="space-y-3 border-t border-slate-200 pt-5">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <div className="size-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Layers className="size-4" />
                  </div>
                  <span>Additional Details</span>
                </div>

                {/* BOM Attachment Drag & Drop Dropzone */}
                <div className="space-y-1.5">
                  <Label className="block text-sm font-medium leading-5 text-slate-700">
                    BOM Attachment (Optional)
                  </Label>
                  <input
                    ref={fileInputRef}
                    id="bom-upload-input"
                    type="file"
                    accept=".pdf,.xlsx,.xls,.csv,.doc,.docx"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  {!bomFile ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center cursor-pointer rounded-xl border border-dashed border-slate-300 bg-slate-50/50 px-4 py-4 text-center hover:border-blue-400 hover:bg-blue-50/30 transition group"
                    >
                      <div className="size-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2 group-hover:scale-105 transition">
                        <Upload className="size-5" />
                      </div>
                      <span className="block text-sm font-medium leading-5 text-slate-700">
                        <span className="text-blue-600 underline">Click to upload</span> a BOM attachment
                      </span>
                      <span className="text-[11px] text-slate-400 mt-1">
                        Supported formats: PDF, XLS, XLSX, CSV, DOC, DOCX
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Paperclip className="size-4 text-blue-600 shrink-0" />
                        <span className="text-xs font-semibold text-slate-800 truncate">{bomFile.name}</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={removeBomFile}
                        className="size-7 p-0 text-slate-400 hover:text-red-500 rounded-lg"
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  )}

                  {uploadingBom && (
                    <div className="flex items-center justify-center gap-2 text-xs text-blue-600 mt-2 font-medium">
                      <Loader2 className="size-3.5 animate-spin" />
                      Uploading BOM attachment...
                    </div>
                  )}
                </div>
              </div>

              </div>

              {/* Dialog Action Footer */}
              <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-200 bg-slate-50/70 px-5 py-4 sm:px-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDrawerOpen(false)}
                  className="h-10 px-5 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-sm"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || uploadingBom}
                  className="h-10 px-6 rounded-xl bg-[#0866FF] hover:bg-[#0052D6] text-white font-semibold text-sm shadow-sm gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send className="size-4" />
                      Submit Request
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <Card className="w-full max-w-2xl max-h-[90dvh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Boxes className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-lg font-bold text-slate-900">{selectedRequest.request_number}</h3>
                    <FGStatusBadge status={selectedRequest.status} />
                  </div>
                  <p className="text-xs text-slate-500">Finished Goods Request Overview</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedRequest(null)}
                className="size-8 p-0 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                <span className="text-[10px] font-bold uppercase text-slate-400">Product</span>
                <div className="font-bold text-sm text-slate-900 mt-1">
                  {selectedRequest.product_name || selectedRequest.finished_goods_name}
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  {selectedRequest.product_code || selectedRequest.finished_goods_code || "-"}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                <span className="text-[10px] font-bold uppercase text-slate-400">Requested Quantity</span>
                <div className="font-black text-lg text-blue-600 mt-0.5">
                  {selectedRequest.quantity || selectedRequest.requested_quantity} {selectedRequest.uom || "PCS"}
                </div>
                <div className="text-[11px] text-slate-400">
                  Required: {formatDisplayDate(selectedRequest.required_date)}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                <span className="text-[10px] font-bold uppercase text-slate-400">Requested By</span>
                <div className="font-bold text-sm text-slate-900 mt-1">
                  {selectedRequest.requested_by || selectedRequest.created_by || "procurement"}
                </div>
                <div className="text-[11px] text-slate-400">
                  On {formatDisplayDate(selectedRequest.requested_date || selectedRequest.created_at)}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                <span className="text-[10px] font-bold uppercase text-slate-400">FG Available</span>
                <div className="font-black text-lg text-emerald-600 mt-0.5">
                  {selectedRequest.fg_store_available ?? selectedRequest.available_quantity ?? 0} {selectedRequest.uom || "PCS"}
                </div>
                <div className="text-[11px] text-slate-400">Across matching inventory locations</div>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                <span className="text-[10px] font-bold uppercase text-slate-400">Shortage</span>
                <div className={`font-black text-lg mt-0.5 ${(selectedRequest.shortage ?? 0) > 0 ? "text-red-600" : "text-emerald-600"}`}>
                  {selectedRequest.shortage ?? selectedRequest.shortage_quantity ?? 0} {selectedRequest.uom || "PCS"}
                </div>
                <div className="text-[11px] text-slate-400">
                  {(selectedRequest.shortage ?? 0) > 0 ? "Assembly required" : "In Stock"}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                <span className="text-[10px] font-bold uppercase text-slate-400">BOM Attachment</span>
                <div className="mt-1.5">
                  {selectedRequest.bom_attachment_url ? (
                    <a
                      href={`${BUSINESS_API_URL}${selectedRequest.bom_attachment_url}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline"
                    >
                      <Download className="size-3.5" /> Download
                    </a>
                  ) : (
                    <span className="text-slate-400 italic">None attached</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                onClick={() => setSelectedRequest(null)}
                className="h-9 px-4 rounded-xl border-slate-200 text-slate-700 text-xs font-semibold"
              >
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
