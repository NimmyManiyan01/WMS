import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import {
  ClipboardList,
  Search,
  Loader2,
  Calendar,
  ArrowRight,
  Building2,
  Clock,
  X,
  Eye,
  Info,
  AlertCircle,
  UserRound,
  Factory,
  Layers,
  CheckCircle2,
  RefreshCw,
  ChevronRight,
  Package,
  Boxes,
  FileQuestion,
  FileText,
} from "lucide-react";
import { AppShell } from "@/components/wms/app-shell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { requireRole } from "@/lib/auth-utils";
import { cn } from "@/lib/utils";

function formatDisplayDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const clean = String(dateStr).split("T")[0];
  const parts = clean.split("-");
  if (parts.length === 3) {
    const [year, month, day] = parts;
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const mIdx = parseInt(month, 10) - 1;
    if (mIdx >= 0 && mIdx < 12) {
      return `${parseInt(day, 10)} ${months[mIdx]} ${year}`;
    }
  }
  return clean;
}

export const Route = createFileRoute("/procurement/material-requests")({
  beforeLoad: () => requireRole(["PROCUREMENT", "MANAGER", "ADMIN", "SUPERUSER"]),
  component: MaterialRequests,
});

function MRStatusBadge({ status }: { status: string }) {
  const norm = String(status || "").trim().toLowerCase();
  if (norm === "submitted" || norm === "pending" || norm === "in review") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]">
        <span className="size-1.5 rounded-full bg-[#D97706] animate-pulse" />
        Manager Approval
      </span>
    );
  }
  if (norm === "approved") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]">
        <span className="size-1.5 rounded-full bg-[#16A34A]" />
        Approved
      </span>
    );
  }
  if (norm.includes("rfq") || norm === "converted to rfq") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#F3E8FF] text-[#6B21A8] border border-[#E9D5FF]">
        <span className="size-1.5 rounded-full bg-[#7C4DFF]" />
        RFQ Created
      </span>
    );
  }
  if (norm.includes("po") || norm.includes("order")) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]">
        <span className="size-1.5 rounded-full bg-[#0866FF]" />
        PO Created
      </span>
    );
  }
  if (norm.includes("fulfill") || norm.includes("close")) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#E6FFFA] text-[#0D9488] border border-[#99F6E4]">
        <span className="size-1.5 rounded-full bg-[#0D9488]" />
        Fulfilled
      </span>
    );
  }
  if (norm.includes("reject")) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA]">
        <span className="size-1.5 rounded-full bg-[#EF4444]" />
        Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
      {status || "Unknown"}
    </span>
  );
}

function MRPriorityBadge({ priority }: { priority: string }) {
  const p = String(priority || "MEDIUM").toUpperCase();
  if (p === "HIGH" || p === "URGENT") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA]">
        <AlertCircle className="size-3" />
        {p}
      </span>
    );
  }
  if (p === "LOW") {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]">
        LOW
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A]">
      MEDIUM
    </span>
  );
}

