import { useState, useEffect, useRef } from "react";
import {
  Boxes,
  Truck,
  ShieldCheck,
  QrCode,
  BarChart3,
  Activity,
  Maximize2,
  Sparkles,
  Eye,
  CheckCircle2,
  X,
  Zap,
  Cpu,
  Check,
  Lock,
  Compass,
  Radio,
  Sliders,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type FacilityPartId =
  | "all"
  | "gate"
  | "conveyor"
  | "scanning"
  | "inventory"
  | "analytics";

interface FacilityPart {
  id: FacilityPartId;
  name: string;
  category: string;
  badge: string;
  description: string;
  metrics: { label: string; value: string; sub: string }[];
  liveStatus: "Nominal" | "Active" | "Verified" | "Operating";
}

const FACILITY_PARTS: Record<Exclude<FacilityPartId, "all">, FacilityPart> = {
  gate: {
    id: "gate",
    name: "Gate 3 Security & Access Control",
    category: "Perimeter Security & Inbound",
    badge: "ANPR Synced",
    description:
      "Automated vehicle boom barrier, ANPR license plate recognition, and security check-in for inbound freight.",
    metrics: [
      { label: "Check-Ins", value: "3 Trucks In", sub: "1 Out / Cleared" },
      { label: "Barrier Status", value: "Motorized Active", sub: "Cycle Time 3.2s" },
      { label: "Active Vehicle", value: "MH-12-AB-9876", sub: "PO-9042 Matched" },
    ],
    liveStatus: "Verified",
  },
  conveyor: {
    id: "conveyor",
    name: "Automated Logistics Conveyor & AGV",
    category: "Internal Sorting & Transport",
    badge: "1,245 Orders",
    description:
      "High-speed sorting conveyor track and autonomous mobile robots (AGVs) routing cartons to staging lanes.",
    metrics: [
      { label: "Active Orders", value: "1,245 Live", sub: "Packing · Shipped · Pending" },
      { label: "Conveyor Speed", value: "1.8 m/sec", sub: "Optical Routing Nominal" },
      { label: "AGV Shuttles", value: "4 Autonomous", sub: "Battery 94% · Zero Faults" },
    ],
    liveStatus: "Operating",
  },
  scanning: {
    id: "scanning",
    name: "Optical QA & Barcode Scanning Station",
    category: "Receiving & Quality Inspection",
    badge: "VALIDATION SUCCESS",
    description:
      "Handheld industrial optical reader with automated QR/barcode intake validation for incoming crates.",
    metrics: [
      { label: "Scan Result", value: "SUCCESS (2341-9876)", sub: "Batch B-9041 Cleared" },
      { label: "Inspection Rate", value: "99.8% Accuracy", sub: "0 Rejections this Hour" },
      { label: "GRN Status", value: "Auto-Drafted", sub: "Posted to Store B12" },
    ],
    liveStatus: "Nominal",
  },
  inventory: {
    id: "inventory",
    name: "High-Rack Storage Racks (Bay 12)",
    category: "Inventory Storage & Pallet Staging",
    badge: "89% Capacity",
    description:
      "Multi-tier heavy industrial storage racks with automated bin tracking and live capacity telemetry.",
    metrics: [
      { label: "Total Inventory", value: "58,432 Items", sub: "89% Storage Occupancy" },
      { label: "Active Bins", value: "Bay B12-01 to 08", sub: "Sub-Location Validated" },
      { label: "Replenishment", value: "Nominal", sub: "Stockout Alert: 0 Items" },
    ],
    liveStatus: "Nominal",
  },
  analytics: {
    id: "analytics",
    name: "Warehouse Analytics & Inbound Dock Hub",
    category: "Command & Telemetry",
    badge: "94.2% Efficiency",
    description:
      "Real-time productivity telemetry, dock door utilization, and thermal heatmaps for picking velocity.",
    metrics: [
      { label: "Facility Efficiency", value: "94.2%", sub: "Above SLA Target (90%)" },
      { label: "Picking Velocity", value: "1,021 Units/Hr", sub: "All Zones Operational" },
      { label: "Dock Utilization", value: "4 Active Bays", sub: "Truck T-041 Discharging" },
    ],
    liveStatus: "Active",
  },
};

interface Props {
  className?: string;
  showControls?: boolean;
}

export function IsometricWarehouse3D({ className = "", showControls = true }: Props) {
  const [selectedPart, setSelectedPart] = useState<FacilityPartId>("all");
  const [hoveredPart, setHoveredPart] = useState<FacilityPartId | null>(null);
  const [activeAnimations, setActiveAnimations] = useState(true);
  const [floatIntensity, setFloatIntensity] = useState<"lively" | "calm">("lively");
  const [parallaxEnabled, setParallaxEnabled] = useState(true);
  const [showTethers, setShowTethers] = useState(true);
  const [barrierOpen, setBarrierOpen] = useState(false);
  const [scanPulseCount, setScanPulseCount] = useState(0);
  const [fullModalOpen, setFullModalOpen] = useState(false);

  // Parallax tilt angles
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Mouse move handler for realistic 3D parallax depth
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!parallaxEnabled || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // 3D tilt angles (max +/- 7 degrees)
    const rotateY = ((x - centerX) / centerX) * 7;
    const rotateX = -((y - centerY) / centerY) * 6;

    setTilt({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setHoveredPart(null);
  };

  // Periodic automatic barrier movement cycle for realistic animation
  useEffect(() => {
    if (!activeAnimations) return;
    const interval = setInterval(() => {
      setBarrierOpen((prev) => !prev);
    }, 4500);
    return () => clearInterval(interval);
  }, [activeAnimations]);

  // Periodic scan pulse simulation
  useEffect(() => {
    if (!activeAnimations) return;
    const interval = setInterval(() => {
      setScanPulseCount((c) => (c + 1) % 100);
    }, 3200);
    return () => clearInterval(interval);
  }, [activeAnimations]);

  const activePartData = selectedPart !== "all" ? FACILITY_PARTS[selectedPart] : null;

  return (
    <div className={`flex flex-col gap-3.5 ${className}`}>
      {/* Embedded High-Fidelity Scoped CSS Styles for Guaranteed Floating Animations */}
      <style>{`
        /* Vivid 3D Floating Animations with Natural Harmonic Drift and Rotation */
        @keyframes vivid-float-1 {
          0%, 100% {
            transform: translateY(0px) translateX(0px) rotateX(2deg) rotateY(-2deg) rotateZ(0.5deg) translateZ(45px);
          }
          50% {
            transform: translateY(-18px) translateX(3px) rotateX(-2deg) rotateY(3deg) rotateZ(-0.6deg) translateZ(75px);
          }
        }
        @keyframes vivid-float-2 {
          0%, 100% {
            transform: translateY(0px) translateX(0px) rotateX(-3deg) rotateY(2deg) rotateZ(-0.5deg) translateZ(55px);
          }
          50% {
            transform: translateY(-22px) translateX(-4px) rotateX(3deg) rotateY(-2deg) rotateZ(0.8deg) translateZ(85px);
          }
        }
        @keyframes vivid-float-3 {
          0%, 100% {
            transform: translateY(0px) translateX(0px) rotateX(3deg) rotateY(-1deg) rotateZ(0.4deg) translateZ(50px);
          }
          50% {
            transform: translateY(-16px) translateX(-3px) rotateX(-2deg) rotateY(2deg) rotateZ(-0.5deg) translateZ(78px);
          }
        }
        @keyframes vivid-float-4 {
          0%, 100% {
            transform: translateY(0px) translateX(0px) rotateX(2deg) rotateY(3deg) rotateZ(-0.5deg) translateZ(60px);
          }
          50% {
            transform: translateY(-20px) translateX(4px) rotateX(-3deg) rotateY(-2deg) rotateZ(0.7deg) translateZ(90px);
          }
        }
        @keyframes vivid-float-5 {
          0%, 100% {
            transform: translateY(0px) translateX(0px) rotateX(-2deg) rotateY(-2deg) rotateZ(0.6deg) translateZ(65px);
          }
          50% {
            transform: translateY(-17px) translateX(3px) rotateX(2deg) rotateY(3deg) rotateZ(-0.4deg) translateZ(92px);
          }
        }
        @keyframes vivid-float-6 {
          0%, 100% {
            transform: translateY(0px) translateX(0px) rotateX(3deg) rotateY(-3deg) rotateZ(-0.5deg) translateZ(55px);
          }
          50% {
            transform: translateY(-21px) translateX(-4px) rotateX(-2deg) rotateY(2deg) rotateZ(0.8deg) translateZ(85px);
          }
        }

        /* Calm float for gentle motion */
        @keyframes calm-float-1 {
          0%, 100% { transform: translateY(0px) translateZ(45px); }
          50% { transform: translateY(-8px) translateZ(60px); }
        }
        @keyframes calm-float-2 {
          0%, 100% { transform: translateY(0px) translateZ(55px); }
          50% { transform: translateY(-10px) translateZ(70px); }
        }
        @keyframes calm-float-3 {
          0%, 100% { transform: translateY(0px) translateZ(50px); }
          50% { transform: translateY(-7px) translateZ(65px); }
        }
        @keyframes calm-float-4 {
          0%, 100% { transform: translateY(0px) translateZ(60px); }
          50% { transform: translateY(-9px) translateZ(75px); }
        }
        @keyframes calm-float-5 {
          0%, 100% { transform: translateY(0px) translateZ(65px); }
          50% { transform: translateY(-8px) translateZ(78px); }
        }
        @keyframes calm-float-6 {
          0%, 100% { transform: translateY(0px) translateZ(55px); }
          50% { transform: translateY(-10px) translateZ(70px); }
        }

        /* Ground shadow breathing synchronized with floating height */
        @keyframes shadow-breathe-sync {
          0%, 100% {
            transform: scale(0.96);
            opacity: 0.75;
            filter: blur(8px);
          }
          50% {
            transform: scale(1.15) translateY(8px);
            opacity: 0.25;
            filter: blur(18px);
          }
        }

        /* Shimmer sweep along holographic cards */
        @keyframes hud-shimmer-sweep {
          0% {
            transform: translateY(-120%);
            opacity: 0;
          }
          15% {
            opacity: 0.7;
          }
          85% {
            opacity: 0.7;
          }
          100% {
            transform: translateY(220%);
            opacity: 0;
          }
        }

        /* Glowing aura pulse */
        @keyframes neon-aura-pulse {
          0%, 100% {
            box-shadow: 0 12px 28px -6px rgba(0, 0, 0, 0.9), 0 0 16px rgba(6, 182, 212, 0.3), inset 0 0 12px rgba(6, 182, 212, 0.08);
          }
          50% {
            box-shadow: 0 22px 42px -6px rgba(0, 0, 0, 0.95), 0 0 32px rgba(6, 182, 212, 0.6), inset 0 0 18px rgba(6, 182, 212, 0.16);
          }
        }

        .floating-hologram-1 {
          animation: ${floatIntensity === "lively" ? "vivid-float-1 4.5s ease-in-out infinite" : "calm-float-1 5.5s ease-in-out infinite"};
        }
        .floating-hologram-2 {
          animation: ${floatIntensity === "lively" ? "vivid-float-2 5.2s ease-in-out infinite" : "calm-float-2 6.0s ease-in-out infinite"};
          animation-delay: -1.6s;
        }
        .floating-hologram-3 {
          animation: ${floatIntensity === "lively" ? "vivid-float-3 4.8s ease-in-out infinite" : "calm-float-3 5.4s ease-in-out infinite"};
          animation-delay: -3.0s;
        }
        .floating-hologram-4 {
          animation: ${floatIntensity === "lively" ? "vivid-float-4 5.6s ease-in-out infinite" : "calm-float-4 6.2s ease-in-out infinite"};
          animation-delay: -0.8s;
        }
        .floating-hologram-5 {
          animation: ${floatIntensity === "lively" ? "vivid-float-5 4.6s ease-in-out infinite" : "calm-float-5 5.8s ease-in-out infinite"};
          animation-delay: -2.3s;
        }
        .floating-hologram-6 {
          animation: ${floatIntensity === "lively" ? "vivid-float-6 5.0s ease-in-out infinite" : "calm-float-6 5.6s ease-in-out infinite"};
          animation-delay: -3.8s;
        }

        .floating-ground-shadow {
          animation: shadow-breathe-sync 4.8s ease-in-out infinite;
        }
        .shimmer-scanline {
          animation: hud-shimmer-sweep 3.8s linear infinite;
        }
        .hud-card-breathe {
          animation: neon-aura-pulse 3.5s ease-in-out infinite;
        }
      `}</style>

      {/* Subsystem Selector Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setSelectedPart("all")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              selectedPart === "all"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/70 text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            <Cpu className="size-3.5" />
            <span>All Subsystems</span>
          </button>

          {(
            [
              { id: "inventory", label: "Inventory Racks", icon: Boxes },
              { id: "conveyor", label: "Logistics Flow", icon: Activity },
              { id: "gate", label: "Gate Security", icon: ShieldCheck },
              { id: "scanning", label: "Scanning QA", icon: QrCode },
              { id: "analytics", label: "Dock Analytics", icon: BarChart3 },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const isSelected = selectedPart === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setSelectedPart(item.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? "bg-cyan-500 text-slate-950 font-bold shadow-sm ring-2 ring-cyan-400/50"
                    : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="size-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-cyan-400 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-cyan-500/20">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>AUTONOMOUS 3D FLOATING HUD</span>
        </div>
      </div>

      {/* 3D Viewport Enclosure with Parallax Perspective */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="perspective-1200 relative rounded-2xl border border-cyan-500/35 bg-slate-950 p-2 sm:p-3 shadow-2xl shadow-cyan-950/40 overflow-hidden group select-none"
      >
        {/* Cyber Ambient Grid Background */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(6,182,212,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(6,182,212,0.12) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Viewport Top Console Bar */}
        <div className="relative z-40 flex items-center justify-between px-3 py-2 rounded-xl bg-slate-900/90 backdrop-blur-md border border-cyan-500/25 mb-2 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Boxes className="size-4 text-cyan-400" />
              NexusWMS 3D Facility Digital Twin
            </span>
            <Badge
              variant="outline"
              className="text-[10px] py-0 px-1.5 border-emerald-500/40 text-emerald-400 bg-emerald-950/40"
            >
              REAL-TIME FLOATING HUD
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {/* Floating Intensity Toggle (Lively / Calm) */}
            <button
              onClick={() => setFloatIntensity(floatIntensity === "lively" ? "calm" : "lively")}
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border transition-colors flex items-center gap-1 cursor-pointer ${
                floatIntensity === "lively"
                  ? "border-cyan-400 text-cyan-300 bg-cyan-950/60 shadow-xs shadow-cyan-500/20"
                  : "border-slate-800 text-slate-400 bg-slate-900"
              }`}
              title="Switch Floating Animation Wave Amplitude"
            >
              <Sparkles className="size-3 text-cyan-400" />
              Float Wave: {floatIntensity === "lively" ? "LIVELY" : "CALM"}
            </button>

            <button
              onClick={() => setParallaxEnabled(!parallaxEnabled)}
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border transition-colors flex items-center gap-1 cursor-pointer ${
                parallaxEnabled
                  ? "border-cyan-500/60 text-cyan-300 bg-cyan-950/40"
                  : "border-slate-800 text-slate-500 bg-slate-900"
              }`}
              title="Toggle 3D Mouse Parallax Tilt"
            >
              <Compass className="size-3 text-cyan-400" />
              3D Parallax: {parallaxEnabled ? "ON" : "OFF"}
            </button>

            <button
              onClick={() => setActiveAnimations(!activeAnimations)}
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border transition-colors flex items-center gap-1 cursor-pointer ${
                activeAnimations
                  ? "border-emerald-500/50 text-emerald-300 bg-emerald-950/40"
                  : "border-slate-800 text-slate-500 bg-slate-900"
              }`}
            >
              <Zap className="size-3 text-emerald-400" />
              Motion: {activeAnimations ? "ON" : "OFF"}
            </button>

            <button
              onClick={() => setFullModalOpen(true)}
              className="p-1 rounded-md text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Expand Full Screen"
            >
              <Maximize2 className="size-3.5" />
            </button>
          </div>
        </div>

        {/* 3D PARALLAX STAGE (Preserve 3D with Mouse Tilt) */}
        <div
          className="relative rounded-xl overflow-hidden border border-cyan-500/30 bg-slate-950 shadow-inner preserve-3d transition-transform duration-200 ease-out"
          style={{
            transform: parallaxEnabled
              ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`
              : "none",
          }}
        >
          {/* ========================================================================= */}
          {/* 1. BASE LAYER: Clean 3D Isometric Warehouse Floor Render                 */}
          {/* ========================================================================= */}
          <div className="relative w-full overflow-hidden">
            <img
              src="/images/nexus-warehouse-base.jpg"
              alt="NexusWMS 3D Warehouse Base"
              className="w-full h-auto object-cover block filter contrast-[1.05] brightness-[1.02]"
              loading="eager"
            />

            {/* Glowing neon path enhancer over the conveyor snake */}
            <div
              className="absolute inset-0 pointer-events-none opacity-40 mix-blend-screen"
              style={{
                background:
                  "radial-gradient(circle at 60% 55%, rgba(6,182,212,0.3) 0%, transparent 45%), radial-gradient(circle at 35% 75%, rgba(168,85,247,0.25) 0%, transparent 40%)",
              }}
            />

            {/* REAL WAREHOUSE COMPONENT 1: Animated Conveyor SVG Flow & Moving Parcels */}
            {activeAnimations && (
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-10"
                viewBox="0 0 1000 562"
                preserveAspectRatio="none"
              >
                <defs>
                  <filter id="neonGlowPulse" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="3.5" result="glow" />
                    <feMerge>
                      <feMergeNode in="glow" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Animated Moving Box 1 along conveyor path */}
                <g filter="url(#neonGlowPulse)">
                  <rect width="14" height="12" rx="2" fill="#38bdf8" stroke="#ffffff" strokeWidth="1">
                    <animateMotion
                      path="M 680 230 L 640 255 L 710 300 L 590 370 L 480 340 L 430 380"
                      dur="5.5s"
                      repeatCount="indefinite"
                    />
                  </rect>
                </g>

                {/* Animated Moving Box 2 (Delayed) */}
                <g filter="url(#neonGlowPulse)">
                  <rect width="13" height="11" rx="2" fill="#34d399" stroke="#ffffff" strokeWidth="1">
                    <animateMotion
                      path="M 680 230 L 640 255 L 710 300 L 590 370 L 480 340 L 430 380"
                      begin="2.7s"
                      dur="5.5s"
                      repeatCount="indefinite"
                    />
                  </rect>
                </g>

                {/* Animated Moving Box 3 (Purple high-priority) */}
                <g filter="url(#neonGlowPulse)">
                  <rect width="12" height="10" rx="2" fill="#c084fc" stroke="#ffffff" strokeWidth="1">
                    <animateMotion
                      path="M 770 280 L 710 315 L 650 350"
                      dur="3.8s"
                      repeatCount="indefinite"
                    />
                  </rect>
                </g>
              </svg>
            )}

            {/* REAL WAREHOUSE COMPONENT 2: Gate 3 Motorized Boom Barrier Arm */}
            <div
              className="absolute pointer-events-none transition-transform duration-700 ease-in-out z-20"
              style={{
                left: "30.5%",
                top: "76.5%",
                width: "9%",
                height: "3px",
                transformOrigin: "left center",
                transform: barrierOpen ? "rotate(-65deg)" : "rotate(0deg)",
                background:
                  "repeating-linear-gradient(90deg, #ef4444 0px, #ef4444 5px, #ffffff 5px, #ffffff 10px)",
                boxShadow: barrierOpen
                  ? "0 0 10px rgba(52, 211, 153, 0.9)"
                  : "0 0 8px rgba(239, 68, 68, 0.9)",
              }}
            >
              <div
                className={`absolute right-0 top-1/2 -translate-y-1/2 size-2 rounded-full ${
                  barrierOpen ? "bg-emerald-400 animate-ping" : "bg-rose-500"
                }`}
              />
            </div>

            {/* REAL WAREHOUSE COMPONENT 3: Optical Laser Scanning Ray across Crate */}
            {activeAnimations && (
              <div
                className="absolute pointer-events-none z-20 rounded-full animate-qr-laser-line"
                style={{
                  left: "58%",
                  top: "81%",
                  width: "6.5%",
                  height: "2px",
                  background:
                    "linear-gradient(90deg, transparent, rgba(6,182,212,0.95), transparent)",
                  boxShadow: "0 0 8px #06b6d4, 0 0 3px #ffffff",
                }}
              />
            )}

            {/* REAL WAREHOUSE COMPONENT 4: Rack B12 Telemetry Beacons */}
            {activeAnimations && (
              <>
                <div
                  className="absolute size-2 rounded-full bg-cyan-400 animate-ping pointer-events-none z-20"
                  style={{ left: "44%", top: "48%" }}
                />
                <div
                  className="absolute size-2 rounded-full bg-emerald-400 animate-pulse pointer-events-none z-20"
                  style={{ left: "24%", top: "54%" }}
                />
                <div
                  className="absolute size-2 rounded-full bg-cyan-400 animate-pulse pointer-events-none z-20"
                  style={{ left: "55%", top: "42%" }}
                />
              </>
            )}
          </div>

          {/* ========================================================================= */}
          {/* 2. REALISTIC INDEPENDENT 3D FLOATING HUD CARDS (SEPARATE LAYERS)          */}
          {/* ========================================================================= */}

          {/* BRAND LOGO BADGE (Floating Top Left) */}
          <div
            className="absolute top-2 left-3 z-30 pointer-events-auto cursor-pointer"
            style={{ transform: "translateZ(30px)" }}
            onClick={() => setSelectedPart("all")}
          >
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-slate-950/85 backdrop-blur-md border border-cyan-500/40 shadow-lg shadow-cyan-950/40 hover:border-cyan-400 transition-colors">
              <div className="size-6 rounded-lg bg-gradient-to-br from-cyan-400 via-sky-500 to-indigo-600 flex items-center justify-center text-slate-950 font-black shadow-xs">
                <Boxes className="size-3.5" />
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-extrabold tracking-tight text-white leading-tight flex items-center gap-1">
                  NexusWMS
                  <span className="size-1 rounded-full bg-emerald-400 animate-ping" />
                </span>
                <span className="text-[8px] font-mono tracking-widest text-cyan-400 uppercase">
                  DASHBOARD
                </span>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------------------- */}
          {/* FLOATING CARD 1: REAL-TIME INVENTORY (Top-Left)                           */}
          {/* ------------------------------------------------------------------------- */}
          <div
            onClick={() => setSelectedPart("inventory")}
            onMouseEnter={() => setHoveredPart("inventory")}
            onMouseLeave={() => setHoveredPart(null)}
            className={`absolute top-[16%] left-[4.5%] w-[22%] z-30 cursor-pointer pointer-events-auto transition-all duration-300 ${
              activeAnimations ? "floating-hologram-1" : ""
            } ${
              selectedPart === "inventory" || hoveredPart === "inventory"
                ? "scale-[1.04] ring-2 ring-cyan-400 z-40"
                : ""
            }`}
            style={{
              transform:
                hoveredPart === "inventory"
                  ? "translateY(-12px) translateZ(85px) scale(1.04)"
                  : undefined,
            }}
          >
            {/* Synchronized Ground Shadow beneath the card */}
            <div className="absolute -inset-3 bg-cyan-950/70 rounded-2xl filter blur-xl pointer-events-none -z-10 floating-ground-shadow" />

            <div className="hud-glass hud-glass-hover hud-card-breathe rounded-xl p-2.5 sm:p-3 text-white relative overflow-hidden">
              {/* Shimmer Light Bar */}
              <div className="absolute inset-x-0 h-10 bg-gradient-to-b from-transparent via-cyan-400/10 to-transparent pointer-events-none shimmer-scanline" />

              {/* Card Window Header */}
              <div className="flex items-center justify-between border-b border-cyan-500/20 pb-1.5 mb-2 relative z-10">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1">
                  <Boxes className="size-3 text-cyan-400 animate-pulse" />
                  REAL-TIME INVENTORY
                </span>
                <div className="flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-cyan-400 animate-ping" />
                  <span className="size-1.5 rounded-full bg-cyan-400/60" />
                </div>
              </div>

              {/* Main Metric Row */}
              <div className="flex items-start justify-between gap-1 mb-2 relative z-10">
                <div>
                  <div className="text-base sm:text-lg font-black tracking-tight text-white leading-tight font-mono">
                    58,432
                  </div>
                  <div className="text-[8px] font-mono uppercase text-slate-400 tracking-wider">
                    ITEMS
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm sm:text-base font-bold text-cyan-300 leading-tight font-mono">
                    89%
                  </div>
                  <div className="text-[8px] font-mono uppercase text-slate-400 tracking-wider">
                    CAPACITY
                  </div>
                  {/* Capacity Bar */}
                  <div className="w-14 bg-slate-800 rounded-full h-1 mt-1 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full"
                      style={{ width: "89%" }}
                    />
                  </div>
                </div>
              </div>

              {/* Glowing SVG Wave Sparkline Chart */}
              <div className="relative pt-1 z-10">
                <svg
                  viewBox="0 0 160 50"
                  className="w-full h-9 overflow-visible"
                >
                  <defs>
                    <linearGradient id="invGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  {/* Area fill */}
                  <path
                    d="M 0 35 Q 25 15 50 30 T 100 12 T 160 25 L 160 50 L 0 50 Z"
                    fill="url(#invGradient)"
                  />
                  {/* Glowing Stroke */}
                  <path
                    d="M 0 35 Q 25 15 50 30 T 100 12 T 160 25"
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth="2"
                    filter="drop-shadow(0 0 4px #06b6d4)"
                  />
                  {/* Live pulsing data point */}
                  <circle cx="100" cy="12" r="3" fill="#ffffff">
                    <animate
                      attributeName="r"
                      values="2.5;4.5;2.5"
                      dur="1.8s"
                      repeatCount="indefinite"
                    />
                  </circle>
                </svg>

                {/* SKU Markers Axis */}
                <div className="flex items-center justify-between text-[7px] font-mono text-slate-500 pt-0.5">
                  <span>SKU</span>
                  <span>1000</span>
                  <span>SKU</span>
                  <span>2KU</span>
                  <span>SKU</span>
                  <span>5KU</span>
                </div>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------------------- */}
          {/* FLOATING CARD 2: AUTOMATED LOGISTICS FLOW (Center-Top)                     */}
          {/* ------------------------------------------------------------------------- */}
          <div
            onClick={() => setSelectedPart("conveyor")}
            onMouseEnter={() => setHoveredPart("conveyor")}
            onMouseLeave={() => setHoveredPart(null)}
            className={`absolute top-[4%] left-[34%] w-[27%] z-30 cursor-pointer pointer-events-auto transition-all duration-300 ${
              activeAnimations ? "floating-hologram-2" : ""
            } ${
              selectedPart === "conveyor" || hoveredPart === "conveyor"
                ? "scale-[1.04] ring-2 ring-cyan-400 z-40"
                : ""
            }`}
            style={{
              transform:
                hoveredPart === "conveyor"
                  ? "translateY(-12px) translateZ(95px) scale(1.04)"
                  : undefined,
            }}
          >
            {/* Ground Shadow */}
            <div className="absolute -inset-3 bg-cyan-950/70 rounded-2xl filter blur-xl pointer-events-none -z-10 floating-ground-shadow" />

            <div className="hud-glass hud-glass-hover hud-card-breathe rounded-xl p-2.5 sm:p-3 text-white relative overflow-hidden">
              {/* Shimmer Light Bar */}
              <div className="absolute inset-x-0 h-10 bg-gradient-to-b from-transparent via-cyan-400/10 to-transparent pointer-events-none shimmer-scanline" />

              {/* Card Window Header */}
              <div className="flex items-center justify-between border-b border-cyan-500/20 pb-1.5 mb-2 relative z-10">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1">
                  <Activity className="size-3 text-cyan-400 animate-pulse" />
                  AUTOMATED LOGISTICS FLOW
                </span>
                <div className="flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-cyan-400 animate-ping" />
                  <span className="size-1.5 rounded-full bg-cyan-400/60" />
                </div>
              </div>

              {/* Split Content: Mini Isometric Conveyor Graphic + Metric Breakdown */}
              <div className="grid grid-cols-12 gap-2 items-center relative z-10">
                {/* Left: Mini SVG Conveyor Cross Illustration */}
                <div className="col-span-6 flex items-center justify-center">
                  <svg viewBox="0 0 100 65" className="w-full h-14">
                    {/* Conveyor track cross */}
                    <path
                      d="M 10 30 L 50 10 L 90 30 L 50 50 Z"
                      fill="none"
                      stroke="#0284c7"
                      strokeWidth="2.5"
                    />
                    <path
                      d="M 20 45 L 50 30 L 80 45"
                      fill="none"
                      stroke="#0ea5e9"
                      strokeWidth="2"
                    />
                    {/* Moving Parcels */}
                    <rect x="25" y="24" width="8" height="7" rx="1" fill="#38bdf8" />
                    <rect x="65" y="22" width="8" height="7" rx="1" fill="#34d399" />
                    <rect x="47" y="34" width="8" height="7" rx="1" fill="#c084fc" />
                  </svg>
                </div>

                {/* Right: Order Counts & Flow Status */}
                <div className="col-span-6 space-y-1">
                  <div>
                    <div className="text-sm sm:text-base font-black tracking-tight text-white font-mono leading-tight">
                      1,245
                    </div>
                    <div className="text-[8px] font-mono uppercase text-slate-400">
                      ORDERS
                    </div>
                  </div>

                  <div className="space-y-0.5 pt-0.5 text-[8px] font-mono">
                    <div className="flex items-center gap-1 text-emerald-400">
                      <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>PACKING</span>
                    </div>
                    <div className="flex items-center gap-1 text-cyan-300">
                      <span className="size-1.5 rounded-full bg-cyan-400" />
                      <span>SHIPPED</span>
                    </div>
                    <div className="flex items-center gap-1 text-purple-400">
                      <span className="size-1.5 rounded-full bg-purple-400" />
                      <span>PENDING</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Indicator */}
              <div className="mt-1.5 pt-1 border-t border-cyan-500/15 flex items-center justify-between text-[8px] font-mono relative z-10">
                <span className="text-slate-400">ORDERS LIVE:</span>
                <span className="text-cyan-300 font-bold flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-cyan-400 animate-ping" />
                  124 ACTIVE
                </span>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------------------- */}
          {/* FLOATING CARD 3: GATE SECURITY (Top-Right)                                */}
          {/* ------------------------------------------------------------------------- */}
          <div
            onClick={() => setSelectedPart("gate")}
            onMouseEnter={() => setHoveredPart("gate")}
            onMouseLeave={() => setHoveredPart(null)}
            className={`absolute top-[4.5%] right-[4%] w-[23%] z-30 cursor-pointer pointer-events-auto transition-all duration-300 ${
              activeAnimations ? "floating-hologram-3" : ""
            } ${
              selectedPart === "gate" || hoveredPart === "gate"
                ? "scale-[1.04] ring-2 ring-emerald-400 z-40"
                : ""
            }`}
            style={{
              transform:
                hoveredPart === "gate"
                  ? "translateY(-12px) translateZ(88px) scale(1.04)"
                  : undefined,
            }}
          >
            {/* Ground Shadow */}
            <div className="absolute -inset-3 bg-emerald-950/70 rounded-2xl filter blur-xl pointer-events-none -z-10 floating-ground-shadow" />

            <div className="hud-glass hud-glass-hover hud-card-breathe rounded-xl p-2.5 sm:p-3 text-white relative overflow-hidden">
              {/* Shimmer Light Bar */}
              <div className="absolute inset-x-0 h-10 bg-gradient-to-b from-transparent via-emerald-400/10 to-transparent pointer-events-none shimmer-scanline" />

              {/* Card Window Header */}
              <div className="flex items-center justify-between border-b border-cyan-500/20 pb-1.5 mb-2 relative z-10">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="size-3 text-emerald-400 animate-pulse" />
                  GATE SECURITY
                </span>
                <div className="flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="size-1.5 rounded-full bg-emerald-400/60" />
                </div>
              </div>

              {/* Status Graphic & Icons */}
              <div className="flex items-center justify-between gap-2 pb-1.5 relative z-10">
                <div className="space-y-1">
                  <div className="text-[9px] font-mono text-slate-300 flex items-center gap-1">
                    <Check className="size-2.5 text-emerald-400" />
                    <span>T-041 (VERIFIED)</span>
                  </div>
                  <div className="text-[9px] font-mono text-slate-400 flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-amber-400" />
                    <span>T-045 (IN QUEUE)</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1 p-1 rounded-md bg-slate-900/80 border border-slate-800">
                  <Lock className="size-2.5 text-cyan-400" />
                  <Truck className="size-2.5 text-emerald-400" />
                  <ShieldCheck className="size-2.5 text-emerald-400" />
                  <span className="size-2.5 rounded-full bg-cyan-400/40 flex items-center justify-center text-[7px]">
                    ✓
                  </span>
                </div>
              </div>

              {/* Check-ins Summary */}
              <div className="mt-1 pt-1.5 border-t border-cyan-500/15 flex items-center justify-between text-[9px] font-mono relative z-10">
                <div>
                  <div className="text-slate-400 text-[8px]">CHECK-INS</div>
                  <div className="font-bold text-white flex items-center gap-1">
                    <Truck className="size-2.5 text-cyan-400" />3 Trucks
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-slate-400 text-[8px]">OUT</div>
                  <div className="font-bold text-emerald-400">1 OUT</div>
                </div>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------------------- */}
          {/* FLOATING CARD 4: GATE 3 INBOUND CCTV FEED (Bottom-Left)                   */}
          {/* ------------------------------------------------------------------------- */}
          <div
            onClick={() => setSelectedPart("gate")}
            onMouseEnter={() => setHoveredPart("gate")}
            onMouseLeave={() => setHoveredPart(null)}
            className={`absolute bottom-[10%] left-[3%] w-[21%] z-30 cursor-pointer pointer-events-auto transition-all duration-300 ${
              activeAnimations ? "floating-hologram-4" : ""
            } ${
              selectedPart === "gate" || hoveredPart === "gate"
                ? "scale-[1.04] ring-2 ring-cyan-400 z-40"
                : ""
            }`}
            style={{
              transform:
                hoveredPart === "gate"
                  ? "translateY(-12px) translateZ(100px) scale(1.04)"
                  : undefined,
            }}
          >
            {/* Ground Shadow */}
            <div className="absolute -inset-3 bg-cyan-950/70 rounded-2xl filter blur-xl pointer-events-none -z-10 floating-ground-shadow" />

            <div className="hud-glass hud-glass-hover hud-card-breathe rounded-xl p-2.5 sm:p-3 text-white relative overflow-hidden">
              {/* Shimmer Light Bar */}
              <div className="absolute inset-x-0 h-10 bg-gradient-to-b from-transparent via-cyan-400/10 to-transparent pointer-events-none shimmer-scanline" />

              {/* Header */}
              <div className="flex items-center justify-between border-b border-cyan-500/20 pb-1.5 mb-2 relative z-10">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1">
                  <Truck className="size-3 text-cyan-400 animate-pulse" />
                  GATE 3 CAM FEED
                </span>
                <span className="text-[8px] font-mono text-emerald-400 flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" />
                  LIVE
                </span>
              </div>

              {/* Simulated Camera Window */}
              <div className="relative rounded-lg overflow-hidden bg-slate-900/90 border border-slate-800 p-2 text-center mb-1.5 relative z-10">
                <div className="flex items-center justify-between text-[8px] font-mono text-slate-400 mb-1">
                  <span>CAM-03 [GATE]</span>
                  <span className="text-rose-400 flex items-center gap-0.5">
                    <span className="size-1 rounded-full bg-rose-500 animate-ping" />
                    REC
                  </span>
                </div>
                <div className="py-2 text-[10px] font-mono text-cyan-300 font-semibold">
                  TRUCK MH-12-AB-9876
                </div>
                <div className="text-[8px] font-mono text-emerald-400">
                  ANPR MATCH: 100% · PO-9042
                </div>
              </div>

              {/* Footer Metrics */}
              <div className="flex items-center justify-between text-[9px] font-mono pt-1 border-t border-cyan-500/15 relative z-10">
                <span className="text-slate-300 flex items-center gap-1">
                  <Truck className="size-2.5 text-cyan-400" />3 Trucks In
                </span>
                <span className="text-emerald-400 font-bold">1 Out</span>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------------------- */}
          {/* FLOATING CARD 5: SCANNING STATIONS QA (Bottom-Center)                     */}
          {/* ------------------------------------------------------------------------- */}
          <div
            onClick={() => setSelectedPart("scanning")}
            onMouseEnter={() => setHoveredPart("scanning")}
            onMouseLeave={() => setHoveredPart(null)}
            className={`absolute bottom-[5%] left-[50%] w-[21%] z-30 cursor-pointer pointer-events-auto transition-all duration-300 ${
              activeAnimations ? "floating-hologram-5" : ""
            } ${
              selectedPart === "scanning" || hoveredPart === "scanning"
                ? "scale-[1.04] ring-2 ring-emerald-400 z-40"
                : ""
            }`}
            style={{
              transform:
                hoveredPart === "scanning"
                  ? "translateY(-12px) translateZ(105px) scale(1.04)"
                  : undefined,
            }}
          >
            {/* Ground Shadow */}
            <div className="absolute -inset-3 bg-emerald-950/70 rounded-2xl filter blur-xl pointer-events-none -z-10 floating-ground-shadow" />

            <div className="hud-glass hud-glass-hover hud-card-breathe rounded-xl p-2.5 sm:p-3 text-white relative overflow-hidden">
              {/* Shimmer Light Bar */}
              <div className="absolute inset-x-0 h-10 bg-gradient-to-b from-transparent via-emerald-400/10 to-transparent pointer-events-none shimmer-scanline" />

              {/* Header */}
              <div className="flex items-center justify-between border-b border-cyan-500/20 pb-1.5 mb-2 relative z-10">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                  <QrCode className="size-3 text-emerald-400 animate-pulse" />
                  SCANNING STATIONS
                </span>
                <div className="flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="size-1.5 rounded-full bg-emerald-400/60" />
                </div>
              </div>

              {/* Body */}
              <div className="space-y-1.5 relative z-10">
                <div className="flex items-center justify-between text-[9px] font-mono">
                  <span className="text-slate-400">WORKER:</span>
                  <span className="text-white font-bold">2341-9876</span>
                </div>

                <div className="rounded-md bg-emerald-950/50 border border-emerald-500/40 p-1 text-center">
                  <div className="text-[8px] font-mono text-emerald-400 uppercase">
                    VALIDATION
                  </div>
                  <div className="text-[10px] font-bold text-emerald-300 flex items-center justify-center gap-1">
                    <CheckCircle2 className="size-3 text-emerald-400 animate-bounce" />
                    SUCCESS
                  </div>
                </div>

                <div className="flex items-center justify-between text-[8px] font-mono text-slate-400 pt-0.5">
                  <span className="flex items-center gap-0.5">
                    <span className="size-1 rounded-full bg-cyan-400 animate-ping" /> DATA
                  </span>
                  <span>DK02</span>
                  <span>DK03</span>
                  <span>DK04</span>
                </div>
              </div>

              {/* Scan Trigger Button */}
              <div className="mt-2 pt-1 border-t border-cyan-500/15 flex items-center justify-between text-[8px] font-mono relative z-10">
                <span className="text-cyan-300">BATCH: B-9041</span>
                <span className="text-emerald-400 font-semibold">100% QA OK</span>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------------------------- */}
          {/* FLOATING CARD 6: WAREHOUSE ANALYTICS (Bottom-Right)                       */}
          {/* ------------------------------------------------------------------------- */}
          <div
            onClick={() => setSelectedPart("analytics")}
            onMouseEnter={() => setHoveredPart("analytics")}
            onMouseLeave={() => setHoveredPart(null)}
            className={`absolute bottom-[6%] right-[3%] w-[23%] z-30 cursor-pointer pointer-events-auto transition-all duration-300 ${
              activeAnimations ? "floating-hologram-6" : ""
            } ${
              selectedPart === "analytics" || hoveredPart === "analytics"
                ? "scale-[1.04] ring-2 ring-cyan-400 z-40"
                : ""
            }`}
            style={{
              transform:
                hoveredPart === "analytics"
                  ? "translateY(-12px) translateZ(92px) scale(1.04)"
                  : undefined,
            }}
          >
            {/* Ground Shadow */}
            <div className="absolute -inset-3 bg-cyan-950/70 rounded-2xl filter blur-xl pointer-events-none -z-10 floating-ground-shadow" />

            <div className="hud-glass hud-glass-hover hud-card-breathe rounded-xl p-2.5 sm:p-3 text-white relative overflow-hidden">
              {/* Shimmer Light Bar */}
              <div className="absolute inset-x-0 h-10 bg-gradient-to-b from-transparent via-cyan-400/10 to-transparent pointer-events-none shimmer-scanline" />

              {/* Header */}
              <div className="flex items-center justify-between border-b border-cyan-500/20 pb-1.5 mb-2 relative z-10">
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1">
                  <BarChart3 className="size-3 text-cyan-400 animate-pulse" />
                  WAREHOUSE ANALYTICS
                </span>
                <div className="flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-cyan-400 animate-ping" />
                  <span className="size-1.5 rounded-full bg-cyan-400/60" />
                </div>
              </div>

              {/* Top Row: Circular Efficiency Radial + Picking Velocity + Heatmap Matrix */}
              <div className="grid grid-cols-12 gap-1.5 items-center mb-2 relative z-10">
                {/* Efficiency Circular Progress */}
                <div className="col-span-5 flex flex-col items-center">
                  <div className="relative size-11 flex items-center justify-center">
                    <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                      <path
                        className="text-slate-800"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-cyan-400"
                        strokeDasharray="94.2, 100"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        filter="drop-shadow(0 0 4px #06b6d4)"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center justify-center">
                      <span className="text-[10px] font-black text-white font-mono leading-none">
                        94.2%
                      </span>
                    </div>
                  </div>
                  <span className="text-[7px] font-mono text-slate-400 uppercase mt-0.5">
                    EFFICIENCY
                  </span>
                </div>

                {/* Picking Velocity */}
                <div className="col-span-4 text-center">
                  <div className="text-xs font-black text-white font-mono leading-tight">
                    1,021
                  </div>
                  <div className="text-[7px] font-mono text-slate-400 leading-tight">
                    UNITS/HR
                  </div>
                </div>

                {/* Top Items Heatmap Grid */}
                <div className="col-span-3 flex flex-col items-center">
                  <div className="grid grid-cols-3 gap-0.5">
                    {[0.9, 0.4, 0.8, 0.3, 0.95, 0.6, 0.85, 0.5, 0.7].map((val, i) => (
                      <div
                        key={i}
                        className="size-2 rounded-[1px] transition-opacity"
                        style={{
                          backgroundColor: i % 2 === 0 ? "#06b6d4" : "#a855f7",
                          opacity: val,
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-[6px] font-mono text-slate-400 uppercase mt-0.5">
                    TOP ITEMS
                  </span>
                </div>
              </div>

              {/* Heatmaps Wave Graph */}
              <div className="pt-1 border-t border-cyan-500/15 relative z-10">
                <div className="flex items-center justify-between text-[7px] font-mono text-slate-400 mb-0.5">
                  <span>HEATMAPS</span>
                  <span className="text-cyan-300">SLA: NOMINAL</span>
                </div>
                <svg viewBox="0 0 160 35" className="w-full h-6 overflow-visible">
                  <path
                    d="M 0 25 Q 30 5 60 20 T 120 10 T 160 18"
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="1.8"
                    filter="drop-shadow(0 0 3px #06b6d4)"
                  />
                  <path
                    d="M 0 30 Q 30 18 60 28 T 120 22 T 160 25"
                    fill="none"
                    stroke="#a855f7"
                    strokeWidth="1.2"
                    strokeDasharray="2 2"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Interactive Controls */}
        {showControls && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBarrierOpen(!barrierOpen)}
                className="h-7 px-2.5 text-[11px] rounded-lg border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/50 gap-1.5 cursor-pointer font-semibold"
              >
                <ShieldCheck className="size-3" />
                Gate 3 Barrier: {barrierOpen ? "LIFTED" : "LOWERED"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setScanPulseCount((c) => c + 1)}
                className="h-7 px-2.5 text-[11px] rounded-lg border-cyan-500/30 text-cyan-300 hover:bg-cyan-950/50 gap-1.5 cursor-pointer font-semibold"
              >
                <QrCode className="size-3" />
                Trigger QR Scan #{scanPulseCount + 1}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setFloatIntensity(floatIntensity === "lively" ? "calm" : "lively")}
                className={`h-7 px-2.5 text-[11px] rounded-lg border gap-1.5 cursor-pointer font-semibold transition-all ${
                  floatIntensity === "lively"
                    ? "border-cyan-400/80 text-cyan-300 bg-cyan-950/50 shadow-xs"
                    : "border-slate-800 text-slate-400"
                }`}
              >
                <Sparkles className="size-3 text-cyan-400" />
                Float: {floatIntensity === "lively" ? "VIVID LEVITATION" : "CALM DRIFT"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setParallaxEnabled(!parallaxEnabled)}
                className={`h-7 px-2.5 text-[11px] rounded-lg gap-1.5 transition-all cursor-pointer ${
                  parallaxEnabled
                    ? "border-cyan-500/60 text-cyan-300 bg-cyan-950/30"
                    : "border-slate-800 text-slate-400"
                }`}
              >
                <Compass className="size-3" />
                3D Parallax: {parallaxEnabled ? "ACTIVE" : "PAUSED"}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-mono hidden md:inline-block">
                Cards float & react in real 3D space
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFullModalOpen(true)}
                className="h-7 px-2.5 text-[11px] rounded-lg text-primary border-primary/30 hover:bg-primary/10 gap-1.5 font-semibold cursor-pointer"
              >
                <Maximize2 className="size-3" />
                Expand View
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Detailed Subsystem Telemetry Card (When user selects a specific part) */}
      {activePartData && (
        <div className="rounded-xl border border-cyan-500/30 bg-slate-950/90 backdrop-blur-md p-4 space-y-3 text-left animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                  {activePartData.category}
                </span>
                <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-400/40 text-[10px]">
                  {activePartData.badge}
                </Badge>
              </div>
              <h3 className="text-base font-bold text-white mt-0.5">
                {activePartData.name}
              </h3>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                Status: {activePartData.liveStatus}
              </span>
              <button
                onClick={() => setSelectedPart("all")}
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close part details"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            {activePartData.description}
          </p>

          {/* Subsystem Live Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            {activePartData.metrics.map((m, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/60 space-y-1"
              >
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {m.label}
                </div>
                <div className="text-sm font-bold text-white font-mono">{m.value}</div>
                <div className="text-[10px] text-cyan-400/80">{m.sub}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fullscreen High-Resolution Inspection Modal */}
      <Dialog open={fullModalOpen} onOpenChange={setFullModalOpen}>
        <DialogContent className="max-w-6xl w-[95vw] p-4 sm:p-6 bg-slate-950 border-cyan-500/40 text-slate-100 shadow-2xl">
          <DialogHeader className="pb-3 border-b border-slate-800 flex flex-row items-center justify-between">
            <div className="space-y-1 text-left">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                  <Boxes className="size-5 text-cyan-400" />
                  NexusWMS — Autonomous Warehouse 3D Digital Twin
                </DialogTitle>
                <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-400/30 text-[10px]">
                  ENTERPRISE SCHEMATIC
                </Badge>
              </div>
              <p className="text-xs text-slate-400">
                Independent 3D floating telemetry parts: gate access, sorting conveyor, optical scanning, storage racks, and operational analytics.
              </p>
            </div>
          </DialogHeader>

          {/* Full Screen Viewport */}
          <div className="relative mt-2 rounded-xl overflow-hidden border border-cyan-500/30 bg-slate-900">
            <img
              src="/images/nexus-warehouse-base.jpg"
              alt="NexusWMS Full Warehouse Operations"
              className="w-full h-auto object-contain max-h-[70vh]"
            />
          </div>

          {/* Part-Wise Quick Switcher in Modal */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-3 border-t border-slate-800 text-left">
            {Object.values(FACILITY_PARTS).map((p) => (
              <div
                key={p.id}
                onClick={() => {
                  setSelectedPart(p.id);
                  setFullModalOpen(false);
                }}
                className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                  selectedPart === p.id
                    ? "bg-cyan-950/70 border-cyan-400 text-white"
                    : "bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700"
                }`}
              >
                <div className="text-[9px] uppercase font-bold text-cyan-400">{p.badge}</div>
                <div className="text-xs font-semibold truncate text-white mt-0.5">{p.name}</div>
                <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
                  {p.metrics[0]?.value}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
