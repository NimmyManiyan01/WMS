import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  Factory,
  FileCheck2,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Truck,
  Warehouse,
  Layers,
  Network,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getDefaultRouteForUser, getUserInfo, isAuthenticated } from "@/lib/auth-utils";
import logoUrl from "@/assets/Logo.png";

export const Route = createFileRoute("/")({
  component: HomePage,
});

type FlowModule = {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  route: string;
  description: string;
  icon: typeof Truck;
  badge: string;
  metric: string;
  x: number;
  y: number;
};

const flowModules: FlowModule[] = [
  {
    id: "gate-entry",
    number: "01",
    title: "Gate Entry",
    subtitle: "Inbound Security & Vehicle Logging",
    route: "/gate-entry",
    description: "Inbound trucks arrive at perimeter security. Drivers, vehicle registration, ASN, and PO documents are verified and logged.",
    icon: ShieldCheck,
    badge: "Security Checkpoint",
    metric: "18 Vehicles in Queue",
    x: 150,
    y: 200,
  },
  {
    id: "grn",
    number: "02",
    title: "GRN & Receiving",
    subtitle: "Goods Receipt & Quality Inspection",
    description: "Cargo is unloaded at designated dock bays. Items are inspected and Goods Receipt Notes (GRNs) are posted.",
    icon: FileCheck2,
    badge: "Receiving Dock",
    metric: "126 GRNs Posted Today",
    x: 450,
    y: 120,
  },
  {
    id: "putaway",
    number: "03",
    title: "Store / Putaway",
    subtitle: "Algorithmic Bin Placement & Zoning",
    description: "Accepted inventory is routed via putaway tasks into optimal store zones and racks with QR location tags.",
    icon: PackageCheck,
    badge: "Storage Engine",
    metric: "31 Putaway Tasks Active",
    x: 750,
    y: 220,
  },
  {
    id: "inventory",
    number: "04",
    title: "Inventory Control",
    subtitle: "Real-Time Stock Ledgers & Balances",
    description: "Stock levels update instantly across available, allocated, and quarantined bins for complete visibility.",
    icon: Boxes,
    badge: "Stock Ledger",
    metric: "99.8% Accuracy Rate",
    x: 1050,
    y: 140,
  },
  {
    id: "assembly",
    number: "05",
    title: "Assembly & Production",
    subtitle: "Material Requisitions & Work Orders",
    description: "Raw materials are issued to assembly work orders. Production lines consume components and track finished goods.",
    icon: Factory,
    badge: "Manufacturing Line",
    metric: "14 Active Work Orders",
    x: 1350,
    y: 240,
  },
  {
    id: "dispatch",
    number: "06",
    title: "Dispatch & Gate Exit",
    subtitle: "Outbound Logistics & Final Clearance",
    description: "Finished products are loaded onto outbound trucks. Security reviews dispatch documentation and grants final gate exit.",
    icon: Truck,
    badge: "Outbound Gate",
    metric: "07 Trucks Cleared Today",
    x: 1650,
    y: 150,
  },
];