const sampleMaterialRequests = [
  {
    id: "mr-demo-1",
    requestNumber: "MR-202611-0012",
    request_number: "MR-202611-0012",
    status: "Approved",
    priority: "HIGH",
    warehouseId: "WH-NORTH-01",
    requestedBy: "Ramesh Sharma",
    requiredDate: "2026-11-20",
    department: "Main Assembly Line 2",
    remarks: "[Note to Procurement: Urgent sourcing required for upcoming pump batch production]",
    items: [
      { materialCode: "RM-STL-402", materialName: "Stainless Steel Shaft 40mm", category: "Raw Material", quantity: 50, uom: "PCS" },
      { materialCode: "RM-BRG-6204", materialName: "Deep Groove Ball Bearing 6204", category: "Hardware", quantity: 100, uom: "PCS" },
      { materialCode: "RM-SL-008", materialName: "Nitrile O-Ring Seal 50mm", category: "Seals", quantity: 200, uom: "PCS" },
    ],
    approvalHistory: [
      { status: "Submitted", actor: "Ramesh Sharma (Warehouse Mgr)", timestamp: "2026-11-10T09:30:00Z", comments: "Requisition raised for line shortage" },
      { status: "Approved", actor: "Arun Verma (Operations Head)", timestamp: "2026-11-11T14:15:00Z", comments: "Approved for procurement processing" },
    ],
  },
  {
    id: "mr-demo-2",
    requestNumber: "MR-202611-0011",
    request_number: "MR-202611-0011",
    status: "Converted to RFQ",
    priority: "MEDIUM",
    warehouseId: "WH-CENTRAL-DC",
    requestedBy: "Priya Nair",
    requiredDate: "2026-11-25",
    department: "Packaging & Crating",
    remarks: "Standard quarterly replenishment for corrugated boxes and heavy-duty bubble wrap",
    items: [
      { materialCode: "PKG-BOX-500", materialName: "Corrugated Box 500x400x300mm 5-Ply", category: "Packaging", quantity: 1500, uom: "PCS" },
      { materialCode: "PKG-TP-48", materialName: "BOPP Packing Tape 48mm Brown", category: "Packaging", quantity: 120, uom: "ROLLS" },
    ],
    approvalHistory: [
      { status: "Submitted", actor: "Priya Nair", timestamp: "2026-11-08T11:00:00Z", comments: "Quarterly packaging requirement" },
      { status: "Approved", actor: "Arun Verma", timestamp: "2026-11-09T10:00:00Z", comments: "Approved" },
      { status: "Converted to RFQ", actor: "Procurement Team", timestamp: "2026-11-10T16:20:00Z", comments: "RFQ-2026-0044 created and published to 4 vendors" },
    ],
  },
  {
    id: "mr-demo-3",
    requestNumber: "MR-202611-0010",
    request_number: "MR-202611-0010",
    status: "Submitted",
    priority: "HIGH",
    warehouseId: "WH-SOUTH-02",
    requestedBy: "Vikram Malhotra",
    requiredDate: "2026-11-18",
    department: "Sub-Assembly Fabrication",
    remarks: "[Note to Procurement: Vendor sourcing needed - Existing vendor failed quality test]",
    items: [
      { materialCode: "RM-COP-W08", materialName: "Enamelled Copper Winding Wire 0.8mm", category: "Raw Material", quantity: 80, uom: "KG" },
      { materialCode: "INS-SH-05", materialName: "Nomex Insulation Sheet 0.5mm", category: "Electrical", quantity: 45, uom: "SQM" },
    ],
    approvalHistory: [
      { status: "Submitted", actor: "Vikram Malhotra", timestamp: "2026-11-12T08:00:00Z", comments: "Pending manager sign-off" },
    ],
  },
  {
    id: "mr-demo-4",
    requestNumber: "MR-202611-0009",
    request_number: "MR-202611-0009",
    status: "PO Created",
    priority: "LOW",
    warehouseId: "WH-NORTH-01",
    requestedBy: "Kavita Sen",
    requiredDate: "2026-11-30",
    department: "MRO Maintenance",
    remarks: "Hydraulic oil and machine lubrication lubricants for periodic maintenance",
    items: [
      { materialCode: "LUB-HYD-68", materialName: "Industrial Hydraulic Oil ISO VG 68", category: "Consumables", quantity: 4, uom: "BARRELS" },
      { materialCode: "LUB-GRS-EP2", materialName: "Lithium EP-2 Multi-Purpose Grease", category: "Consumables", quantity: 25, uom: "KG" },
    ],
    approvalHistory: [
      { status: "Submitted", actor: "Kavita Sen", timestamp: "2026-11-05T14:30:00Z", comments: "Maintenance requisition" },
      { status: "Approved", actor: "Arun Verma", timestamp: "2026-11-06T09:00:00Z", comments: "Approved" },
      { status: "PO Created", actor: "Procurement Manager", timestamp: "2026-11-08T15:00:00Z", comments: "PO-2026-0189 issued to Servo Lubricants Ltd" },
    ],
  },
  {
    id: "mr-demo-5",
    requestNumber: "MR-202611-0008",
    request_number: "MR-202611-0008",
    status: "Fulfilled",
    priority: "MEDIUM",
    warehouseId: "WH-CENTRAL-DC",
    requestedBy: "Ramesh Sharma",
    requiredDate: "2026-11-05",
    department: "Foundry & Casting",
    remarks: "Alloy ingots delivery completed and accepted into quarantine store",
    items: [
      { materialCode: "RM-ALU-6061", materialName: "Aluminium Alloy Ingot Grade 6061", category: "Raw Material", quantity: 500, uom: "KG" },
    ],
    approvalHistory: [
      { status: "Submitted", actor: "Ramesh Sharma", timestamp: "2026-10-25T10:00:00Z", comments: "Batch replenishment" },
      { status: "Approved", actor: "Arun Verma", timestamp: "2026-10-26T11:00:00Z", comments: "Approved" },
      { status: "PO Created", actor: "Procurement Team", timestamp: "2026-10-28T16:00:00Z", comments: "PO-2026-0174 created" },
      { status: "Fulfilled", actor: "Store Receiving", timestamp: "2026-11-05T12:00:00Z", comments: "GRN-2026-0922 completed. Goods received and stored." },
    ],
  },
];

