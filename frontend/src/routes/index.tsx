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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getDefaultRouteForUser, getUserInfo, isAuthenticated } from "@/lib/auth-utils";
import logoUrl from "@/assets/Logo.png";

export const Route = createFileRoute("/")({
  component: HomePage,
});

type FlowMilestone = {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  route: string;
  description: string;
  icon: typeof Truck;
  badge: string;
  metric: string;
};

const milestones: FlowMilestone[] = [
  {
    id: "gate-entry",
    number: "01",
    title: "Gate Entry",
    subtitle: "Inbound Security & Vehicle Logging",
    route: "/gate-entry",
    description: "Inbound trucks arrive at perimeter security. Drivers, vehicle registration, ASN, and PO documents are verified and logged into the active gate queue.",
    icon: ShieldCheck,
    badge: "Security Checkpoint",
    metric: "18 Vehicles in Queue",
  },
  {
    id: "grn",
    number: "02",
    title: "GRN & Receiving",
    subtitle: "Goods Receipt & Quality Inspection",
    description: "Cargo is unloaded at designated dock bays. Items are inspected for defects, quantities are verified against POs, and Goods Receipt Notes (GRNs) are posted.",
    icon: FileCheck2,
    badge: "Receiving Dock",
    metric: "126 GRNs Posted Today",
  },
  {
    id: "putaway",
    number: "03",
    title: "Store / Putaway",
    subtitle: "Algorithmic Bin Placement & Zoning",
    description: "Accepted inventory is routed via putaway tasks into optimal store zones and racks, generating QR location tags for precise traceability.",
    icon: PackageCheck,
    badge: "Storage Engine",
    metric: "31 Putaway Tasks Active",
  },
  {
    id: "inventory",
    number: "04",
    title: "Inventory Control",
    subtitle: "Real-Time Stock Ledgers & Balances",
    description: "Stock levels update instantly across available, allocated, and quarantined bins, providing complete multi-warehouse visibility.",
    icon: Boxes,
    badge: "Stock Ledger",
    metric: "99.8% Accuracy Rate",
  },
  {
    id: "assembly",
    number: "05",
    title: "Assembly & Production",
    subtitle: "Material Requisitions & Work Orders",
    description: "Raw materials are issued to assembly work orders. Production lines consume components and track finished goods output seamlessly.",
    icon: Factory,
    badge: "Manufacturing Line",
    metric: "14 Active Work Orders",
  },
  {
    id: "dispatch",
    number: "06",
    title: "Dispatch & Gate Exit",
    subtitle: "Outbound Logistics & Final Clearance",
    description: "Finished products are loaded onto outbound trucks. Security reviews dispatch documentation and grants final gate exit clearance.",
    icon: Truck,
    badge: "Outbound Gate",
    metric: "07 Trucks Cleared Today",
  },
];

const svgPathString = "M 200 100 Q 600 200, 1000 150 T 1800 200 T 2600 150 T 3400 200";

