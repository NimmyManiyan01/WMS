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
import truckGateUrl from "@/assets/truck-gate.jpg";
import truckRearUrl from "@/assets/truck-rear.jpg";
import driverUrl from "@/assets/driver.jpg";

export const Route = createFileRoute("/")({
  component: HomePage,
});

type StoryStep = {
  id: string;
  number: string;
  title: string;
  subtitle: string;
  route: string;
  description: string;
  icon: typeof Truck;
  image: string;
  badge: string;
  metric: string;
  align: "left" | "right";
};

const storySteps: StoryStep[] = [
  {
    id: "gate-entry",
    number: "01",
    title: "Gate Entry",
    subtitle: "Inbound Security & Vehicle Logging",
    route: "/gate-entry",
    description: "Inbound delivery trucks arrive at perimeter security. Operators capture driver details, vehicle registration, ASN, and PO documents, logging every arrival into the secure gate queue.",
    icon: ShieldCheck,
    image: truckGateUrl,
    badge: "Security Checkpoint",
    metric: "18 Vehicles in Active Queue",
    align: "left",
  },
  {
    id: "grn",
    number: "02",
    title: "GRN & Receiving",
    subtitle: "Goods Receipt & Quality Inspection",
    description: "Cargo is unloaded at designated dock bays. Items undergo rigorous quality inspection and verification against purchase orders before Goods Receipt Notes (GRNs) are posted.",
    icon: FileCheck2,
    image: driverUrl,
    badge: "Receiving Dock",
    metric: "126 GRNs Posted Today",
    align: "right",
  },
  {
    id: "putaway",
    number: "03",
    title: "Store / Putaway",
    subtitle: "Algorithmic Bin Placement & Zoning",
    description: "Accepted inventory is routed via putaway tasks into optimal store zones and storage racks, generating QR location tags for exact traceability.",
    icon: PackageCheck,
    image: truckRearUrl,
    badge: "Storage Engine",
    metric: "31 Putaway Tasks Active",
    align: "left",
  },
  {
    id: "inventory",
    number: "04",
    title: "Inventory Control",
    subtitle: "Real-Time Stock Ledgers & Balances",
    description: "Stock levels update instantly across available, allocated, and quarantined bins, providing complete multi-warehouse visibility and live ledger tracking.",
    icon: Boxes,
    image: truckGateUrl,
    badge: "Stock Ledger",
    metric: "99.8% Accuracy Rate",
    align: "right",
  },
  {
    id: "assembly",
    number: "05",
    title: "Assembly & Production",
    subtitle: "Material Requisitions & Work Orders",
    description: "Raw materials are issued to assembly work orders. Production lines consume components and track finished goods output seamlessly.",
    icon: Factory,
    image: driverUrl,
    badge: "Manufacturing Line",
    metric: "14 Active Work Orders",
    align: "left",
  },
  {
    id: "dispatch",
    number: "06",
    title: "Dispatch & Gate Exit",
    subtitle: "Outbound Logistics & Final Clearance",
    description: "Finished products are loaded onto outbound trucks. Security reviews dispatch documentation, approves outbound movement, and grants final gate exit.",
    icon: Truck,
    image: truckRearUrl,
    badge: "Outbound Gate",
    metric: "07 Trucks Cleared Today",
    align: "right",
  },
];

