import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import jsQR from "jsqr";
import QRCode from "qrcode";
import {
  ArrowRight,
  Boxes,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Eye,
  FileUp,
  Filter,
  Grid3X3,
  HelpCircle,
  Info,
  Layers,
  LayoutList,
  Loader2,
  MapPin,
  Package,
  PackageCheck,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Truck,
  Upload,
  UserCheck,
  Warehouse,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell, StatusBadge } from "@/components/wms/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api-client";
import { getUserInfo } from "@/lib/auth-utils";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/putaway-tasks")({
  head: () => ({
    meta: [
      { title: "Putaway Execution & Tracking · Warehub 360 degree" },
      {
        name: "description",
        content:
          "QR-driven warehouse Putaway execution and live task monitoring. Scan GRN material QR and destination Bin QR to execute full and partial putaways seamlessly.",
      },
    ],
  }),
  component: WarehousePutawayTasksPage,
});

type Task = {
  id: string;
  task_number: string;
  grn_id: string;
  grn_number: string;
  handling_unit_id?: string;
  batch_number?: string;
  item_code: string;
  material_name: string;
  material_qr?: string;
  barcode_value?: string;
  quantity: number;
  putaway_quantity?: number;
  uom: string;
  warehouse_id: string;
  source_location: string;
  gate_entry_number?: string;
  gate_entry_id?: string;
  truck_number?: string;
  vehicle_number?: string;
  asn_number?: string;
  po_number?: string;
  assigned_dock?: string;
  assigned_dock_code?: string;
  assigned_store_manager?: string;
  assigned_store_manager_name?: string;
  assigned_store_manager_username?: string;
  assigned_store_manager_id?: string;
  assigned_store_id?: string;
  assigned_store_code?: string;
  assigned_store_name?: string;
  destination_store_id?: string;
  destination_zone_id?: string;
  destination_zone?: string;
  destination_rack?: string;
  destination_bin?: string;
  destination_bin_code?: string;
  destination_location_id?: string;
  location_assigned_by?: string;
  location_assigned_at?: string;
  assigned_to?: string;
  assigned_by?: string;
  assigned_at?: string;
  started_by?: string;
  started_at?: string;
  completed_by?: string;
  completed_at?: string;
  status: string;
  created_by: string;
  created_at: string;
};

type Store = {
  id: string;
  store_code: string;
  store_name: string;
  warehouse_id: string;
  status: string;
};

type GrnResolvedData = {
  valid: boolean;
  material_code: string;
  material_name: string;
  material_description: string;
  material_variant: string;
  material_category: string;
  grn_number: string;
  grn_id: string;
  po_number: string;
  asn_number: string;
  batch_lot_number: string;
  received_quantity: number;
  already_put_away_quantity: number;
  available_quantity: number;
  uom: string;
  supplier_name: string;
  warehouse_id: string;
  store_id?: string;
  store_name?: string;
  store_code?: string;
  gate_entry_number?: string;
  truck_number?: string;
  dock_code?: string;
  assigned_store_manager?: string;
  material_status?: string;
  current_location?: string;
  putaway_task_id?: string;
  handling_unit_id?: string;
  qr_code: string;
};

type BinResolvedData = {
  valid: boolean;
  bin_id: string;
  bin_code: string;
  bin_name: string;
  zone_id?: string;
  zone_code?: string;
  zone_name?: string;
  rack?: string;
  shelf?: string;
  store_id?: string;
  store_code?: string;
  store_name?: string;
  warehouse_id?: string;
  capacity: number;
  occupied_quantity: number;
  available_capacity: number;
  occupancy_percentage: number;
  status: string;
};

type StorageLocation = {
  id: string;
  location_code: string;
  warehouse_id: string;
  store_id?: string;
  zone_id?: string;
  bin_id?: string;
  zone: string;
  rack: string;
  bin: string;
  capacity: number;
  occupied_quantity: number;
  available_capacity: number;
  utilization_percent: number;
  active: boolean;
};

function normalizeMaterialQrForLookup(rawValue: string): string {
  const value = rawValue.trim();
  if (!value || value.startsWith("{")) return value;

  const fieldNames =
    "QR Code|PO Number|GRN Number|Material Code|Item Code|Material Name|Batch Number|Batch|Size|Color|Warehouse|Grade|UOM|QA Status|Inspection Status|Batch Quantity";
  const extract = (...labels: string[]) => {
    const labelPattern = labels.map((label) => label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    return value.match(
      new RegExp(
        `(?:^|[\\s|])(?:${labelPattern})\\s*:\\s*(.*?)(?=(?:\\s|\\|)+(?:${fieldNames})\\s*:|$)`,
        "i",
      ),
    )?.[1]?.trim();
  };

  return extract("Batch Number", "Batch") || extract("Material Code", "Item Code") || value;
}

// Reusable QR / Barcode Scanner component with Camera, File Upload, and Direct Input
function QrScanWidget({
  title,
  placeholder,
  onResolvedCode,
  isResolving,
}: {
  title: string;
  placeholder: string;
  onResolvedCode: (code: string) => void;
  isResolving: boolean;
}) {
  const [scanMode, setScanMode] = useState<"camera" | "upload" | "manual">("camera");
  const [manualCode, setManualCode] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameIdRef = useRef<number | null>(null);

  const stopCamera = useCallback(() => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animFrameIdRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (code && code.data && code.data.trim()) {
        const foundCode = code.data.trim();
        stopCamera();
        onResolvedCode(foundCode);
        return;
      }
    }

    animFrameIdRef.current = requestAnimationFrame(scanFrame);
  }, [onResolvedCode, stopCamera]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported in this browser environment.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        animFrameIdRef.current = requestAnimationFrame(scanFrame);
      }
    } catch (err) {
      setCameraError(err instanceof Error ? err.message : "Unable to access device camera.");
      setCameraActive(false);
    }
  }, [scanFrame]);

  useEffect(() => {
    if (scanMode === "camera") {
      void startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [scanMode, startCamera, stopCamera]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            toast.success("QR Code detected from image!");
            onResolvedCode(code.data.trim());
          } else {
            toast.error(
              "No valid QR code found in uploaded image. Please try another image or use manual entry.",
            );
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-3 rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <QrCode className="size-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">{title}</h4>
            <p className="text-[11px] text-muted-foreground">
              Scan with camera, upload image, or paste QR
            </p>
          </div>
        </div>

        {/* Mode Switcher */}
        <div className="flex rounded-lg border bg-muted/30 p-0.5 text-xs font-medium">
          <button
            type="button"
            onClick={() => setScanMode("camera")}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-md transition-all",
              scanMode === "camera"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Camera className="size-3" /> Camera
          </button>
          <button
            type="button"
            onClick={() => setScanMode("upload")}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-md transition-all",
              scanMode === "upload"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Upload className="size-3" /> Upload
          </button>
          <button
            type="button"
            onClick={() => setScanMode("manual")}
            className={cn(
              "flex items-center gap-1 px-2.5 py-1 rounded-md transition-all",
              scanMode === "manual"
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <QrCode className="size-3" /> Text / Code
          </button>
        </div>
      </div>

      {/* Mode 1: Camera Video Scanner */}
      {scanMode === "camera" && (
        <div className="relative overflow-hidden rounded-xl border bg-black/90 aspect-video max-h-56 flex flex-col items-center justify-center">
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
          <canvas ref={canvasRef} className="hidden" />

          {/* Scanner Overlay Box */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="size-40 rounded-xl border-2 border-primary/80 border-dashed animate-pulse flex items-center justify-center bg-primary/5">
              <span className="text-[10px] text-white/80 bg-black/60 px-2 py-0.5 rounded font-mono">
                Align QR Code Here
              </span>
            </div>
          </div>

          {cameraError && (
            <div className="absolute inset-0 bg-background/95 p-4 flex flex-col items-center justify-center text-center space-y-2">
              <Camera className="size-8 text-amber-500" />
              <p className="text-xs font-semibold text-foreground">
                Camera Access Restricted or Unavailable
              </p>
              <p className="text-[11px] text-muted-foreground max-w-xs">{cameraError}</p>
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7 rounded-lg"
                onClick={() => setScanMode("upload")}
              >
                <Upload className="size-3 mr-1" /> Use Upload or Manual Entry
              </Button>
            </div>
          )}

          {isResolving && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center gap-2">
              <Loader2 className="size-5 animate-spin text-primary" />
              <span className="text-xs font-semibold text-foreground">Resolving QR Code...</span>
            </div>
          )}
        </div>
      )}

      {/* Mode 2: File / Image Upload */}
      {scanMode === "upload" && (
        <div className="rounded-xl border border-dashed p-6 text-center hover:bg-muted/10 transition-colors">
          <label className="cursor-pointer flex flex-col items-center space-y-2">
            <div className="size-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <FileUp className="size-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Click to upload QR code image</p>
              <p className="text-[10px] text-muted-foreground">
                Supports PNG, JPG, JPEG, WebP screenshots & photos
              </p>
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isResolving}
            />
          </label>
        </div>
      )}

      {/* Mode 3: Manual Text Input / Barcode Scanner */}
      {scanMode === "manual" && (
        <div className="flex gap-2">
          <Input
            placeholder={placeholder}
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && manualCode.trim()) {
                e.preventDefault();
                onResolvedCode(manualCode.trim());
              }
            }}
            className="text-xs h-9 rounded-xl font-mono"
            disabled={isResolving}
          />
          <Button
            type="button"
            size="sm"
            className="h-9 px-4 rounded-xl text-xs font-semibold shrink-0"
            onClick={() => manualCode.trim() && onResolvedCode(manualCode.trim())}
            disabled={!manualCode.trim() || isResolving}
          >
            {isResolving ? <Loader2 className="size-3.5 animate-spin" /> : "Verify QR"}
          </Button>
        </div>
      )}
    </div>
  );
}