function HomePage() {
  const navigate = useNavigate();
  const pathRef = useRef<SVGPathElement | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeMilestone, setActiveMilestone] = useState(0);
  const [truckPos, setTruckPos] = useState({ x: 200, y: 100 });
  const loggedIn = isAuthenticated();
  const userInfo = getUserInfo();

  useEffect(() => {
    const handleScroll = () => {
      const container = document.getElementById("story-container");
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const totalScrollable = rect.height - windowHeight;
      if (totalScrollable <= 0) return;

      const currentScroll = -rect.top;
      const progress = Math.min(Math.max(currentScroll / totalScrollable, 0), 1);

      setScrollProgress(progress);

      const pathEl = pathRef.current;
      if (pathEl) {
        const length = pathEl.getTotalLength();
        const point = pathEl.getPointAtLength(progress * length);
        setTruckPos({ x: point.x, y: point.y });
      }

      const activeIdx = Math.min(
        milestones.length - 1,
        Math.floor(progress * milestones.length + 0.05)
      );
      setActiveMilestone(activeIdx);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const current = milestones[activeMilestone];

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
              <span className="block text-[10px] text-blue-400 font-mono">Cinematic Story Tracker</span>
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

      {/* Hero Intro */}
      <section className="relative pt-32 pb-16 text-center px-6 border-b border-white/10 bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.2),transparent_60%)]" />
        <div className="relative z-10 max-w-4xl mx-auto">
          <Badge className="mb-4 border-blue-500/30 bg-blue-500/10 text-blue-400 px-4 py-1 text-xs font-bold uppercase tracking-widest">
            <Sparkles className="size-3.5 inline mr-1.5" />
            Scroll-Driven SVG Truck Storyline
          </Badge>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl leading-tight">
            The Supply Chain Journey <br />
            <span className="bg-gradient-to-r from-blue-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent">
              In Motion
            </span>
          </h1>
          <p className="mt-4 text-base text-slate-400 sm:text-lg max-w-2xl mx-auto">
            Scroll down to drive the delivery truck along the live SVG path tracker. Watch the operational story unfold dynamically across all 6 core checkpoints.
          </p>
        </div>
      </section>

      {/* Scrollable Story Journey Container (Extra height enables smooth sticky scroll scrubbing) */}
      <div id="story-container" className="relative h-[400vh] bg-slate-950">
        <div className="sticky top-0 h-screen w-full overflow-hidden flex flex-col justify-between pt-24 pb-12 px-6 lg:px-16">

          {/* Background SVG Path Tracker with Moving Truck */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
            <svg
              className="w-[120%] h-[600px] overflow-visible"
              viewBox="0 0 3600 300"
              fill="none"
              preserveAspectRatio="xMidYMid slice"
            >
              {/* Background Track */}
              <path
                d={svgPathString}
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="16"
                strokeLinecap="round"
              />
              {/* Glowing Progress Path */}
              <path
                ref={pathRef}
                d={svgPathString}
                stroke="url(#truckPathGradient)"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray="4000"
                strokeDashoffset={4000 - scrollProgress * 4000}
                style={{ filter: "drop-shadow(0 0 20px rgba(59, 130, 246, 0.8))" }}
              />
              <defs>
                <linearGradient id="truckPathGradient" x1="0" y1="0" x2="3600" y2="0" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#3b82f6" />
                  <stop offset="0.33" stopColor="#06b6d4" />
                  <stop offset="0.66" stopColor="#10b981" />
                  <stop offset="1" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>

              {/* Moving Truck Icon Group on Path */}
              <g transform={`translate(${truckPos.x}, ${truckPos.y}) scale(1.8)`}>
                <circle r="22" fill="#3b82f6" opacity="0.3" className="animate-ping" />
                <circle r="16" fill="#1e293b" stroke="#3b82f6" strokeWidth="3" />
                {/* Truck SVG Graphic */}
                <path
                  d="M-8 -4 H4 V4 H-8 Z M4 -2 H8 V4 H4 Z"
                  fill="#3b82f6"
                />
                <circle cx="-5" cy="5" r="2.5" fill="#ffffff" />
                <circle cx="6" cy="5" r="2.5" fill="#ffffff" />
              </g>
            </svg>
          </div>

          {/* Top Stage Indicators */}
          <div className="relative z-10 max-w-7xl mx-auto w-full flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl font-black font-mono text-blue-400">{current.number}</span>
              <div>
                <p className="text-xs font-mono uppercase tracking-widest text-slate-400">Checkpoint</p>
                <p className="text-sm font-bold text-white">{current.badge}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {milestones.map((m, idx) => (
                <div
                  key={m.id}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx === activeMilestone ? "w-10 bg-blue-500 shadow-glow" : "w-2 bg-white/20"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Center Dynamic Story Content Overlay */}
          <div className="relative z-10 max-w-5xl mx-auto w-full my-auto text-center px-4">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-wider mb-6 backdrop-blur-md">
              <current.icon className="size-4" />
              {current.subtitle}
            </div>

            <h2 className="text-5xl sm:text-7xl font-black tracking-tight text-white mb-6 transition-all duration-500">
              {current.title}
            </h2>

            <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed transition-all duration-500">
              {current.description}
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Badge className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 text-sm px-4 py-2 font-mono font-bold">
                <CheckCircle2 className="size-4 inline mr-2 text-emerald-400" />
                {current.metric}
              </Badge>
              <Button
                onClick={() => navigate({ to: current.route as any })}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl px-6 h-12 shadow-glow"
              >
                Explore {current.title} Module <ArrowRight className="size-4 ml-2" />
              </Button>
            </div>
          </div>

          {/* Bottom Roadmap Navigation Summary */}
          <div className="relative z-10 max-w-7xl mx-auto w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {milestones.map((m, idx) => {
              const Icon = m.icon;
              const isActive = idx === activeMilestone;
              return (
                <div
                  key={m.id}
                  className={`rounded-2xl border p-4 backdrop-blur-xl transition-all duration-300 ${
                    isActive
                      ? "border-blue-500 bg-blue-600/20 shadow-lg shadow-blue-500/20"
                      : "border-white/10 bg-slate-900/40 opacity-60"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold text-slate-400">{m.number}</span>
                    <Icon className={`size-4 ${isActive ? "text-blue-400" : "text-slate-500"}`} />
                  </div>
                  <p className="text-xs font-bold text-white truncate">{m.title}</p>
                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-slate-950 py-10 text-center text-xs text-slate-500 relative z-10">
        <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Kaizentrix Global Solutions. NexusWMS Enterprise Logistics OS.</p>
          <p className="font-mono">Gate Entry • GRN • Putaway • Inventory • Assembly • Dispatch</p>
        </div>
      </footer>
    </div>
  );
}