function HomePage() {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  const loggedIn = isAuthenticated();
  const userInfo = getUserInfo();

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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
              <span className="block text-[10px] text-blue-400 font-mono">Vertical Story Roadmap</span>
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
      <section className="relative pt-32 pb-20 text-center px-6 border-b border-white/10 bg-gradient-to-b from-slate-900 to-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.25),transparent_60%)]" />
        <div className="relative z-10 max-w-4xl mx-auto">
          <Badge className="mb-4 border-blue-500/30 bg-blue-500/10 text-blue-400 px-4 py-1 text-xs font-bold uppercase tracking-widest">
            <Sparkles className="size-3.5 inline mr-1.5" />
            Cinematic Vertical Storyline Roadmap
          </Badge>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl leading-tight">
            The Supply Chain <br />
            <span className="bg-gradient-to-r from-blue-400 via-teal-400 to-emerald-400 bg-clip-text text-transparent">
              Step-by-Step Vertical Flow
            </span>
          </h1>
          <p className="mt-4 text-base text-slate-400 sm:text-lg max-w-2xl mx-auto">
            Scroll down to journey through the end-to-end logistics lifecycle. Each module features immersive photography and sliding explanation panels tied to your scroll position.
          </p>
        </div>
      </section>

      {/* Vertical Story Roadmap Container */}
      <main className="relative max-w-7xl mx-auto px-6 py-24 space-y-32 lg:space-y-48">

        {/* Background Glowing Connecting Pipeline */}
        <div className="absolute left-1/2 top-40 bottom-40 w-1 -translate-x-1/2 hidden lg:block pointer-events-none z-0">
          <div className="h-full w-full bg-gradient-to-b from-blue-500 via-teal-400 to-emerald-500 opacity-40 shadow-glow" />
        </div>

        {storySteps.map((step, idx) => {
          const Icon = step.icon;
          const isLeft = step.align === "left";
          return (
            <div
              key={step.id}
              className={`relative z-10 flex flex-col lg:flex-row items-center gap-12 lg:gap-20 ${
                isLeft ? "lg:flex-row" : "lg:flex-row-reverse"
              }`}
            >
              {/* Image Showcase Box with 3D Tilt / Depth */}
              <div className="w-full lg:w-1/2 group">
                <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-slate-900 shadow-2xl shadow-blue-500/10 transition duration-700 group-hover:scale-102 group-hover:border-blue-500/50">
                  <div className="relative h-72 sm:h-96 w-full">
                    <img
                      src={step.image}
                      alt={step.title}
                      className="h-full w-full object-cover brightness-90 transition duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                    <div className="absolute top-6 left-6">
                      <span className="text-3xl font-black font-mono text-blue-400 tracking-wider">
                        {step.number}
                      </span>
                    </div>
                    <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
                      <Badge className="bg-blue-600/90 text-white border-blue-400/30 text-xs font-bold font-mono px-3.5 py-1">
                        {step.badge}
                      </Badge>
                      <span className="text-xs font-mono font-semibold text-emerald-400 bg-slate-950/80 px-3 py-1 rounded-full border border-white/10">
                        {step.metric}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Collapsing / Sliding Content & Explanation Panel (Left or Right) */}
              <div className="w-full lg:w-1/2">
                <div className="rounded-3xl border border-white/15 bg-slate-900/80 p-8 sm:p-10 shadow-2xl backdrop-blur-2xl transition-all duration-500 hover:border-blue-500/50">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="size-12 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center shadow-glow">
                      <Icon className="size-6" />
                    </div>
                    <div>
                      <p className="text-xs font-mono font-bold text-blue-400 uppercase tracking-widest">
                        Milestone {step.number}
                      </p>
                      <p className="text-xs text-slate-400 font-mono">{step.route}</p>
                    </div>
                  </div>

                  <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2">
                    {step.title}
                  </h2>
                  <p className="text-sm font-bold text-teal-400 font-mono mb-4">
                    {step.subtitle}
                  </p>
                  <p className="text-sm sm:text-base text-slate-300 leading-relaxed mb-8">
                    {step.description}
                  </p>

                  <div className="pt-6 border-t border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 font-mono">
                      <CheckCircle2 className="size-4" /> Live Execution Active
                    </div>
                    <Button
                      onClick={() => navigate({ to: step.route as any })}
                      className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl px-6 h-11 shadow-glow"
                    >
                      Launch {step.title} <ArrowRight className="size-3.5 ml-1.5" />
                    </Button>
                  </div>
                </div>
              </div>

            </div>
          );
        })}

      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-slate-950 py-10 text-center text-xs text-slate-500 relative z-10">
        <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Kaizentrix Global Solutions. NexusWMS Enterprise Logistics OS.</p>
          <p className="font-mono">Vertical Roadmap • Gate • GRN • Putaway • Inventory • Assembly • Dispatch</p>
        </div>
      </footer>
    </div>
  );
}