function CompactQrInput({
  label,
  placeholder,
  value,
  onValueChange,
  onScan,
  disabled = false,
  showInfo = false,
  onViewQr,
}: {
  label: string;
  placeholder: string;
  value: string;
  onValueChange: (value: string) => void;
  onScan: (value: string) => void;
  disabled?: boolean;
  showInfo?: boolean;
  onViewQr?: () => void;
}) {
  const decodeImage = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext("2d");
        if (!context) return;
        context.drawImage(image, 0, 0);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const result = jsQR(imageData.data, imageData.width, imageData.height);
        if (!result?.data) {
          toast.error("No QR code was detected in that image.");
          return;
        }
        const code = result.data.trim();
        onValueChange(code);
        onScan(code);
      };
      image.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-base font-black text-slate-900">{label}</label>
        {showInfo && <Info className="size-4 text-slate-700" />}
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <Input
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && value.trim()) {
              event.preventDefault();
              onScan(value.trim());
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="h-12 rounded-xl border-slate-300 bg-white px-4 text-base font-bold text-slate-900"
        />
        <label className={cn(
          "flex h-12 cursor-pointer items-center justify-center gap-3 rounded-xl border border-blue-300 bg-[#e6eef9] px-6 text-base font-extrabold text-slate-900",
          disabled && "pointer-events-none opacity-50",
        )}>
          <Camera className="size-5" /> Scan with Camera
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            disabled={disabled}
            onChange={(event) => {
              decodeImage(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className={cn(
          "inline-flex h-10 cursor-pointer items-center rounded-xl border border-blue-300 bg-white px-4 text-base font-bold text-slate-900",
          disabled && "pointer-events-none opacity-50",
        )}>
          Upload QR Image
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={disabled}
            onChange={(event) => {
              decodeImage(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
        </label>
        <div className="ml-auto flex items-center gap-3">
          {onViewQr && (
            <Button type="button" variant="outline" className="h-10 rounded-xl border-blue-300 bg-white px-4 text-base font-bold" onClick={onViewQr}>
              View QR
            </Button>
          )}
          <Button
            type="button"
            className="h-10 rounded-xl bg-[#0d568d] px-5 text-base font-extrabold text-white hover:bg-[#0a4776]"
            disabled={disabled || !value.trim()}
            onClick={() => onScan(value.trim())}
          >
            <CheckCircle2 className="size-4" /> Validate QR
          </Button>
        </div>
      </div>
    </div>
  );
}

function WarehousePutawayTasksPage() {
  const userInfo = getUserInfo();
  const userRoles = useMemo(() => (userInfo?.roles || []).map((r) => r.toUpperCase()), [userInfo]);
  const isStoreUser = userRoles.includes("STORE_MANAGER") || userRoles.includes("STORE_KEEPER");
  const isWarehouseManager =
    userRoles.includes("WAREHOUSE_MANAGER") || userRoles.includes("WAREHOUSE");
  const isTrackingOnly = isWarehouseManager && !isStoreUser;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState(() => {
    if (typeof window === "undefined") return "ALL";
    return new URLSearchParams(window.location.search).get("status") || "ALL";
  });
  const [storeFilter, setStoreFilter] = useState("ALL");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [selectedTaskDetails, setSelectedTaskDetails] = useState<Task | null>(null);
  const [selectedGrnTasks, setSelectedGrnTasks] = useState<Task[] | null>(null);
  const [executionTask, setExecutionTask] = useState<Task | null>(null);
  const [assignRackTasks, setAssignRackTasks] = useState<Task[] | null>(null);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState("");
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [assigningRack, setAssigningRack] = useState(false);

  // Putaway Execution Modal State
  const [isPutawayModalOpen, setIsPutawayModalOpen] = useState(false);
  const [putawayStep, setPutawayStep] = useState<1 | 2 | 3>(1);
  const [isResolvingGrn, setIsResolvingGrn] = useState(false);
  const [isResolvingBin, setIsResolvingBin] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  const [grnData, setGrnData] = useState<GrnResolvedData | null>(null);
  const [binData, setBinData] = useState<BinResolvedData | null>(null);
  const [putawayQuantity, setPutawayQuantity] = useState<string>("");
  const [materialScanValue, setMaterialScanValue] = useState("");
  const [binScanValue, setBinScanValue] = useState("");
  const [executionResult, setExecutionResult] = useState<any | null>(null);
  const [selectedBinQr, setSelectedBinQr] = useState<{
    binCode: string;
    dataUrl: string;
  } | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const [nextTasks, storeHierarchy] = await Promise.all([
        api.getPutawayTasks(),
        api.getStoreHierarchy().catch(() => []),
      ]);
      setTasks(nextTasks);
      setStores(storeHierarchy);
    } catch (error) {
      toast.error("Unable to load putaway tasks", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label}`, { description: text });
  };

  const getStoreName = (storeId?: string): string | null => {
    if (!storeId) return null;
    const store = stores.find((s) => s.id === storeId);
    return store ? `${store.store_name} (${store.store_code})` : storeId;
  };

  const handleOpenPutawayForTask = (task: Task) => {
    if (isTrackingOnly) {
      toast.info(
        "Warehouse Managers track putaway tasks. Physical putaway is performed by assigned Store Managers.",
      );
      return;
    }
    setExecutionTask(task);
    setSelectedGrnTasks(null);
    setIsPutawayModalOpen(true);
    setPutawayStep(1);
    setGrnData(null);
    setBinData(null);
    setPutawayQuantity(
      String(Math.max(0, Number(task.quantity || 0) - Number(task.putaway_quantity || 0))),
    );
    const materialQr =
      task.material_qr || task.barcode_value || task.batch_number || task.item_code;
    setMaterialScanValue(materialQr || "");
    setBinScanValue("");
    setExecutionResult(null);
    if (materialQr) {
      void handleResolveGrnQr(materialQr);
    } else {
      toast.error("This task has no material QR, batch number, or material code to validate.");
    }
  };

  const handleOpenPutawayModal = () => {
    if (isTrackingOnly) {
      toast.info(
        "Warehouse Managers track putaway tasks. Physical putaway is performed by assigned Store Managers.",
      );
      return;
    }
    setIsPutawayModalOpen(true);
    setExecutionTask(null);
    setPutawayStep(1);
    setGrnData(null);
    setBinData(null);
    setPutawayQuantity("");
    setMaterialScanValue("");
    setBinScanValue("");
    setExecutionResult(null);
  };

  const handleResolveGrnQr = async (qrCode: string) => {
    setIsResolvingGrn(true);
    try {
      const lookupCode = normalizeMaterialQrForLookup(qrCode);
      const res = await api.resolveGrnQr(lookupCode);
      if (res && res.valid) {
        setMaterialScanValue(qrCode);
        setGrnData(res);
        setPutawayQuantity(String(res.available_quantity));
        setPutawayStep(2);
        toast.success(`GRN Material Identified: ${res.material_name} (${res.material_code})`, {
          description: `GRN: ${res.grn_number} · Available: ${res.available_quantity} ${res.uom}`,
        });
      } else {
        throw new Error("Invalid response received from QR resolution");
      }
    } catch (err: any) {
      toast.error("GRN Material QR Validation Failed", {
        description:
          err?.message || "Could not find a valid GRN material corresponding to this QR code.",
      });
    } finally {
      setIsResolvingGrn(false);
    }
  };

  const handleResolveBinQr = async (binScan: string) => {
    setIsResolvingBin(true);
    try {
      const res = await api.resolveBinQr(binScan, grnData?.store_id);
      if (res && res.valid) {
        setBinScanValue(binScan);
        setBinData(res);
        setPutawayStep(3);
        toast.success(`Destination Bin Identified: ${res.bin_code}`, {
          description: `Zone: ${res.zone_code} · Available Capacity: ${res.available_capacity}`,
        });
      } else {
        throw new Error("Invalid response received from Bin resolution");
      }
    } catch (err: any) {
      toast.error("Destination Bin QR Validation Failed", {
        description:
          err?.message ||
          "Could not resolve destination Bin. Ensure it is active and belongs to the correct store.",
      });
    } finally {
      setIsResolvingBin(false);
    }
  };

  const handleViewAssignedBinQr = async () => {
    const binCode =
      executionTask?.destination_bin_code ||
      executionTask?.destination_bin ||
      executionTask?.destination_rack;
    if (!binCode) {
      toast.info("No assigned BIN is recorded for this batch.");
      return;
    }
    try {
      const dataUrl = await QRCode.toDataURL(
        JSON.stringify({ type: "STORE_BIN", bin_code: binCode }),
        { width: 480, margin: 2, errorCorrectionLevel: "M" },
      );
      setSelectedBinQr({ binCode, dataUrl });
    } catch (error) {
      toast.error("Unable to generate the assigned BIN QR", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const handleConfirmPutaway = async () => {
    if (!grnData || !binData) {
      toast.error("Missing GRN Material QR or Bin QR details");
      return;
    }

    const qty = parseFloat(putawayQuantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Please enter a valid positive putaway quantity");
      return;
    }

    if (qty > grnData.available_quantity) {
      toast.error(
        `Quantity exceeds available putaway balance (${grnData.available_quantity} ${grnData.uom})`,
      );
      return;
    }

    if (qty > binData.available_capacity) {
      toast.error(
        `Target Bin '${binData.bin_code}' has insufficient capacity (Available: ${binData.available_capacity})`,
      );
      return;
    }

    setIsExecuting(true);
    try {
      const result = await api.executePutaway({
        task_id: grnData.putaway_task_id,
        grn_qr_code: grnData.qr_code,
        bin_qr_code: binData.bin_code,
        quantity: qty,
      });

      setExecutionResult(result);
      toast.success("Putaway Successfully Executed!", {
        description: `${qty} ${grnData.uom} stored in ${binData.bin_code} (Status: ${result.putaway_status})`,
      });
      void load();
    } catch (err: any) {
      toast.error("Putaway Execution Failed", {
        description: err?.message || "An unexpected error occurred while confirming putaway.",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Status filtering
      let matchesStatus = true;
      if (statusFilter !== "ALL") {
        const s = (task.status || "").toUpperCase();
        if (statusFilter === "PENDING") {
          matchesStatus = s === "OPEN" || s === "PENDING";
        } else if (statusFilter === "READY_FOR_PUTAWAY") {
          matchesStatus =
            s === "PUTAWAY_PENDING" || s === "ASSIGNED_TO_STORE" || s === "READY_FOR_PUTAWAY";
        } else if (statusFilter === "IN_PROGRESS") {
          matchesStatus = s === "PUTAWAY_IN_PROGRESS" || s === "IN_PROGRESS";
        } else if (statusFilter === "COMPLETED") {
          matchesStatus = s === "PUTAWAY_COMPLETED" || s === "COMPLETED";
        } else if (statusFilter === "FAILED_CANCELLED") {
          matchesStatus = s === "CANCELLED" || s === "FAILED";
        }
      }

      // Store filtering
      let matchesStore = true;
      if (storeFilter !== "ALL") {
        matchesStore =
          task.destination_store_id === storeFilter || task.assigned_store_id === storeFilter;
      }

      // Search query
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        task.task_number.toLowerCase().includes(q) ||
        (task.grn_number && task.grn_number.toLowerCase().includes(q)) ||
        (task.item_code && task.item_code.toLowerCase().includes(q)) ||
        (task.material_name && task.material_name.toLowerCase().includes(q)) ||
        (task.gate_entry_number && task.gate_entry_number.toLowerCase().includes(q)) ||
        (task.vehicle_number && task.vehicle_number.toLowerCase().includes(q)) ||
        (task.truck_number && task.truck_number.toLowerCase().includes(q)) ||
        (task.asn_number && task.asn_number.toLowerCase().includes(q)) ||
        (task.po_number && task.po_number.toLowerCase().includes(q)) ||
        (task.assigned_dock && task.assigned_dock.toLowerCase().includes(q)) ||
        (task.assigned_store_manager_name &&
          task.assigned_store_manager_name.toLowerCase().includes(q)) ||
        (task.assigned_store_manager_username &&
          task.assigned_store_manager_username.toLowerCase().includes(q)) ||
        (task.assigned_to && task.assigned_to.toLowerCase().includes(q)) ||
        (task.material_qr && task.material_qr.toLowerCase().includes(q));

      return matchesStatus && matchesStore && matchesSearch;
    });
  }, [tasks, search, statusFilter, storeFilter]);

  const groupedTasks = useMemo(() => {
    const groups = new Map<string, Task[]>();
    filteredTasks.forEach((task) => {
      const key = task.grn_number || task.task_number;
      groups.set(key, [...(groups.get(key) || []), task]);
    });
    return Array.from(groups.entries()).map(([grnNumber, groupTasks]) => {
      const remaining = groupTasks.reduce((sum, task) => {
        const completed = ["PUTAWAY_COMPLETED", "COMPLETED", "STORED"].includes(
          (task.status || "").toUpperCase(),
        );
        return (
          sum +
          (completed
            ? 0
            : Math.max(0, Number(task.quantity || 0) - Number(task.putaway_quantity || 0)))
        );
      }, 0);
      const completed = remaining === 0;
      const assignedRack = groupTasks.find(
        (task) => task.destination_bin_code || task.destination_bin || task.destination_rack,
      );
      return {
        grnNumber,
        tasks: groupTasks,
        materialNames: Array.from(new Set(groupTasks.map((task) => task.material_name))),
        remaining,
        uom: groupTasks[0]?.uom || "",
        completed,
        allAssigned: groupTasks.every(
          (task) =>
            ["PUTAWAY_COMPLETED", "COMPLETED", "STORED"].includes(
              (task.status || "").toUpperCase(),
            ) || Boolean(task.destination_location_id || task.destination_bin_code),
        ),
        assignedRack:
          assignedRack?.destination_bin_code ||
          assignedRack?.destination_bin ||
          assignedRack?.destination_rack ||
          "Not assigned",
      };
    });
  }, [filteredTasks]);

  const openAssignRack = async (groupTasks: Task[]) => {
    if (isTrackingOnly) {
      toast.info(
        "Warehouse users can track putaway tasks, but rack assignment and physical putaway are performed by Store Managers.",
      );
      return;
    }
    const unfinished = groupTasks.filter(
      (task) =>
        !["PUTAWAY_COMPLETED", "COMPLETED", "STORED"].includes(
          (task.status || "").toUpperCase(),
        ),
    );
    setAssignRackTasks(unfinished);
    setSelectedLocationId("");
    setLoadingLocations(true);
    try {
      const [locations, hierarchy] = await Promise.all([
        api.getStorageLocations(unfinished[0]?.warehouse_id).catch(() => []),
        api.getStoreHierarchy().catch(() => []),
      ]);
      const hierarchyRacks: StorageLocation[] = (hierarchy || []).flatMap((store: any) =>
        (store.zones || []).flatMap((zone: any) =>
          (zone.bins || [])
            .filter((bin: any) => ["ACTIVE", "AVAILABLE"].includes((bin.status || "ACTIVE").toUpperCase()))
            .map((bin: any) => ({
              id: bin.id,
              location_code: bin.bin_code,
              warehouse_id: store.warehouse_id || unfinished[0]?.warehouse_id,
              store_id: store.id,
              zone_id: zone.id,
              bin_id: bin.id,
              zone: zone.zone_code,
              rack: bin.rack || bin.bin_code,
              bin: bin.bin_code,
              capacity: Number(bin.capacity || 0),
              occupied_quantity: Number(bin.occupied_quantity || 0),
              available_capacity: Number(
                bin.available_capacity ?? Number(bin.capacity || 0) - Number(bin.occupied_quantity || 0),
              ),
              utilization_percent: Number(bin.occupancy_percentage || 0),
              active: true,
            })),
        ),
      );
      setStorageLocations(
        hierarchyRacks.length
          ? hierarchyRacks
          : (locations || []).filter((location: StorageLocation) => location.active),
      );
    } catch (error) {
      toast.error("Unable to load available racks", {
        description: error instanceof Error ? error.message : undefined,
      });
      setStorageLocations([]);
    } finally {
      setLoadingLocations(false);
    }
  };

  const handleAssignRack = async () => {
    if (isTrackingOnly) return;
    if (!assignRackTasks?.length || !selectedLocationId) return;
    setAssigningRack(true);
    try {
      const location = storageLocations.find((item) => item.id === selectedLocationId);
      if (!location) throw new Error("Selected rack is no longer available.");
      await Promise.all(
        assignRackTasks.map((task) =>
          location.bin_id
            ? api.assignPutawayLocation(
                task.id,
                undefined,
                location.store_id,
                location.zone_id,
                location.bin_id,
              )
            : api.assignPutawayLocation(task.id, location.id),
        ),
      );
      toast.success("Rack assigned successfully", {
        description: `${assignRackTasks.length} unfinished batch${assignRackTasks.length === 1 ? "" : "es"} updated.`,
      });
      setAssignRackTasks(null);
      await load();
    } catch (error) {
      toast.error("Unable to assign rack", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setAssigningRack(false);
    }
  };

  const metrics = useMemo(() => {
    const total = tasks.length;
    const pending = tasks.filter((t) => t.status === "OPEN" || t.status === "PENDING").length;
    const ready = tasks.filter(
      (t) =>
        t.status === "PUTAWAY_PENDING" ||
        t.status === "ASSIGNED_TO_STORE" ||
        t.status === "READY_FOR_PUTAWAY",
    ).length;
    const inProgress = tasks.filter(
      (t) => t.status === "PUTAWAY_IN_PROGRESS" || t.status === "IN_PROGRESS",
    ).length;
    const completed = tasks.filter(
      (t) => t.status === "PUTAWAY_COMPLETED" || t.status === "COMPLETED",
    ).length;
    const failedCancelled = tasks.filter(
      (t) => t.status === "CANCELLED" || t.status === "FAILED",
    ).length;
    return { total, pending, ready, inProgress, completed, failedCancelled };
  }, [tasks]);

  return (
    <AppShell
      title={
        isTrackingOnly
          ? "Putaway Tasks Tracking & Monitoring"
          : "Putaway Execution & Live Monitoring"
      }
      subtitle={
        isTrackingOnly
          ? "Live task monitoring and progress tracking across all stores and docks. Physical putaway is performed by assigned Store Managers."
          : "QR-Driven Putaway Execution: Scan GRN Material QR and Destination Bin QR to store received inventory."
      }
      actions={
        <div className="flex items-center gap-2">
          {/* Actionable Putaway execution button only for Store Managers */}
          {!isTrackingOnly && (
            <Button
              onClick={handleOpenPutawayModal}
              className="rounded-xl gap-1.5 shadow-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 text-xs h-9"
            >
              <QrCode className="size-4" /> Scan / Upload GRN Material QR
            </Button>
          )}

          <div className="flex items-center rounded-xl border bg-muted/30 matep-0.5">
            <button
              onClick={() => setViewMode("table")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                viewMode === "table"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <LayoutList className="size-3.5" /> Table
            </button>
            <button
              onClick={() => setViewMode("cards")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all",
                viewMode === "cards"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Grid3X3 className="size-3.5" /> Cards
            </button>
          </div>
          <Button variant="outline" className="rounded-xl text-xs h-9" onClick={() => void load()}>
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} /> Refresh
          </Button>
        </div>
      }
    >
      {/* KPI Metrics Banner */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Card className="rounded-xl p-3.5 shadow-sm border bg-card">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Boxes className="size-3.5 text-primary" /> Total Tasks
          </p>
          <p className="text-2xl font-black text-foreground mt-1">{metrics.total}</p>
        </Card>
        <Card className="rounded-xl p-3.5 shadow-sm border bg-amber-500/5 border-amber-500/20">
          <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="size-3.5" /> Ready for Putaway
          </p>
          <p className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1">
            {metrics.ready + metrics.pending}
          </p>
        </Card>
        <Card className="rounded-xl p-3.5 shadow-sm border bg-purple-500/5 border-purple-500/20">
          <p className="text-[11px] font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
            <Loader2 className="size-3.5 animate-spin" /> In Progress
          </p>
          <p className="text-2xl font-black text-purple-700 dark:text-purple-400 mt-1">
            {metrics.inProgress}
          </p>
        </Card>
        <Card className="rounded-xl p-3.5 shadow-sm border bg-emerald-500/5 border-emerald-500/20">
          <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5" /> Completed
          </p>
          <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
            {metrics.completed}
          </p>
        </Card>
      </div>
      {/* Search and Filters Bar */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by Task #, Gate Entry, Truck, ASN, PO, GRN, Material, Store Manager, Dock..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs rounded-xl h-9.5"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
              <Filter className="size-3.5" /> Status:
            </span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9.5 rounded-xl border bg-background px-3 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">All Statuses</option>
              <option value="READY_FOR_PUTAWAY">Ready for Putaway</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending</option>
              {metrics.failedCancelled > 0 && (
                <option value="FAILED_CANCELLED">Failed / Cancelled</option>
              )}
            </select>
          </div>

          {/* Store Filter */}
          {stores.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Warehouse className="size-3.5" /> Store:
              </span>
              <select
                value={storeFilter}
                onChange={(e) => setStoreFilter(e.target.value)}
                className="h-9.5 rounded-xl border bg-background px-3 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ALL">All Stores</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.store_name} ({s.store_code})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Main Task Content */}
      <Card className="overflow-hidden rounded-3xl border border-slate-300 bg-slate-50 shadow-sm">
        <div className="p-5 sm:p-6">
          <h2 className="mb-5 text-xl font-black uppercase tracking-wide text-slate-950">
            {isTrackingOnly
              ? "Putaway Tracking Queue"
              : "Putaway Work Queue (Assign Storage Locations & Confirm)"}
          </h2>

          {loading ? (
            <div className="grid h-48 place-items-center">
              <Loader2 className="size-7 animate-spin text-primary" />
            </div>
          ) : groupedTasks.length === 0 ? (
            <div className="grid h-48 place-items-center rounded-2xl border border-dashed text-sm font-semibold text-muted-foreground">
              No putaway tasks match the selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                <thead>
                  <tr className="bg-[#0d568d] text-white">
                    <th className="border border-blue-200 px-4 py-4 text-sm font-extrabold">GRN / TASK NO</th>
                    <th className="border border-blue-200 px-4 py-4 text-sm font-extrabold">MATERIAL</th>
                    <th className="border border-blue-200 px-4 py-4 text-sm font-extrabold">BATCH</th>
                    <th className="border border-blue-200 px-4 py-4 text-sm font-extrabold">REMAINING QTY</th>
                    <th className="border border-blue-200 px-4 py-4 text-sm font-extrabold">ASSIGNED RACK</th>
                    <th className="border border-blue-200 px-4 py-4 text-sm font-extrabold">
                      <span className="flex items-center gap-2">STATUS <Info className="size-4" /></span>
                    </th>
                    <th className="border border-blue-200 px-4 py-4 text-center text-sm font-extrabold">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedTasks.map((group) => (
                    <tr key={group.grnNumber} className="bg-[#eef5ff] text-slate-950">
                      <td className="border border-blue-200 px-4 py-4 font-black">{group.grnNumber}</td>
                      <td className="border border-blue-200 px-4 py-4 font-bold">
                        {group.materialNames.join(", ")}
                      </td>
                      <td className="border border-blue-200 px-4 py-4">
                        <Badge className="rounded-xl bg-slate-200 px-3 py-1.5 font-mono text-slate-950 hover:bg-slate-200">
                          {group.tasks.length} {group.tasks.length === 1 ? "batch" : "batches"}
                        </Badge>
                      </td>
                      <td className="border border-blue-200 px-4 py-4 font-black">
                        {group.remaining.toLocaleString()} {group.uom}
                      </td>
                      <td className="border border-blue-200 px-4 py-4">
                        <Badge variant="outline" className="rounded-full border-green-700 bg-green-50 px-3 py-1 font-mono font-bold text-green-950">
                          {group.assignedRack}
                        </Badge>
                      </td>
                      <td className="border border-blue-200 px-4 py-4">
                        <Badge className={cn(
                          "rounded-full px-3 py-1 font-extrabold",
                          group.completed
                            ? "bg-green-800 text-white hover:bg-green-800"
                            : "border border-amber-700 bg-amber-50 text-amber-900 hover:bg-amber-50",
                        )}>
                          {group.completed ? "COMPLETED" : "PENDING"}
                        </Badge>
                      </td>
                      <td className="border border-blue-200 px-4 py-3">
                        <div className="flex flex-col gap-2">
                          {!isTrackingOnly && !group.completed && (
                            <Button
                              variant="outline"
                              className="h-10 rounded-xl bg-slate-100 font-extrabold text-slate-950"
                              onClick={() =>
                                group.allAssigned
                                  ? setSelectedGrnTasks(group.tasks)
                                  : void openAssignRack(group.tasks)
                              }
                            >
                              {group.allAssigned ? "Scan QR" : "Assign Rack"}
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            className="h-10 rounded-xl bg-slate-100 font-extrabold text-slate-950"
                            onClick={() => setSelectedTaskDetails(group.tasks[0])}
                          >
                            View Details
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-4 text-base font-extrabold text-slate-950">
            Showing {groupedTasks.length} of {groupedTasks.length} tasks
          </p>
        </div>
      </Card>

      {false && (
      <>
      {loading ? (
        <div className="grid h-64 place-items-center">
          <Loader2 className="size-7 animate-spin text-primary" />
          <p className="text-xs text-muted-foreground mt-2 font-medium">Loading putaway tasks...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <Card className="grid h-64 place-items-center rounded-2xl text-sm text-muted-foreground border-dashed">
          <div className="text-center space-y-2">
            <Boxes className="mx-auto size-10 text-muted-foreground/50" />
            <p className="font-semibold text-foreground">No putaway tasks found</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              {search || statusFilter !== "ALL" || storeFilter !== "ALL"
                ? "Try adjusting your search query or filter options."
                : "Putaway tasks will appear here automatically once Gate Entry, Dock Allocation, and GRN are processed."}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenPutawayModal}
              className="rounded-xl text-xs mt-2"
            >
              <QrCode className="size-3.5 mr-1" /> Scan Any GRN Material QR Directly
            </Button>
          </div>
        </Card>
      ) : viewMode === "table" ? (
        /* TABLE VIEW */
        <Card className="rounded-2xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b bg-muted/40 font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4">Putaway Task ID</th>
                  <th className="py-3.5 px-4">Gate Entry / Truck</th>
                  <th className="py-3.5 px-4">ASN / PO / GRN</th>
                  <th className="py-3.5 px-4">Material & Qty</th>
                  <th className="py-3.5 px-4">Material QR</th>
                  <th className="py-3.5 px-4">Assigned Dock</th>
                  <th className="py-3.5 px-4">Assigned Store Manager</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTasks.map((task) => {
                  const assignedSm =
                    task.assigned_store_manager_name ||
                    task.assigned_store_manager_username ||
                    task.assigned_to;

                  const truckDisplay = task.truck_number || task.vehicle_number;
                  const gateEntryDisplay = task.gate_entry_number;
                  const dockDisplay =
                    task.assigned_dock || task.assigned_dock_code || task.source_location;
                  const qrDisplay = task.material_qr || task.barcode_value;

                  const isCompleted = (task.status || "").toUpperCase() === "PUTAWAY_COMPLETED";

                  return (
                    <tr
                      key={task.id}
                      className="hover:bg-muted/25 transition-colors cursor-pointer"
                      onClick={() => setSelectedTaskDetails(task)}
                    >
                      {/* Task ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-primary whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span>{task.task_number}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(task.task_number, "Task ID");
                            }}
                            className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded"
                            title="Copy Task ID"
                          >
                            <Copy className="size-3" />
                          </button>
                        </div>
                      </td>

                      {/* Gate Entry & Truck */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 text-foreground font-semibold">
                            <Truck className="size-3 text-blue-500" />
                            <span>{truckDisplay || "—"}</span>
                          </div>
                          <div className="text-[10px] font-mono text-muted-foreground">
                            {gateEntryDisplay || "—"}
                          </div>
                        </div>
                      </td>

                      {/* ASN / PO / GRN */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px]">
                        <div className="space-y-0.5">
                          <div className="font-bold text-foreground">
                            {task.is_finished_goods
                              ? "Assembly Finished Goods"
                              : task.grn_number || "—"}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {task.is_finished_goods
                              ? `Source: ${task.source_location || "—"}`
                              : `PO: ${task.po_number || "—"} · ASN: ${task.asn_number || "—"}`}
                          </div>
                        </div>
                      </td>

                      {/* Material & Qty */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5 min-w-[140px]">
                          <p className="font-bold text-foreground text-xs">{task.material_name}</p>
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <code className="text-[10px] px-1.5 py-0.2 bg-muted rounded font-mono">
                              {task.item_code}
                            </code>
                            <span className="font-bold text-primary">
                              {(task.putaway_quantity ?? task.quantity).toLocaleString()} {task.uom}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Material QR */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Badge
                          variant="secondary"
                          className="font-mono text-[11px] gap-1 px-2 py-0.5 bg-muted/60 hover:bg-muted font-normal cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(qrDisplay, "Material QR");
                          }}
                        >
                          <QrCode className="size-3 text-primary" />
                          <span className="truncate max-w-[110px]" title={qrDisplay}>
                            {qrDisplay || "QR not recorded"}
                          </span>
                        </Badge>
                      </td>

                      {/* Assigned Dock */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className="font-mono text-[11px] gap-1 bg-background"
                        >
                          <MapPin className="size-3 text-blue-500" />
                          {dockDisplay || "—"}
                        </Badge>
                      </td>

                      {/* Assigned Store Manager (READ-ONLY) */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                            {(assignedSm || "—").charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground text-xs">
                              {assignedSm || "—"}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {task.assigned_store_name ||
                                getStoreName(task.destination_store_id) ||
                                "—"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={task.status} />
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <div
                          className="flex items-center justify-end gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {!isTrackingOnly && !isCompleted && (
                            <Button
                              size="sm"
                              className="h-7 px-2.5 rounded-lg text-xs gap-1 font-bold bg-primary text-primary-foreground hover:bg-primary/90"
                              onClick={() => handleOpenPutawayForTask(task)}
                            >
                              <QrCode className="size-3" /> Put Away
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="size-7 p-0 rounded-lg"
                            onClick={() => setSelectedTaskDetails(task)}
                            title="View Full Task Details"
                          >
                            <Eye className="size-3.5 text-muted-foreground hover:text-foreground" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* CARDS VIEW */
        <div className="grid gap-4 lg:grid-cols-2">
          {filteredTasks.map((task) => {
            const assignedSm =
              task.assigned_store_manager_name ||
              task.assigned_store_manager_username ||
              task.assigned_to;
            const dockDisplay =
              task.assigned_dock || task.assigned_dock_code || task.source_location;
            const qrDisplay = task.material_qr || task.barcode_value;
            const truckDisplay = task.truck_number || task.vehicle_number;
            const isCompleted = (task.status || "").toUpperCase() === "PUTAWAY_COMPLETED";

            return (
              <Card
                key={task.id}
                className="rounded-2xl p-5 shadow-sm border hover:border-primary/40 transition-all cursor-pointer space-y-4"
                onClick={() => setSelectedTaskDetails(task)}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Putaway Task
                      </p>
                      <Badge variant="outline" className="font-mono text-[10px] py-0 px-1.5">
                        {dockDisplay || "—"}
                      </Badge>
                    </div>
                    <h2 className="font-mono text-base font-bold text-primary mt-0.5">
                      {task.task_number}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={task.status} />
                    {!isTrackingOnly && !isCompleted && (
                      <Button
                        size="sm"
                        className="h-7 px-2.5 rounded-lg text-xs gap-1 font-bold bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenPutawayForTask(task);
                        }}
                      >
                        <QrCode className="size-3" /> Put Away
                      </Button>
                    )}
                  </div>
                </div>

                {/* Material Info */}
                <div className="rounded-xl border bg-muted/20 p-3 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="font-bold text-foreground text-sm">{task.material_name}</p>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-muted-foreground">{task.item_code}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="font-mono text-primary font-semibold">
                        {task.is_finished_goods
                          ? "Assembly Finished Goods"
                          : `GRN: ${task.grn_number || "—"}`}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground uppercase font-semibold">
                      Qty Remaining
                    </span>
                    <p className="text-lg font-black text-primary font-mono">
                      {task.quantity.toLocaleString()} {task.uom}
                    </p>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg border p-2 space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
                      <Truck className="size-3 text-blue-500" /> Vehicle / Gate Entry
                    </p>
                    <p className="font-semibold text-foreground truncate">{truckDisplay || "—"}</p>
                    <p className="text-[10px] font-mono text-muted-foreground">
                      {task.gate_entry_number || "—"}
                    </p>
                  </div>
                  <div className="rounded-lg border p-2 space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
                      <UserCheck className="size-3 text-emerald-600" /> Store Manager
                    </p>
                    <p className="font-semibold text-foreground truncate">{assignedSm || "—"}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {task.assigned_store_name || getStoreName(task.destination_store_id) || "—"}
                    </p>
                  </div>
                </div>

                {/* Footer with Material QR */}
                <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <QrCode className="size-3.5 text-primary" />
                    <code className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded text-foreground truncate max-w-[180px]">
                      {qrDisplay || "QR not recorded"}
                    </code>
                  </div>
                  <span className="text-[10px]">
                    Created: {new Date(task.created_at).toLocaleDateString()}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      </>
      )}

      <Dialog open={!isTrackingOnly && !!assignRackTasks} onOpenChange={(open) => !open && !assigningRack && setAssignRackTasks(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto rounded-3xl border-slate-300 bg-slate-50 p-7">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900">Assign Rack</DialogTitle>
            <DialogDescription className="text-base font-bold text-slate-800">
              Select an available storage rack for all unfinished batches in {assignRackTasks?.[0]?.grn_number}.
            </DialogDescription>
          </DialogHeader>

          {(() => {
            const required = (assignRackTasks || []).reduce(
              (sum, task) =>
                sum +
                Math.max(0, Number(task.quantity || 0) - Number(task.putaway_quantity || 0)),
              0,
            );
            const eligibleLocations = storageLocations.filter(
              (location) => Number(location.available_capacity || 0) >= required,
            );
            return (
              <div className="space-y-5 pt-2">
                <div className="grid grid-cols-2 gap-4 rounded-2xl bg-[#e7f0fb] p-5 md:grid-cols-3">
                  <div>
                    <p className="text-sm font-bold text-slate-700">GRN Number</p>
                    <p className="font-mono text-base font-black text-slate-950">{assignRackTasks?.[0]?.grn_number}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">Unfinished Batches</p>
                    <p className="text-base font-black text-slate-950">{assignRackTasks?.length || 0}</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">Required Capacity</p>
                    <p className="text-base font-black text-slate-950">{required.toLocaleString()} {assignRackTasks?.[0]?.uom}</p>
                  </div>
                </div>

                {loadingLocations ? (
                  <div className="grid h-40 place-items-center">
                    <Loader2 className="size-7 animate-spin text-[#0d568d]" />
                  </div>
                ) : eligibleLocations.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center font-semibold text-slate-600">
                    No active rack has enough available capacity for this GRN.
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {eligibleLocations.map((location) => {
                      const selected = selectedLocationId === location.id;
                      return (
                        <button
                          type="button"
                          key={location.id}
                          onClick={() => setSelectedLocationId(location.id)}
                          className={cn(
                            "rounded-2xl border-2 p-4 text-left transition-colors",
                            selected
                              ? "border-[#0d568d] bg-blue-50 shadow-sm"
                              : "border-slate-200 bg-white hover:border-blue-300",
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-mono text-base font-black text-slate-950">{location.rack || location.bin}</p>
                              <p className="mt-1 font-mono text-sm font-semibold text-slate-600">{location.zone} / {location.bin}</p>
                            </div>
                            {selected && <CheckCircle2 className="size-5 text-[#0d568d]" />}
                          </div>
                          <div className="mt-4 flex justify-between text-sm font-bold text-slate-700">
                            <span>Available Capacity</span>
                            <span>{Number(location.available_capacity).toLocaleString()}</span>
                          </div>
                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-[#0876bd]"
                              style={{ width: `${Math.min(100, Number(location.utilization_percent || 0))}%` }}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" className="h-11 rounded-xl px-6 font-bold" onClick={() => setAssignRackTasks(null)} disabled={assigningRack}>
                    Cancel
                  </Button>
                  <Button className="h-11 rounded-xl bg-[#0d568d] px-6 font-extrabold hover:bg-[#0a4776]" onClick={() => void handleAssignRack()} disabled={!selectedLocationId || assigningRack}>
                    {assigningRack && <Loader2 className="size-4 animate-spin" />}
                    Assign Rack
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={!isTrackingOnly && !!selectedGrnTasks} onOpenChange={(open) => !open && setSelectedGrnTasks(null)}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto rounded-3xl border-slate-300 bg-slate-50 p-7">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-slate-900">
              Scan QR / Select Assigned Batch
            </DialogTitle>
            <DialogDescription className="text-base font-bold text-slate-800">
              {selectedGrnTasks?.[0]?.grn_number}
            </DialogDescription>
          </DialogHeader>

          {selectedGrnTasks && (() => {
            const unfinished = selectedGrnTasks.filter(
              (task) => !["PUTAWAY_COMPLETED", "COMPLETED", "STORED"].includes((task.status || "").toUpperCase()),
            );
            const remaining = unfinished.reduce(
              (sum, task) =>
                sum +
                Math.max(0, Number(task.quantity || 0) - Number(task.putaway_quantity || 0)),
              0,
            );
            return (
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-4 rounded-2xl border border-slate-300 bg-slate-50 p-5 md:grid-cols-4">
                  <div><p className="font-bold">GRN Number</p><p className="font-mono text-base">{selectedGrnTasks[0].grn_number}</p></div>
                  <div><p className="font-bold">Materials</p><p className="text-base font-black">{new Set(selectedGrnTasks.map((task) => task.item_code)).size}</p></div>
                  <div><p className="font-bold">Batches</p><p className="text-base font-black">{unfinished.length}</p></div>
                  <div><p className="font-bold">Remaining to Put Away</p><p className="text-base font-black">{remaining.toLocaleString()} {selectedGrnTasks[0].uom}</p></div>
                </div>

                <p className="text-base font-bold text-slate-900">
                  Only assigned, unfinished batches are shown. Select a batch to scan its material and rack QR and confirm putaway.
                </p>

                <div className="overflow-hidden rounded-2xl border border-blue-200">
                  <table className="w-full border-collapse text-left">
                    <thead className="bg-[#0d568d] text-white">
                      <tr>
                        <th className="border-r border-blue-200 px-5 py-4 font-extrabold">Material / Batch</th>
                        <th className="border-r border-blue-200 px-5 py-4 font-extrabold">Remaining to Put Away</th>
                        <th className="border-r border-blue-200 px-5 py-4 font-extrabold">Assigned Rack</th>
                        <th className="px-5 py-4 text-right font-extrabold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unfinished.map((task) => (
                        <tr key={task.id} className="bg-[#eef5ff] text-slate-950">
                          <td className="border-r border-t border-blue-200 px-5 py-4">
                            <p className="font-black">{task.material_name}</p>
                            <p className="mt-2 font-mono font-bold">{task.batch_number || task.handling_unit_id || task.task_number}</p>
                          </td>
                          <td className="border-r border-t border-blue-200 px-5 py-4 font-black">
                            {Math.max(0, Number(task.quantity || 0) - Number(task.putaway_quantity || 0)).toLocaleString()} {task.uom}
                          </td>
                          <td className="border-r border-t border-blue-200 px-5 py-4">
                            <Badge variant="outline" className="rounded-full px-3 py-1 font-mono font-bold">
                              {task.destination_bin_code || task.destination_bin || task.destination_rack || "Not assigned"}
                            </Badge>
                          </td>
                          <td className="border-t border-blue-200 px-5 py-4 text-right">
                            <Button variant="outline" className="min-w-32 rounded-xl bg-slate-100 font-extrabold" onClick={() => handleOpenPutawayForTask(task)}>
                              Scan QR
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedBinQr} onOpenChange={(open) => !open && setSelectedBinQr(null)}>
        <DialogContent className="max-w-lg rounded-3xl border-slate-300 bg-slate-50 p-7">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl font-black text-slate-900">
              <QrCode className="size-6 text-[#0d568d]" /> Assigned BIN QR
            </DialogTitle>
            <DialogDescription className="text-base font-bold text-slate-700">
              Scan this QR to select BIN {selectedBinQr?.binCode} for the current putaway task.
            </DialogDescription>
          </DialogHeader>

          {selectedBinQr && (
            <div className="space-y-5 pt-2">
              <div className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm">
                <img
                  src={selectedBinQr.dataUrl}
                  alt={`QR code for BIN ${selectedBinQr.binCode}`}
                  className="mx-auto aspect-square w-full max-w-[360px] object-contain"
                />
                <p className="mt-3 text-center font-mono text-lg font-black text-slate-950">
                  {selectedBinQr.binCode}
                </p>
              </div>

              <Button
                type="button"
                className="h-12 w-full rounded-xl bg-[#0d568d] text-base font-extrabold text-white hover:bg-[#0a4776]"
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = selectedBinQr.dataUrl;
                  link.download = `BIN-${selectedBinQr.binCode.replace(/[^a-z0-9._-]+/gi, "-")}-QR.png`;
                  document.body.appendChild(link);
                  link.click();
                  window.setTimeout(() => link.remove(), 1000);
                }}
              >
                <Download className="size-5" /> Download BIN QR
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 3-STEP QR PUTAWAY EXECUTION MODAL (PRIMARY REQUIREMENT)                  */}
      {/* ========================================================================= */}
      <Dialog
        open={!isTrackingOnly && isPutawayModalOpen}
        onOpenChange={(open) => !isExecuting && setIsPutawayModalOpen(open)}
      >
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl border-slate-300 bg-slate-50 p-7">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  <QrCode className="size-5" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-black text-slate-900">Scan Material &amp; BIN</DialogTitle>
                  <DialogDescription className="text-base font-bold text-slate-900">
                    Scan the existing material QR first, then scan the assigned BIN QR.
                  </DialogDescription>
                </div>
              </div>
            </div>
          </DialogHeader>

          {executionTask && (
            <div className="grid grid-cols-2 gap-4 rounded-2xl bg-[#e7f0fb] p-5 text-slate-950">
              <div className="col-span-2 text-lg font-black">{executionTask.material_name}</div>
              <div>
                <p className="font-bold">GRN</p>
                <p className="font-mono text-base font-black">{executionTask.grn_number}</p>
              </div>
              <div>
                <p className="font-bold">Pending quantity</p>
                <p className="text-base font-black">
                  {Math.max(0, Number(executionTask.quantity || 0) - Number(executionTask.putaway_quantity || 0)).toLocaleString()} {executionTask.uom}
                </p>
              </div>
              <div className="col-span-2">
                <p className="font-bold">Batch</p>
                <p className="font-mono text-base font-black">
                  {executionTask.batch_number || executionTask.handling_unit_id || executionTask.task_number}
                </p>
              </div>
            </div>
          )}

          {/* Internal progress state; hidden to match the streamlined scanner reference. */}
          <div className="hidden grid-cols-3 gap-2 border-y py-3">
            <div
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                putawayStep === 1
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : grnData
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "bg-muted/40 text-muted-foreground",
              )}
              onClick={() => !isExecuting && setPutawayStep(1)}
            >
              <span className="size-5 rounded-full border border-current flex items-center justify-center text-[10px] font-bold shrink-0">
                {grnData ? "✓" : "1"}
              </span>
              <span className="truncate">1. GRN Material QR</span>
            </div>

            <div
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                putawayStep === 2
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : binData
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "bg-muted/40 text-muted-foreground",
                !grnData && "opacity-50 pointer-events-none",
              )}
              onClick={() => grnData && !isExecuting && setPutawayStep(2)}
            >
              <span className="size-5 rounded-full border border-current flex items-center justify-center text-[10px] font-bold shrink-0">
                {binData ? "✓" : "2"}
              </span>
              <span className="truncate">2. Destination Bin QR</span>
            </div>

            <div
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                putawayStep === 3
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : executionResult
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "bg-muted/40 text-muted-foreground",
                (!grnData || !binData) && "opacity-50 pointer-events-none",
              )}
              onClick={() => grnData && binData && !isExecuting && setPutawayStep(3)}
            >
              <span className="size-5 rounded-full border border-current flex items-center justify-center text-[10px] font-bold shrink-0">
                {executionResult ? "✓" : "3"}
              </span>
              <span className="truncate">3. Confirm Quantity</span>
            </div>
          </div>

          {/* SUCCESS BANNER WHEN COMPLETED */}
          {executionResult ? (
            <div className="space-y-5 py-6 text-center">
              <CheckCircle2 className="mx-auto size-14 text-emerald-600" />
              <div>
                <h3 className="text-xl font-black text-slate-900">Putaway Confirmed</h3>
                <p className="mt-1 text-base text-slate-600">{executionResult.message}</p>
              </div>
              <Button className="h-11 rounded-xl px-6 font-extrabold" onClick={() => setIsPutawayModalOpen(false)}>
                Close
              </Button>
            </div>
          ) : (
            <div className="space-y-7 py-3">
              <CompactQrInput
                label="Material QR"
                placeholder="Scan material QR"
                value={materialScanValue}
                onValueChange={setMaterialScanValue}
                onScan={(value) => void handleResolveGrnQr(value)}
                disabled={isResolvingGrn || isExecuting}
                showInfo
              />

              <CompactQrInput
                label="BIN QR"
                placeholder="Scan BIN QR"
                value={binScanValue}
                onValueChange={setBinScanValue}
                onScan={(value) => void handleResolveBinQr(value)}
                disabled={!grnData || isResolvingBin || isExecuting}
                onViewQr={() => void handleViewAssignedBinQr()}
              />
              {!grnData && (
                <p className="-mt-5 text-sm font-semibold text-amber-700">
                  {isResolvingGrn
                    ? "Validating the material QR before enabling BIN scanning…"
                    : "Validate the Material QR first to enable BIN camera and image upload."}
                </p>
              )}

              <div className="space-y-2">
                <label className="text-base font-black text-slate-900">
                  Stored quantity ({grnData?.uom || executionTask?.uom || "PCS"})
                </label>
                <Input
                  type="number"
                  min="0.0001"
                  step="any"
                  value={putawayQuantity}
                  onChange={(event) => setPutawayQuantity(event.target.value)}
                  disabled={!grnData || isExecuting}
                  className="h-12 rounded-xl border-slate-300 bg-white px-4 text-base font-bold"
                />
                <p className="text-base font-bold text-slate-900">
                  Rack space available: {binData ? Number(binData.available_capacity).toLocaleString() : "—"} {grnData?.uom || executionTask?.uom || "PCS"}.
                </p>
              </div>

              <div className="flex justify-end gap-4 border-t border-slate-200 pt-5">
                <Button type="button" variant="outline" className="h-11 rounded-xl bg-[#e6eef9] px-6 text-base font-extrabold" onClick={() => setIsPutawayModalOpen(false)} disabled={isExecuting}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="h-11 rounded-xl border-2 border-slate-700 bg-[#1683c5] px-6 text-base font-extrabold text-white hover:bg-[#0d6fa9]"
                  onClick={() => void handleConfirmPutaway()}
                  disabled={!grnData || !binData || !putawayQuantity || Number(putawayQuantity) <= 0 || isExecuting}
                >
                  {isExecuting && <Loader2 className="size-4 animate-spin" />}
                  Confirm Putaway
                </Button>
              </div>
            </div>
          )}

          {false && (
          <>
          {executionResult ? (
            <div className="space-y-4 py-4 text-center">
              <div className="mx-auto size-14 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="size-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-foreground">
                  Putaway Transaction Confirmed
                </h3>
                <p className="text-xs text-muted-foreground">{executionResult.message}</p>
              </div>

              <div className="rounded-2xl border bg-muted/20 p-4 max-w-md mx-auto grid grid-cols-2 gap-3 text-xs text-left">
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-bold">
                    Material
                  </span>
                  <p className="font-bold text-foreground">
                    {executionResult.material_name} ({executionResult.material_code})
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-bold">
                    Destination Bin
                  </span>
                  <p className="font-bold font-mono text-primary">{executionResult.bin_code}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-bold">
                    Putaway Quantity
                  </span>
                  <p className="font-bold text-foreground">
                    {executionResult.putaway_quantity} {grnData?.uom}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[10px] uppercase font-bold">
                    Remaining Available
                  </span>
                  <p className="font-bold text-foreground">
                    {executionResult.remaining_available_quantity} {grnData?.uom}
                  </p>
                </div>
                <div className="col-span-2 pt-2 border-t flex items-center justify-between">
                  <span className="text-muted-foreground font-semibold">Putaway Status:</span>
                  <Badge
                    variant={
                      executionResult.putaway_status === "COMPLETED" ? "default" : "secondary"
                    }
                    className="font-bold"
                  >
                    {executionResult.putaway_status}
                  </Badge>
                </div>
              </div>

              <div className="flex justify-center gap-2 pt-2">
                <Button
                  variant="outline"
                  className="rounded-xl text-xs"
                  onClick={() => {
                    setExecutionResult(null);
                    setGrnData(null);
                    setBinData(null);
                    setPutawayStep(1);
                  }}
                >
                  <QrCode className="size-3.5 mr-1" /> Put Away Another QR
                </Button>
                <Button
                  className="rounded-xl text-xs font-bold"
                  onClick={() => setIsPutawayModalOpen(false)}
                >
                  Close & Done
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {/* STEP 1: SCAN / UPLOAD GRN MATERIAL QR */}
              {putawayStep === 1 && (
                <div className="space-y-4">
                  <QrScanWidget
                    title="Scan / Upload GRN Material QR Code"
                    placeholder="e.g. QR-MAT-RAW-001, HU-2026-0001, or paste full QR payload"
                    onResolvedCode={(code) => void handleResolveGrnQr(code)}
                    isResolving={isResolvingGrn}
                  />

                  {/* If GRN already resolved, show full Read-Only details */}
                  {grnData && (
                    <div className="rounded-2xl border bg-emerald-500/5 border-emerald-500/25 p-4 space-y-3">
                      <div className="flex items-center justify-between border-b pb-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="size-4 text-emerald-600" />
                          <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                            GRN Material Identified (Read-Only)
                          </span>
                        </div>
                        <Badge variant="outline" className="font-mono text-[10px] bg-background">
                          {grnData.grn_number}
                        </Badge>
                      </div>

                      {/* Autofilled Fields Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">
                            Material Code
                          </span>
                          <p className="font-mono font-bold text-foreground">
                            {grnData.material_code}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">
                            Material Name
                          </span>
                          <p className="font-bold text-foreground truncate">
                            {grnData.material_name}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">
                            Category & Variant
                          </span>
                          <p className="text-foreground truncate">
                            {grnData.material_category} · {grnData.material_variant}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">
                            PO / ASN Number
                          </span>
                          <p className="font-mono text-foreground">
                            {grnData.po_number} / {grnData.asn_number}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">
                            Batch / Lot #
                          </span>
                          <p className="font-mono text-foreground">{grnData.batch_lot_number}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">
                            Supplier
                          </span>
                          <p className="text-foreground truncate">{grnData.supplier_name}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">
                            Gate Entry & Truck
                          </span>
                          <p className="text-foreground">
                            {grnData.gate_entry_number} ({grnData.truck_number})
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">
                            Assigned Dock
                          </span>
                          <p className="font-mono text-foreground">{grnData.dock_code}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">
                            Assigned Store Manager
                          </span>
                          <p className="font-bold text-foreground">
                            {grnData.assigned_store_manager}
                          </p>
                        </div>
                      </div>

                      {/* Quantity Summary Card */}
                      <div className="rounded-xl border bg-background p-3 grid grid-cols-3 gap-2 text-center font-mono">
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase font-sans">
                            Received Qty
                          </span>
                          <p className="font-bold text-foreground text-sm mt-0.5">
                            {grnData.received_quantity} {grnData.uom}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase font-sans">
                            Already Put Away
                          </span>
                          <p className="font-bold text-muted-foreground text-sm mt-0.5">
                            {grnData.already_put_away_quantity} {grnData.uom}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] text-primary uppercase font-sans font-bold">
                            Available for Putaway
                          </span>
                          <p className="font-black text-primary text-base mt-0.5">
                            {grnData.available_quantity} {grnData.uom}
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-end pt-1">
                        <Button
                          size="sm"
                          className="rounded-xl text-xs gap-1 font-bold"
                          onClick={() => setPutawayStep(2)}
                        >
                          Proceed to Scan Bin QR <ChevronRight className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 2: SCAN / UPLOAD DESTINATION BIN QR */}
              {putawayStep === 2 && (
                <div className="space-y-4">
                  {/* Summary of Selected Material */}
                  {grnData && (
                    <div className="rounded-xl border bg-muted/20 p-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-muted-foreground uppercase font-bold">
                          Received Stock
                        </span>
                        <p className="font-bold text-foreground">
                          {grnData.material_name} ({grnData.material_code})
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          GRN: {grnData.grn_number} · Available:{" "}
                          <b className="text-primary">
                            {grnData.available_quantity} {grnData.uom}
                          </b>
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => setPutawayStep(1)}
                      >
                        Change Material QR
                      </Button>
                    </div>
                  )}

                  <QrScanWidget
                    title="Scan / Upload Destination Bin QR Code"
                    placeholder="e.g. BIN-RAW-001, BIN-ELEC-A1, or paste Bin QR payload"
                    onResolvedCode={(code) => void handleResolveBinQr(code)}
                    isResolving={isResolvingBin}
                  />

                  {/* If Bin already resolved, show Bin Card */}
                  {binData && (
                    <div className="rounded-2xl border bg-blue-500/5 border-blue-500/25 p-4 space-y-3">
                      <div className="flex items-center justify-between border-b pb-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="size-4 text-blue-600" />
                          <span className="text-xs font-bold text-blue-900 dark:text-blue-300">
                            Destination Bin Identified (Read-Only)
                          </span>
                        </div>
                        <Badge variant="default" className="font-mono text-[10px]">
                          {binData.bin_code}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">
                            Bin Code
                          </span>
                          <p className="font-mono font-bold text-foreground">{binData.bin_code}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">
                            Zone / Rack
                          </span>
                          <p className="font-semibold text-foreground">
                            {binData.zone_code} · {binData.rack}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">
                            Store
                          </span>
                          <p className="text-foreground">
                            {binData.store_name} ({binData.store_code})
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase font-bold">
                            Bin Status
                          </span>
                          <p className="font-bold text-emerald-600 dark:text-emerald-400">
                            {binData.status}
                          </p>
                        </div>
                      </div>

                      {/* Capacity Bar */}
                      <div className="rounded-xl border bg-background p-3 space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-muted-foreground">Bin Occupancy</span>
                          <span className="font-mono text-primary font-bold">
                            {binData.occupied_quantity} / {binData.capacity} (
                            {binData.occupancy_percentage}%)
                          </span>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full transition-all",
                              binData.occupancy_percentage > 90
                                ? "bg-red-500"
                                : binData.occupancy_percentage > 70
                                  ? "bg-amber-500"
                                  : "bg-emerald-500",
                            )}
                            style={{ width: `${Math.min(100, binData.occupancy_percentage)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>
                            Available Capacity: <b>{binData.available_capacity} units</b>
                          </span>
                          <span>Max Capacity: {binData.capacity} units</span>
                        </div>
                      </div>

                      <div className="flex justify-between pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl text-xs"
                          onClick={() => setPutawayStep(1)}
                        >
                          Back to Step 1
                        </Button>
                        <Button
                          size="sm"
                          className="rounded-xl text-xs font-bold gap-1"
                          onClick={() => setPutawayStep(3)}
                        >
                          Proceed to Quantity Confirmation <ChevronRight className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: QUANTITY HANDLING & CONFIRMATION */}
              {putawayStep === 3 && grnData && binData && (
                <div className="space-y-4">
                  {/* Summary Comparison Header */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border bg-muted/20 p-3 text-xs space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
                        <Package className="size-3 text-primary" /> Material Source
                      </span>
                      <p className="font-bold text-foreground">{grnData.material_name}</p>
                      <p className="font-mono text-muted-foreground text-[11px]">
                        {grnData.material_code} · GRN: {grnData.grn_number}
                      </p>
                      <p className="text-[11px]">
                        Available:{" "}
                        <b className="text-primary">
                          {grnData.available_quantity} {grnData.uom}
                        </b>
                      </p>
                    </div>

                    <div className="rounded-xl border bg-muted/20 p-3 text-xs space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
                        <MapPin className="size-3 text-blue-500" /> Target Location
                      </span>
                      <p className="font-bold font-mono text-foreground">Bin: {binData.bin_code}</p>
                      <p className="text-muted-foreground text-[11px]">
                        Zone: {binData.zone_code} · Rack: {binData.rack}
                      </p>
                      <p className="text-[11px]">
                        Bin Available Cap:{" "}
                        <b className="text-blue-600">{binData.available_capacity} units</b>
                      </p>
                    </div>
                  </div>

                  {/* Quantity Input Card */}
                  <Card className="rounded-2xl p-4 border bg-card space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-foreground">
                        Quantity to Put Away ({grnData.uom})
                      </label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="any"
                          min="0.0001"
                          max={grnData.available_quantity}
                          value={putawayQuantity}
                          onChange={(e) => setPutawayQuantity(e.target.value)}
                          className="h-10 text-sm font-mono font-bold rounded-xl"
                          placeholder={`Enter quantity (max: ${grnData.available_quantity})`}
                          disabled={isExecuting}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-10 px-3 rounded-xl text-xs font-bold shrink-0"
                          onClick={() => setPutawayQuantity(String(grnData.available_quantity))}
                        >
                          Max All ({grnData.available_quantity})
                        </Button>
                      </div>
                    </div>

                    {/* Partial Putaway Simulation Breakdown */}
                    {(() => {
                      const qty = parseFloat(putawayQuantity) || 0;
                      const rem = Math.max(0, grnData.available_quantity - qty);
                      const isComplete = qty >= grnData.available_quantity;

                      return (
                        <div className="rounded-xl border bg-muted/15 p-3 space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Received Total:</span>
                            <span className="font-mono font-semibold">
                              {grnData.received_quantity} {grnData.uom}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Already Put Away:</span>
                            <span className="font-mono font-semibold">
                              {grnData.already_put_away_quantity} {grnData.uom}
                            </span>
                          </div>
                          <div className="flex justify-between text-primary font-bold">
                            <span>This Putaway Transaction:</span>
                            <span className="font-mono">
                              +{qty} {grnData.uom}
                            </span>
                          </div>
                          <div className="pt-2 border-t flex justify-between items-center">
                            <span className="font-semibold text-foreground">
                              Post-Transaction Outcome:
                            </span>
                            <Badge
                              variant={isComplete ? "default" : "secondary"}
                              className="font-bold"
                            >
                              {isComplete
                                ? "Status: Completed (0 Remaining)"
                                : `Status: Partially Completed (${rem} ${grnData.uom} Remaining)`}
                            </Badge>
                          </div>
                        </div>
                      );
                    })()}
                  </Card>

                  {/* Actions */}
                  <div className="flex justify-between pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl text-xs"
                      onClick={() => setPutawayStep(2)}
                      disabled={isExecuting}
                    >
                      Back to Bin Selection
                    </Button>
                    <Button
                      className="rounded-xl text-xs font-bold gap-1.5 px-5 bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={handleConfirmPutaway}
                      disabled={isExecuting || !putawayQuantity || parseFloat(putawayQuantity) <= 0}
                    >
                      {isExecuting ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" /> Confirming Putaway...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="size-3.5" /> Confirm Putaway
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
          </>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* TASK DETAILS DIALOG (READ-ONLY AUDIT VIEW)                               */}
      {/* ========================================================================= */}
      <Dialog open={!!selectedTaskDetails} onOpenChange={() => setSelectedTaskDetails(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                  <Package className="size-4" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold">
                    Task #{selectedTaskDetails?.task_number}
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Putaway lifecycle details, material trace, and dock-allocated Store Manager.
                  </DialogDescription>
                </div>
              </div>
              {selectedTaskDetails && <StatusBadge status={selectedTaskDetails.status} />}
            </div>
          </DialogHeader>

          {selectedTaskDetails && (
            <div className="space-y-4 pt-2">
              {/* Material Details Card */}
              <div className="rounded-2xl border bg-muted/20 p-4 space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                      Material Specification
                    </p>
                    <h3 className="text-sm font-bold text-foreground">
                      {selectedTaskDetails.material_name}
                    </h3>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-[10px] text-muted-foreground uppercase font-sans">
                      Remaining Qty
                    </span>
                    <p className="text-lg font-black text-primary">
                      {(
                        selectedTaskDetails.putaway_quantity ?? selectedTaskDetails.quantity
                      ).toLocaleString()}{" "}
                      {selectedTaskDetails.uom}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">
                      Item Code
                    </span>
                    <p className="font-mono font-bold text-foreground">
                      {selectedTaskDetails.item_code}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">
                      Warehouse
                    </span>
                    <p className="font-semibold text-foreground">
                      {selectedTaskDetails.warehouse_id}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">
                      Unit of Measure
                    </span>
                    <p className="text-foreground">{selectedTaskDetails.uom}</p>
                  </div>
                </div>

                <div className="pt-2 border-t flex items-center justify-between text-xs">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <QrCode className="size-3.5 text-primary" /> Material QR Code:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <code className="font-mono text-xs px-2 py-0.5 rounded bg-muted">
                      {selectedTaskDetails.material_qr ||
                        selectedTaskDetails.barcode_value ||
                        "QR not recorded"}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="size-7 p-0"
                      onClick={() =>
                        copyToClipboard(
                          selectedTaskDetails.material_qr ||
                            selectedTaskDetails.barcode_value ||
                            "QR not recorded",
                          "QR Code",
                        )
                      }
                    >
                      <Copy className="size-3" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Logistics & Assignment Traceability */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Dock & Transport */}
                <div className="rounded-xl border p-3.5 space-y-2 text-xs">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Truck className="size-3.5 text-blue-500" /> Inbound Logistics
                  </p>
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Assigned Dock:</span>
                      <span className="font-mono font-bold text-foreground">
                        {selectedTaskDetails.assigned_dock ||
                          selectedTaskDetails.source_location ||
                          "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Truck Number:</span>
                      <span className="font-semibold text-foreground">
                        {selectedTaskDetails.truck_number ||
                          selectedTaskDetails.vehicle_number ||
                          "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gate Entry #:</span>
                      <span className="font-mono text-foreground">
                        {selectedTaskDetails.gate_entry_number || "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Store Manager & Store */}
                <div className="rounded-xl border p-3.5 space-y-2 text-xs">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <UserCheck className="size-3.5 text-emerald-600" /> Store Manager (Read-Only)
                  </p>
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Assigned Store Manager:</span>
                      <span className="font-bold text-foreground">
                        {selectedTaskDetails.assigned_store_manager_name ||
                          selectedTaskDetails.assigned_store_manager_username ||
                          selectedTaskDetails.assigned_to ||
                          "Allocated via Dock"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Destination Store:</span>
                      <span className="font-semibold text-foreground">
                        {selectedTaskDetails.assigned_store_name ||
                          getStoreName(selectedTaskDetails.destination_store_id) ||
                          "Store"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Target Zone / Bin:</span>
                      <span className="font-mono text-foreground">
                        {selectedTaskDetails.destination_bin_code ||
                          selectedTaskDetails.destination_bin ||
                          selectedTaskDetails.destination_zone ||
                          "Assigned at scan"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Document References */}
              <div className="rounded-xl border bg-muted/10 p-3 text-xs grid grid-cols-3 gap-2 text-center font-mono">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-sans">
                    GRN Number
                  </p>
                  <p className="font-bold text-foreground mt-0.5">
                    {selectedTaskDetails.grn_number}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-sans">
                    ASN Number
                  </p>
                  <p className="font-bold text-foreground mt-0.5">
                    {selectedTaskDetails.asn_number || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase font-sans">PO Number</p>
                  <p className="font-bold text-foreground mt-0.5">
                    {selectedTaskDetails.po_number || "—"}
                  </p>
                </div>
              </div>

              {/* Execution Audit Timeline */}
              <div className="rounded-xl border p-3.5 space-y-2 text-xs">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Clock className="size-3.5 text-primary" /> Execution Audit Trail
                </p>
                <div className="grid grid-cols-2 gap-3 pt-1 text-[11px]">
                  <div>
                    <span className="text-muted-foreground">Task Created:</span>
                    <p className="font-medium text-foreground">
                      {new Date(selectedTaskDetails.created_at).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Created by: {selectedTaskDetails.created_by}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Execution Status:</span>
                    {selectedTaskDetails.completed_at ? (
                      <div>
                        <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                          Completed: {new Date(selectedTaskDetails.completed_at).toLocaleString()}
                        </p>
                        {selectedTaskDetails.completed_by && (
                          <p className="text-[10px] text-muted-foreground">
                            Confirmed by: {selectedTaskDetails.completed_by}
                          </p>
                        )}
                      </div>
                    ) : selectedTaskDetails.started_at ? (
                      <div>
                        <p className="font-semibold text-purple-600 dark:text-purple-400">
                          Started: {new Date(selectedTaskDetails.started_at).toLocaleString()}
                        </p>
                        {selectedTaskDetails.started_by && (
                          <p className="text-[10px] text-muted-foreground">
                            Operator: {selectedTaskDetails.started_by}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="font-medium text-amber-600 dark:text-amber-400">
                        Awaiting QR scan & confirmation
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  variant="outline"
                  className="rounded-xl text-xs"
                  onClick={() => setSelectedTaskDetails(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