function MaterialRequests() {
  const location = useRouterState({ select: (state) => state.location });
  const routeParams = new URLSearchParams(location.searchStr || "");
  const routeStatus = routeParams.get("status");
  const [requests, setRequests] = useState<any[]>(sampleMaterialRequests);
  const [supplierAvailability, setSupplierAvailability] = useState<Record<string, boolean>>({
    "mr-demo-1": true,
  });
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState(() => {
    if (typeof window === "undefined") return "all";
    const status = new URLSearchParams(window.location.search).get("status");
    if (status === "manager-approval") return "manager-approval";
    return "all";
  });

  const timeoutPromise = <T,>(promise: Promise<T>, ms = 2500, fallback: T): Promise<T> => {
    return Promise.race([
      promise,
      new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
    ]).catch(() => fallback);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await timeoutPromise(api.getMaterialRequests(), 2500, []);
      if (Array.isArray(data) && data.length > 0) {
        setRequests(data);
        void fetchSupplierAvailability(data);
      } else {
        setRequests(sampleMaterialRequests);
      }
    } catch (error) {
      console.error("Failed to fetch material requests:", error);
      toast.error("Failed to load material requests");
      setRequests(sampleMaterialRequests);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();

    const refreshRequests = () => {
      void fetchData();
    };
    window.addEventListener("material-requests:changed", refreshRequests);
    return () => window.removeEventListener("material-requests:changed", refreshRequests);
  }, []);

  useEffect(() => {
    if (routeStatus === "manager-approval") {
      setStatusFilter("manager-approval");
    }
  }, [routeStatus]);

  const matchesStatusFilter = (request: any, filter: string) => {
    const normalizedStatus = String(request.status || "").toLowerCase();
    if (filter === "manager-approval") return normalizedStatus === "submitted" || normalizedStatus === "pending";
    if (filter === "rfq-created") {
      return normalizedStatus === "converted to rfq" || normalizedStatus === "rfq created" || normalizedStatus.includes("rfq");
    }
    if (filter === "po-created") {
      return normalizedStatus === "po created" || normalizedStatus === "purchase order created" || normalizedStatus.includes("po");
    }
    if (filter === "fulfilled") {
      return normalizedStatus === "fulfilled" || normalizedStatus === "closed";
    }
    if (filter === "rejected") return normalizedStatus === "rejected";
    return true;
  };

  const statusTabs = [
    { id: "all", label: "All" },
    { id: "manager-approval", label: "Manager Approval" },
    { id: "rfq-created", label: "RFQ Created" },
    { id: "po-created", label: "PO Created" },
    { id: "fulfilled", label: "Fulfilled" },
    { id: "rejected", label: "Rejected" },
  ];

  const getTabCount = (filter: string) =>
    requests.filter((request) => matchesStatusFilter(request, filter)).length;

  const activeTab = statusTabs.find((tab) => tab.id === statusFilter) || statusTabs[0];

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      if (!matchesStatusFilter(request, statusFilter)) return false;
      const normalizedQuery = query.trim().toLowerCase();
      if (!normalizedQuery) return true;
      const itemText = (request.items || [])
        .map((item: any) =>
          [
            item.materialCode,
            item.material_code,
            item.materialName,
            item.material_name,
            item.variantCode,
            item.variant_code,
          ]
            .filter(Boolean)
            .join(" "),
        )
        .join(" ");
      return [
        request.requestNumber,
        request.request_number,
        request.warehouseId,
        request.warehouse_id,
        request.requestedBy,
        request.requested_by,
        itemText,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));
    });
  }, [requests, statusFilter, query]);

  const totalQuantity = (request: any) =>
    (request.items || []).reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0);

  const itemCategory = (item: any) => item.category || item.materialCategory || item.material_category;
  const itemMaterialName = (item: any) => item.materialName || item.material_name || item.materialCode || item.material_code;
  const hasMatchingSuppliers = (request: any) => supplierAvailability[request.id] === true;

  const normalizeMatchText = (value: unknown) =>
    String(value || "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, " ")
      .split(" ")
      .map((part) => part.trim())
      .filter((part) => part && part !== "and")
      .map((part) => (part.length > 3 && part.endsWith("s") ? part.slice(0, -1) : part));

  const normalizedValues = (value: unknown) => {
    const values = Array.isArray(value) ? value : [value];
    return values.flatMap((entry) => normalizeMatchText(entry));
  };

  const hasSharedMatchToken = (left: unknown, right: unknown) => {
    const leftTokens = new Set(normalizedValues(left));
    if (leftTokens.size === 0) return false;
    return normalizedValues(right).some((token) => leftTokens.has(token));
  };

  const supplierCategories = (supplier: any) =>
    supplier.category || supplier.categories || supplier.materialCategories || supplier.material_categories || [];

  const supplierMaterials = (supplier: any) =>
    supplier.mainMaterials || supplier.main_materials || supplier.materials || [];

  const supplierMatchesItem = (supplier: any, item: any) => {
    const category = itemCategory(item);
    const material = itemMaterialName(item);
    return (
      (!!category && hasSharedMatchToken(category, supplierCategories(supplier))) ||
      (!!category && hasSharedMatchToken(category, supplierMaterials(supplier))) ||
      (!!material && hasSharedMatchToken(material, supplierMaterials(supplier))) ||
      (!!material && hasSharedMatchToken(material, supplierCategories(supplier)))
    );
  };

  const fetchSupplierAvailability = async (materialRequests: any[]) => {
    const approvedRequests = materialRequests.filter(
      (request) => String(request.status || "").toLowerCase() === "approved",
    );
    if (approvedRequests.length === 0) {
      setSupplierAvailability({});
      return;
    }

    try {
      const activeSuppliers = (await timeoutPromise(api.getSuppliers({ status: "Active" }), 2000, [])).filter(
        (supplier: any) =>
          String(supplier.status ?? "")
            .trim()
            .toLowerCase() === "active",
      );
      if (activeSuppliers.length === 0) {
        setSupplierAvailability(Object.fromEntries(approvedRequests.map((r) => [r.id, true])));
        return;
      }
      const availabilityEntries = approvedRequests.map((request) => {
        const items = request.items || [];
        if (items.length === 0) return [request.id, false] as const;

        const itemMatches = items.map((item: any) =>
          activeSuppliers.some((supplier: any) => supplierMatchesItem(supplier, item)),
        );
        return [request.id, itemMatches.every(Boolean)] as const;
      });

      setSupplierAvailability(Object.fromEntries(availabilityEntries));
    } catch (error) {
      console.error("Failed to check matching suppliers:", error);
      setSupplierAvailability(
        Object.fromEntries(approvedRequests.map((request) => [request.id, true])),
      );
    }
  };

  const requestStatusLabel = (status: string) => {
    if (status === "Converted to RFQ") return "RFQ Created";
    return status;
  };

  const handleRequestClick = (req: any) => {
    setSelectedRequest(req);
    setIsModalOpen(true);
  };

  // Compute 4 KPI stats
  const stats = useMemo(() => {
    return {
      total: requests.length,
      managerApproval: requests.filter((r) => {
        const s = String(r.status || "").toLowerCase();
        return s === "submitted" || s === "pending";
      }).length,
      rfqCreated: requests.filter((r) => {
        const s = String(r.status || "").toLowerCase();
        return s === "converted to rfq" || s === "rfq created" || s.includes("rfq");
      }).length,
      poCreated: requests.filter((r) => {
        const s = String(r.status || "").toLowerCase();
        return s === "po created" || s === "purchase order created" || s.includes("po");
      }).length,
      fulfilled: requests.filter((r) => {
        const s = String(r.status || "").toLowerCase();
        return s === "fulfilled" || s === "closed";
      }).length,
    };
  }, [requests]);

  return (
    <AppShell mainClassName="bg-[#F5F8FF]">
      <div className="space-y-6 pb-24 max-w-[1536px] mx-auto">
        {/* 1. Breadcrumbs */}
        {/* 2. Page Header with Blue Icon Tile, Title, Description, and Actions */}
        <div className="flex flex-col gap-4 rounded-2xl bg-[#0B2A55] p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-100/75">
            <Link to="/procurement-dashboard" className="hover:text-white transition-colors">Procurement</Link>
            <ChevronRight className="size-3 text-blue-200/70" />
            <span className="font-bold text-white">Material Requests</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="size-12 rounded-2xl bg-white/10 border border-white/20 text-white flex items-center justify-center shadow-xs shrink-0">
              <ClipboardList className="size-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-[28px] font-extrabold tracking-tight text-white leading-tight">
                  Material Requests
                </h1>
                <TooltipProvider delayDuration={150}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label="Material Requests Info"
                        className="inline-flex size-6 items-center justify-center rounded-full text-blue-100/75 hover:text-white hover:bg-white/10 transition-colors cursor-help"
                      >
                        <Info className="size-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-xs text-xs font-medium border-[#102D57] bg-[#071D3B] text-white shadow-lg">
                      Review and process material requirements submitted by warehouse users for procurement sourcing.
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className="text-xs sm:text-sm font-medium text-blue-100/85 mt-0.5">
                {statusFilter === "manager-approval"
                  ? "Material requests waiting for manager approval"
                  : "View and process material requirements from the warehouse"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
            <Button
              variant="outline"
              onClick={() => void fetchData()}
              disabled={loading}
              className="h-10 rounded-xl border-[#DCE6F3] bg-white text-[#101D3A] hover:bg-[#F5F8FF] hover:border-[#0866FF]/40 font-semibold text-xs sm:text-sm shadow-xs gap-2"
            >
              <RefreshCw className={`size-4 text-[#0866FF] ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
          </div>
        </div>

        {/* 3. 4 KPI Summary Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex items-center gap-4 p-4 lg:p-5 rounded-2xl bg-white border border-[#DCE6F3] shadow-xs hover:border-[#0866FF]/30 transition-all">
            <div className="size-11 sm:size-12 rounded-2xl bg-[#EBF3FF] text-[#0866FF] flex items-center justify-center shrink-0 shadow-2xs">
              <ClipboardList className="size-6" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl sm:text-3xl font-extrabold text-[#101D3A] leading-none tabular-nums">
                {loading ? "..." : stats.total}
              </p>
              <p className="text-xs font-semibold text-[#526580] mt-1 truncate">Total Requisitions</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 lg:p-5 rounded-2xl bg-white border border-[#DCE6F3] shadow-xs hover:border-amber-400/40 transition-all">
            <div className="size-11 sm:size-12 rounded-2xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center shrink-0 shadow-2xs">
              <Clock className="size-6" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl sm:text-3xl font-extrabold text-[#101D3A] leading-none tabular-nums">
                {loading ? "..." : stats.managerApproval}
              </p>
              <p className="text-xs font-semibold text-[#526580] mt-1 truncate">Manager Approval</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 lg:p-5 rounded-2xl bg-white border border-[#DCE6F3] shadow-xs hover:border-purple-400/40 transition-all">
            <div className="size-11 sm:size-12 rounded-2xl bg-[#F3E8FF] text-[#7C4DFF] flex items-center justify-center shrink-0 shadow-2xs">
              <Layers className="size-6" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl sm:text-3xl font-extrabold text-[#101D3A] leading-none tabular-nums">
                {loading ? "..." : stats.rfqCreated}
              </p>
              <p className="text-xs font-semibold text-[#526580] mt-1 truncate">RFQ Created</p>
            </div>
          </div>

          <div className="flex items-center gap-4 p-4 lg:p-5 rounded-2xl bg-white border border-[#DCE6F3] shadow-xs hover:border-emerald-400/40 transition-all">
            <div className="size-11 sm:size-12 rounded-2xl bg-[#DCFCE7] text-[#16A34A] flex items-center justify-center shrink-0 shadow-2xs">
              <CheckCircle2 className="size-6" />
            </div>
            <div className="min-w-0">
              <p className="text-2xl sm:text-3xl font-extrabold text-[#101D3A] leading-none tabular-nums">
                {loading ? "..." : stats.poCreated + stats.fulfilled}
              </p>
              <p className="text-xs font-semibold text-[#526580] mt-1 truncate">PO / Fulfilled</p>
            </div>
          </div>
        </div>

        {/* 4. Compact Search & Filter Toolbar */}
        <div className="flex flex-col gap-3 rounded-2xl border border-[#DCE6F3] bg-white p-3.5 sm:p-4 shadow-xs">
          {/* Search bar row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#526580]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search request #, material code, name, warehouse, requested by..."
                className="h-10 w-full rounded-xl border border-[#DCE6F3] bg-[#F5F8FF] pl-10 pr-9 text-xs sm:text-sm text-[#101D3A] outline-none transition-all placeholder:text-[#8FA3BF] focus:bg-white focus:border-[#0866FF] focus:ring-2 focus:ring-[#0866FF]/20"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8FA3BF] hover:text-[#101D3A]"
                  title="Clear search"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <span className="text-xs font-semibold text-[#526580]">
                Showing <span className="font-bold text-[#101D3A]">{filteredRequests.length}</span> of{" "}
                <span className="font-bold text-[#101D3A]">{requests.length}</span>
              </span>
              {(query || statusFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setQuery("");
                    setStatusFilter("all");
                  }}
                  className="text-xs text-[#0866FF] hover:bg-[#EBF3FF] h-8 px-2.5 font-semibold"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* Status Tabs Row with strong active pill styling */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#DCE6F3]/60">
            {statusTabs.map((tab) => {
              const active = statusFilter === tab.id;
              const count = getTabCount(tab.id);
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold transition-all",
                    active
                      ? "bg-[#0866FF] text-white shadow-xs"
                      : "bg-[#F5F8FF] text-[#526580] hover:bg-[#EBF3FF] hover:text-[#0866FF] border border-[#DCE6F3]"
                  )}
                >
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      "grid min-w-5 h-5 place-items-center rounded-full px-1.5 text-[10px] font-extrabold tabular-nums",
                      active ? "bg-white/20 text-white" : "bg-[#DCE6F3] text-[#101D3A]"
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 5. Request Cards List */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="size-8 animate-spin text-[#0866FF]" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border-2 border-dashed border-[#DCE6F3] bg-white">
            <ClipboardList className="size-12 text-[#8FA3BF] mb-3 opacity-60" />
            <h3 className="text-base font-bold text-[#101D3A]">
              {statusFilter === "manager-approval"
                ? "No manager approval requests"
                : "No material requests found"}
            </h3>
            <p className="text-xs sm:text-sm text-[#526580] mt-1 max-w-sm">
              {statusFilter === "manager-approval"
                ? "There are currently no warehouse requests awaiting manager approval."
                : "No material requisitions match your search filters."}
            </p>
            {(query || statusFilter !== "all") && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setQuery("");
                  setStatusFilter("all");
                }}
                className="mt-4 rounded-xl border-[#DCE6F3] text-xs font-semibold"
              >
                Clear all filters
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((req) => (
              <div
                key={req.id}
                className="group relative rounded-2xl border border-[#DCE6F3] bg-white p-4 sm:p-5 shadow-xs hover:border-[#0866FF]/60 hover:shadow-md transition-all duration-200"
              >
                {/* Card Header: Request #, Badges & Actions */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#DCE6F3]/70">
                  <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                    <span
                      onClick={() => handleRequestClick(req)}
                      className="font-mono text-base font-extrabold text-[#0866FF] tracking-tight hover:underline cursor-pointer flex items-center gap-1.5"
                    >
                      <span className="size-2 rounded-full bg-[#0866FF]" />
                      {req.requestNumber || req.request_number}
                    </span>
                    <MRStatusBadge status={requestStatusLabel(req.status)} />
                    <MRPriorityBadge priority={req.priority} />
                    {req.remarks?.includes("[Note to Procurement:") && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-[#FEF3C7] px-2.5 py-0.5 text-[11px] font-bold text-[#B45309]">
                        <AlertCircle className="size-3 text-[#D97706]" /> Sourcing Required
                      </span>
                    )}
                  </div>

                  {/* Actions: View Details, Create RFQ */}
                  <div className="flex flex-wrap items-center gap-2 ml-auto shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRequestClick(req)}
                      className="h-8 rounded-xl border-[#DCE6F3] bg-white text-xs font-bold text-[#101D3A] hover:bg-[#EBF3FF] hover:text-[#0866FF] hover:border-[#0866FF]/40 shadow-2xs gap-1.5"
                    >
                      <Eye className="size-3.5 text-[#0866FF]" />
                      View Details
                    </Button>

                    {req.status === "Approved" && hasMatchingSuppliers(req) && (
                      <Button
                        size="sm"
                        className="h-8 rounded-xl bg-[#0866FF] hover:bg-[#0054D6] text-white text-xs font-bold shadow-xs gap-1.5"
                        asChild
                      >
                        <Link to="/procurement/new-rfq" search={{ fromRequestId: req.id }}>
                          <span>Create RFQ</span>
                          <ArrowRight className="size-3.5" />
                        </Link>
                      </Button>
                    )}

                    {req.status === "Approved" && supplierAvailability[req.id] === false && (
                      <span className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-amber-300 bg-[#FFFBEB] px-2.5 text-[11px] font-bold text-[#B45309]">
                        <AlertCircle className="size-3.5 text-[#D97706]" />
                        No Active Supplier
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Middle: 4 Grouped Fields (Warehouse, Requested By, Required Date, Department) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-3 text-xs">
                  <div className="space-y-0.5 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#526580]">Warehouse</p>
                    <p className="flex items-center gap-1.5 font-bold text-[#101D3A] truncate">
                      <Building2 className="size-3.5 text-[#0866FF] shrink-0" />
                      <span className="truncate">{req.warehouseId || req.warehouse_id || "Warehouse"}</span>
                    </p>
                  </div>

                  <div className="space-y-0.5 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#526580]">Requested By</p>
                    <p className="flex items-center gap-1.5 font-bold text-[#101D3A] truncate">
                      <UserRound className="size-3.5 text-[#0866FF] shrink-0" />
                      <span className="truncate">{req.requestedBy || req.requested_by || "Warehouse Manager"}</span>
                    </p>
                  </div>

                  <div className="space-y-0.5 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#526580]">Required Date</p>
                    <p className="flex items-center gap-1.5 font-bold text-[#101D3A] tabular-nums">
                      <Calendar className="size-3.5 text-[#0866FF] shrink-0" />
                      <span>{formatDisplayDate(req.requiredDate || req.required_date)}</span>
                    </p>
                  </div>

                  <div className="space-y-0.5 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#526580]">Department / Route</p>
                    <p className="flex items-center gap-1.5 font-bold text-[#101D3A] truncate">
                      <Factory className="size-3.5 text-[#7C4DFF] shrink-0" />
                      <span className="truncate">{req.department || req.suggestedSupplier || "Assembly Operations"}</span>
                    </p>
                  </div>
                </div>

                {/* Card Bottom: Summary Strip of Items & Qty */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-[#DCE6F3]/80 bg-[#F5F8FF] px-3.5 py-2 text-xs">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-[#526580]">Items:</span>
                      <span className="font-extrabold text-[#101D3A] rounded-md bg-white border border-[#DCE6F3] px-2 py-0.5 text-xs">
                        {req.items?.length || 0}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-[#526580]">Total Quantity:</span>
                      <span className="font-extrabold text-[#0866FF] rounded-md bg-white border border-[#DCE6F3] px-2 py-0.5 text-xs tabular-nums">
                        {Math.floor(totalQuantity(req))} PCS
                      </span>
                    </div>

                    {/* Item preview chips */}
                    <div className="hidden sm:flex flex-wrap items-center gap-1.5">
                      {(req.items || []).slice(0, 3).map((item: any, i: number) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 rounded-md bg-white border border-[#DCE6F3] px-2 py-0.5 text-[11px] font-semibold text-[#101D3A]"
                        >
                          <span className="text-[#0866FF] font-mono">{item.materialCode || item.material_code}</span>
                          <span className="text-[#8FA3BF]">·</span>
                          <span className="text-[#526580]">{Math.floor(item.quantity || 0)} {item.uom || "PCS"}</span>
                        </span>
                      ))}
                      {(req.items?.length || 0) > 3 && (
                        <span className="text-[11px] font-bold text-[#526580]">
                          +{(req.items?.length || 0) - 3} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right side snippet */}
                  <div className="ml-auto text-[11px] text-[#526580] font-medium flex items-center gap-1">
                    {req.remarks?.includes("[Note to Procurement:") ? (
                      <span className="font-semibold text-amber-700 max-w-xs truncate">
                        {req.remarks.match(/\[Note to Procurement:[^\]]+\]/)?.[0]}
                      </span>
                    ) : (
                      <span className="italic text-[#8FA3BF] truncate max-w-[220px]">
                        {req.remarks || "Standard requisition"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 6. Request Details Modal / Dialog matching Master Enterprise styling */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-4xl w-full rounded-3xl p-0 overflow-hidden border border-[#DCE6F3] shadow-2xl [&>button]:text-white/80 hover:[&>button]:text-white [&>button]:top-5 [&>button]:right-5">
            {selectedRequest && (
              <div className="flex flex-col h-full max-h-[90vh]">
                {/* Modal Header */}
                <div className="p-6 text-white bg-gradient-to-r from-[#071D3B] via-[#0B2A59] to-[#0866FF] flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <DialogTitle className="text-xl font-bold tracking-tight text-white">
                        Material Request Details
                      </DialogTitle>
                      <MRStatusBadge status={selectedRequest.status} />
                    </div>
                    <p className="text-white/80 text-sm font-mono font-bold tracking-wider">
                      {selectedRequest.requestNumber || selectedRequest.request_number}
                    </p>
                  </div>
                </div>

                {/* Modal Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 w-full min-w-0 bg-white">
                  {/* Overview Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-[#F5F8FF] border border-[#DCE6F3]">
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-[#526580]">
                        Department
                      </Label>
                      <p className="font-bold text-sm text-[#101D3A]">{selectedRequest.department || "General Operations"}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-[#526580]">
                        Required Date
                      </Label>
                      <p className="font-bold text-sm text-[#101D3A] tabular-nums">
                        {formatDisplayDate(selectedRequest.requiredDate || selectedRequest.required_date)}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-[#526580]">
                        Requested By
                      </Label>
                      <p className="font-bold text-sm text-[#101D3A]">{selectedRequest.requestedBy || selectedRequest.requested_by || "Warehouse User"}</p>
                    </div>
                    <div className="space-y-1 sm:text-right">
                      <Label className="text-[10px] uppercase font-bold text-[#526580]">
                        Warehouse
                      </Label>
                      <p className="font-bold text-sm text-[#101D3A]">{selectedRequest.warehouseId || selectedRequest.warehouse_id || "Main Warehouse"}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase font-bold text-[#526580]">
                        Priority
                      </Label>
                      <div>
                        <MRPriorityBadge priority={selectedRequest.priority} />
                      </div>
                    </div>
                    <div className="space-y-1 sm:col-span-3">
                      <Label className="text-[10px] uppercase font-bold text-[#526580]">
                        Suggested Supplier
                      </Label>
                      <p className="font-bold text-sm text-[#101D3A]">
                        {selectedRequest.suggestedSupplier || "Open for quotation to active category vendors"}
                      </p>
                    </div>
                  </div>

                  {/* Requested Materials Table */}
                  <div className="space-y-3">
                    <Label className="text-[11px] uppercase font-bold text-[#526580] tracking-wider">
                      Requested Materials ({selectedRequest.items?.length || 0})
                    </Label>
                    <div className="rounded-2xl border border-[#DCE6F3] overflow-hidden bg-white shadow-2xs">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead>
                          <tr className="bg-[#F5F8FF] border-b border-[#DCE6F3]">
                            <th className="p-3 text-[11px] uppercase font-bold text-[#526580]">
                              Material Code
                            </th>
                            <th className="p-3 text-[11px] uppercase font-bold text-[#526580]">
                              Material Name &amp; Specs
                            </th>
                            <th className="p-3 text-[11px] uppercase font-bold text-[#526580]">
                              Category
                            </th>
                            <th className="p-3 text-[11px] uppercase font-bold text-[#526580] text-center w-20">
                              Qty
                            </th>
                            <th className="p-3 text-[11px] uppercase font-bold text-[#526580] w-20">
                              UOM
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#DCE6F3]/70">
                          {selectedRequest.items?.map((item: any, idx: number) => (
                            <tr
                              key={idx}
                              className="hover:bg-[#F5F8FF]/80 transition-colors"
                            >
                              <td className="p-3 font-mono text-xs font-bold text-[#0866FF]">
                                {item.materialCode || item.material_code}
                              </td>
                              <td className="p-3 font-semibold text-[#101D3A]">
                                {item.materialName || item.material_name || "—"}
                              </td>
                              <td className="p-3 text-xs font-medium text-[#526580]">
                                {item.category || "General"}
                              </td>
                              <td className="p-3 text-center font-extrabold text-[#0866FF] tabular-nums">
                                {Math.floor(Number(item.quantity || 0))}
                              </td>
                              <td className="p-3 text-xs font-bold uppercase text-[#526580]">
                                {item.uom || "PCS"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Remarks / Justification */}
                  <div className="space-y-2">
                    <Label className="text-[11px] uppercase font-bold text-[#526580] tracking-wider">
                      Remarks / Justification
                    </Label>
                    {selectedRequest.remarks?.includes("[Note to Procurement:") ? (
                      <div className="space-y-3">
                        <div className="p-4 rounded-2xl bg-[#FFFBEB] border border-amber-300 text-amber-950 flex items-start gap-3 shadow-2xs">
                          <AlertCircle className="size-5 text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-amber-800">
                              Vendor Sourcing Action Required
                            </p>
                            <p className="text-xs font-semibold mt-1 leading-relaxed text-amber-900">
                              {selectedRequest.remarks.match(/\[Note to Procurement:[^\]]+\]/)?.[0] || selectedRequest.remarks}
                            </p>
                          </div>
                        </div>
                        {selectedRequest.remarks.replace(/\[Note to Procurement:[^\]]+\]/, "").trim() && (
                          <p className="text-sm bg-[#F5F8FF] p-4 rounded-2xl italic text-[#526580] border border-[#DCE6F3] leading-relaxed">
                            {selectedRequest.remarks.replace(/\[Note to Procurement:[^\]]+\]/, "").trim()}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm bg-[#F5F8FF] p-4 rounded-2xl italic text-[#526580] border border-[#DCE6F3] leading-relaxed">
                        {selectedRequest.remarks || "No remarks provided."}
                      </p>
                    )}
                  </div>

                  {/* Approval Timeline */}
                  <div className="space-y-3">
                    <Label className="text-[11px] uppercase font-bold text-[#526580] tracking-wider">
                      Approval &amp; Workflow History
                    </Label>
                    <div className="rounded-2xl border border-[#DCE6F3] bg-[#F5F8FF] p-4">
                      {selectedRequest.approvalHistory?.length ? (
                        <div className="space-y-3">
                          {selectedRequest.approvalHistory.map((entry: any, idx: number) => (
                            <div key={idx} className="flex items-start justify-between gap-4 text-xs">
                              <div>
                                <p className="font-bold text-[#101D3A]">{entry.status}</p>
                                <p className="text-[11px] text-[#526580] mt-0.5">
                                  {entry.actor || "System"} {entry.comments ? `— ${entry.comments}` : ""}
                                </p>
                              </div>
                              <span className="text-[11px] font-semibold text-[#8FA3BF] tabular-nums">
                                {entry.timestamp ? formatDisplayDate(entry.timestamp) : ""}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-[#526580]">No approval history recorded.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="p-4 sm:p-5 bg-white border-t border-[#DCE6F3] flex items-center justify-between">
                  <Button
                    variant="ghost"
                    className="rounded-xl h-10 px-5 font-bold text-xs text-[#526580] hover:text-[#101D3A] hover:bg-[#F5F8FF]"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Close
                  </Button>
                  <div className="flex items-center gap-3">
                    {selectedRequest.status === "Approved" && hasMatchingSuppliers(selectedRequest) && (
                      <Button
                        className="rounded-xl h-10 px-6 font-bold text-xs bg-[#0866FF] hover:bg-[#0054D6] text-white shadow-xs"
                        asChild
                      >
                        <Link to="/procurement/new-rfq" search={{ fromRequestId: selectedRequest.id }}>
                          <ArrowRight className="mr-2 size-4" /> Create RFQ from Request
                        </Link>
                      </Button>
                    )}
                    {selectedRequest.status === "Approved" && supplierAvailability[selectedRequest.id] === false && (
                      <span className="flex h-10 items-center rounded-xl border border-amber-300 bg-[#FFFBEB] px-3.5 text-xs font-bold text-[#B45309]">
                        <AlertCircle className="mr-2 size-4 text-[#D97706]" /> No Active Supplier
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppShell>
  );
}