function HomePage() {
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState<number>(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const loggedIn = isAuthenticated();
  const userInfo = getUserInfo();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth - 0.5) * 20; // -10deg to 10deg
      const y = (e.clientY / innerHeight - 0.5) * -20;
      setMousePos({ x, y });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const current = flowModules[activeModule];

  const goToDashboard = () => {
    if (loggedIn) {
      navigate({ to: getDefaultRouteForUser(userInfo) as any });
    } else {
      navigate({ to: "/login" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-x-hidden selection:bg-blue-600 selection:text-white font-sans">
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <button
            type="button"
            onClick={goToDashboard}
            className="flex items-center gap-3 text-left group"
          >
            <span className="grid h-10 w-28 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/10 p-1 ring-1 ring-white/20">
              <img src={logoUrl} alt="Logo" className="h-full w-full object-contain brightness-0 invert" />
            </span>
            <div>
              <span className="block text-xs font-bold tracking-tight text-white">NexusWMS</span>
              <span className="block text-[10px] text-blue-400 font-mono">3D Interactive Flow OS</span>
            </div>
          </button>

          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate({ to: "/login" })} className="text-white hover:bg-white/10 text-xs font-bold">
              Sign In
            </Button>
            <Button onClick={goToDashboard} className="bg-blue-600 hover:bg-blue-500 text-white shadow-glow rounded-xl text-xs font-bold px-5">
              {loggedIn ? "Dashboard" : "Launch App"} <ArrowRight className="size-3.5 ml-1.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main 3D Perspective Interconnected Canvas */}
      <main className="relative min-h-screen pt-28 pb-16 px-6 flex flex-col justify-between overflow-hidden">
        {/* Background Radial Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(37,99,235,0.22),transparent_70%)] pointer-events-none" />

        {/* Hero Title & Description */}
        <div className="relative z-10 max-w-4xl mx-auto text-center mb-8">
          <Badge className="mb-3 border-blue-500/30 bg-blue-500/10 text-blue-400 px-4 py-1 text-xs font-bold uppercase tracking-widest backdrop-blur-md">
            <Sparkles className="size-3.5 inline mr-1.5" />
            3D Interconnected Workflow Story
          </Badge>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Logistics Flow in <br />
            <span className="bg-gradient-to-r from-blue-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent">
              Interconnected 3D Space
            </span>
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
            Click on any module below to inspect its operational data and pulse glowing signals through the pipeline network.
          </p>
        </div>

        {/* 3D Perspective Interactive Flow Stage */}
        <div
          className="relative z-10 w-full max-w-6xl mx-auto my-auto transition-transform duration-200 ease-out"
          style={{
            perspective: "1200px",
            transform: `rotateX(${mousePos.y}deg) rotateY(${mousePos.x}deg)`,
          }}
        >
          <div className="relative h-[480px] w-full rounded-3xl border border-white/15 bg-slate-900/60 p-8 shadow-2xl backdrop-blur-2xl overflow-hidden flex items-center">

            {/* SVG Interconnecting Pipeline Network in Background */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 1800 400"
              fill="none"
              preserveAspectRatio="none"
            >
              {/* Main Pipeline Trunk */}
              <path
                d="M 150 200 C 300 80, 300 320, 450 120 C 600 -80, 600 420, 750 220 C 900 20, 900 380, 1050 140 C 1200 -60, 1200 460, 1350 240 C 1500 20, 1500 380, 1650 150"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="8"
                strokeLinecap="round"
              />
              {/* Active Flow Pulse Path */}
              <path
                d="M 150 200 C 300 80, 300 320, 450 120 C 600 -80, 600 420, 750 220 C 900 20, 900 380, 1050 140 C 1200 -60, 1200 460, 1350 240 C 1500 20, 1500 380, 1650 150"
                stroke="url(#pipelineGlow)"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray="20 10"
                className="animate-pulse"
                style={{ filter: "drop-shadow(0 0 12px rgba(59, 130, 246, 0.9))" }}
              />
              <defs>
                <linearGradient id="pipelineGlow" x1="0" y1="0" x2="1800" y2="0" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#3b82f6" />
                  <stop offset="0.33" stopColor="#06b6d4" />
                  <stop offset="0.66" stopColor="#10b981" />
                  <stop offset="1" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </svg>

            {/* Floating 3D Node Cards */}
            <div className="relative z-10 w-full flex justify-between items-center gap-4 px-6 overflow-x-auto py-8">
              {flowModules.map((mod, idx) => {
                const Icon = mod.icon;
                const isActive = activeModule === idx;
                return (
                  <div
                    key={mod.id}
                    onClick={() => setActiveModule(idx)}
                    className={`cursor-pointer group relative shrink-0 w-64 rounded-3xl border p-6 transition-all duration-500 backdrop-blur-xl transform ${
                      isActive
                        ? "border-blue-500 bg-slate-900/90 shadow-2xl shadow-blue-500/30 scale-105 -translate-y-3 ring-4 ring-blue-500/30"
                        : "border-white/15 bg-slate-900/40 hover:bg-slate-900/70 hover:scale-102"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs font-mono font-bold text-blue-400">{mod.number}</span>
                      <span className={`grid size-12 place-items-center rounded-2xl border transition-transform group-hover:scale-110 ${
                        isActive ? "bg-blue-600 text-white border-blue-400 shadow-glow" : "bg-white/5 text-slate-400 border-white/10"
                      }`}>
                        <Icon className="size-6" />
                      </span>
                    </div>

                    <h3 className="font-bold text-white text-lg mb-1">{mod.title}</h3>
                    <p className="text-xs text-slate-400 line-clamp-2 mb-4">{mod.description}</p>

                    <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                      <span className="text-[10px] font-mono text-emerald-400 font-semibold">{mod.metric}</span>
                      <ArrowRight className={`size-4 transition-transform ${isActive ? "text-blue-400 translate-x-1" : "text-slate-500"}`} />
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>

        {/* Active Module Detail Spotlight Footer */}
        <div className="relative z-10 max-w-5xl mx-auto w-full mt-8 rounded-3xl border border-white/15 bg-slate-950/80 p-8 shadow-2xl backdrop-blur-2xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="size-16 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0 shadow-glow">
              <current.icon className="size-8" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-[10px] font-bold font-mono uppercase">
                  {current.badge}
                </Badge>
                <span className="text-xs font-mono text-slate-400">{current.route}</span>
              </div>
              <h2 className="text-2xl font-bold text-white">{current.title}</h2>
              <p className="text-sm text-slate-300 mt-1">{current.description}</p>
            </div>
          </div>
          <Button
            onClick={() => navigate({ to: current.route as any })}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl px-8 h-12 shadow-glow shrink-0"
          >
            Launch {current.title} <ArrowRight className="size-4 ml-2" />
          </Button>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-slate-950 py-8 text-center text-xs text-slate-500 relative z-10">
        <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Kaizentrix Global Solutions. NexusWMS Enterprise Logistics OS.</p>
          <p className="font-mono">Interconnected 3D Flow • Gate • GRN • Putaway • Inventory • Assembly • Dispatch</p>
        </div>
      </footer>
    </div>
  );
}
