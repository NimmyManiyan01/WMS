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
  },
];

function HomePage() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeModule, setActiveModule] = useState(0);
  const loggedIn = isAuthenticated();
  const userInfo = getUserInfo();

  useEffect(() => {
    const handleScroll = () => {
      const el = containerRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const totalScrollable = rect.height - windowHeight;
      if (totalScrollable <= 0) return;

      const currentScroll = -rect.top;
      const progress = Math.min(Math.max(currentScroll / totalScrollable, 0), 1);

      setScrollProgress(progress);
      const activeIdx = Math.min(
        flowModules.length - 1,
        Math.floor(progress * flowModules.length + 0.05)
      );
      setActiveModule(activeIdx);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
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
              <span className="block text-[10px] text-blue-400 font-mono">Horizontal Roadmap Story</span>
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

      {/* Hero Section */}
      <section className="relative pt-32 pb-12 text-center px-6 border-b border-white/10 bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.2),transparent_60%)]" />
        <div className="relative z-10 max-w-4xl mx-auto">
          <Badge className="mb-4 border-blue-500/30 bg-blue-500/10 text-blue-400 px-4 py-1 text-xs font-bold uppercase tracking-widest">
            <Sparkles className="size-3.5 inline mr-1.5" />
            Horizontal Storyline Roadmap
          </Badge>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl leading-tight">
            The Supply Chain <br />
            <span className="bg-gradient-to-r from-blue-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent">
              Horizontal Roadmap Flow
            </span>
          </h1>
          <p className="mt-4 text-base text-slate-400 sm:text-lg max-w-2xl mx-auto">
            Scroll down to scrub through the horizontal story roadmap. Watch the glowing sine-wave pipeline weave seamlessly across all 6 core logistics modules.
          </p>
        </div>
      </section>

      {/* Scrollable Horizontal Roadmap Section (300vh height for smooth vertical scroll scrubbing) */}
      <div id="horizontal-roadmap" ref={containerRef} className="relative h-[300vh] bg-slate-950">
        <div className="sticky top-0 h-screen w-full overflow-hidden flex flex-col justify-center px-6 lg:px-16">

          {/* Background Wavy Sine-Wave SVG Pipeline */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-40">
            <svg
              className="w-full h-[500px] overflow-visible"
              viewBox="0 0 2400 400"
              fill="none"
              preserveAspectRatio="none"
            >
              {/* Sine Wave Path weaving up and down */}
              <path
                d="M 0 200 Q 200 50, 400 200 T 800 200 T 1200 200 T 1600 200 T 2000 200 T 2400 200"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth="10"
                strokeLinecap="round"
              />
              <path
                d="M 0 200 Q 200 50, 400 200 T 800 200 T 1200 200 T 1600 200 T 2000 200 T 2400 200"
                stroke="url(#sineWaveGradient)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray="3000"
                strokeDashoffset={3000 - scrollProgress * 3000}
                style={{ filter: "drop-shadow(0 0 16px rgba(16, 185, 129, 0.8))" }}
              />
              <defs>
                <linearGradient id="sineWaveGradient" x1="0" y1="0" x2="2400" y2="0" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#3b82f6" />
                  <stop offset="0.33" stopColor="#06b6d4" />
                  <stop offset="0.66" stopColor="#10b981" />
                  <stop offset="1" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Horizontal Cards Container translated via scroll progress */}
          <div className="relative z-10 max-w-7xl mx-auto w-full overflow-hidden">
            <div
              className="flex items-center gap-8 transition-transform duration-100 ease-out py-10"
              style={{
                transform: `translateX(-${scrollProgress * (flowModules.length - 1) * 340}px)`,
              }}
            >
              {flowModules.map((mod, idx) => {
                const Icon = mod.icon;
                const isActive = activeModule === idx;
                return (
                  <div
                    key={mod.id}
                    onClick={() => setActiveModule(idx)}
                    className={`cursor-pointer group shrink-0 w-[320px] sm:w-[360px] rounded-3xl border p-8 transition-all duration-500 backdrop-blur-2xl transform ${
                      isActive
                        ? "border-blue-500 bg-slate-900/95 shadow-2xl shadow-blue-500/30 scale-105 ring-4 ring-blue-500/30"
                        : "border-white/15 bg-slate-900/50 hover:bg-slate-900/80 hover:scale-102"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-6">
                      <span className="text-sm font-mono font-bold text-blue-400">{mod.number}</span>
                      <span className={`grid size-14 place-items-center rounded-2xl border transition-transform group-hover:scale-110 ${
                        isActive ? "bg-blue-600 text-white border-blue-400 shadow-glow" : "bg-white/5 text-slate-400 border-white/10"
                      }`}>
                        <Icon className="size-7" />
                      </span>
                    </div>

                    <h3 className="font-extrabold text-white text-xl mb-1">{mod.title}</h3>
                    <p className="text-xs font-bold text-blue-400 font-mono mb-3">{mod.subtitle}</p>
                    <p className="text-sm text-slate-300 leading-relaxed line-clamp-3 mb-6">{mod.description}</p>

                    <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                      <span className="text-xs font-mono text-emerald-400 font-semibold">{mod.metric}</span>
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate({ to: mod.route as any });
                        }}
                        className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-glow"
                      >
                        Explore <ArrowRight className="size-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Interactive Scroll Scrubber Bar (matching reference UI) */}
          <div className="relative z-10 max-w-4xl mx-auto w-full mt-8">
            <div className="h-4 rounded-full bg-white/10 p-1 backdrop-blur-md overflow-hidden relative border border-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 via-teal-400 to-emerald-400 transition-all duration-100"
                style={{ width: `${Math.max(15, scrollProgress * 100)}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-3 text-xs text-slate-400 font-mono">
              <span>Step {activeModule + 1} of {flowModules.length}: {current.title}</span>
              <span>Scroll to scrub story roadmap</span>
            </div>
          </div>

        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-slate-950 py-10 text-center text-xs text-slate-500 relative z-10">
        <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Kaizentrix Global Solutions. NexusWMS Enterprise Logistics OS.</p>
          <p className="font-mono">Horizontal Roadmap • Gate • GRN • Putaway • Inventory • Assembly • Dispatch</p>
        </div>
      </footer>
    </div>
  );
}
