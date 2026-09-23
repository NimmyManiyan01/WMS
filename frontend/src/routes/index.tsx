import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
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

gsap.registerPlugin(ScrollTrigger);

export const Route = createFileRoute("/")({
  component: HomePage,
});

type WmsModule = {
  number: string;
  title: string;
  subtitle: string;
  description: string;
  route: string;
  image: string;
  badge: string;
  align: "left" | "right";
};

const wmsModules: WmsModule[] = [
  {
    number: "01",
    title: "Gate Entry",
    subtitle: "Perimeter Security & Inbound Logging",
    description: "Inbound delivery trucks arrive at perimeter security. Operators capture driver credentials, vehicle registration, ASN, and PO documents, logging every arrival into the secure gate queue.",
    route: "/gate-entry",
    image: truckGateUrl,
    badge: "Security Checkpoint",
    align: "right",
  },
  {
    number: "02",
    title: "Vehicle / ASN Verification",
    subtitle: "Inbound Queue & ASN Validation",
    description: "Transport documents are cross-referenced against advance shipping notices (ASNs) and purchase orders to verify inbound shipment authenticity before staging.",
    route: "/vehicle-queue",
    image: driverUrl,
    badge: "Inbound Validation",
    align: "left",
  },
  {
    number: "03",
    title: "Dock Allocation",
    subtitle: "Bay Scheduling & Yard Management",
    description: "Warehouse managers assign specific loading bays to incoming trucks based on cargo specifications, vehicle dimensions, and dock availability.",
    route: "/dock-management",
    image: truckRearUrl,
    badge: "Dock Yard",
    align: "right",
  },
  {
    number: "04",
    title: "Receiving",
    subtitle: "Cargo Unloading & Manifest Check",
    description: "Freight is systematically unloaded at assigned bays. Operators reconcile physical piece counts against delivery notes and supplier manifests.",
    route: "/grn",
    image: truckGateUrl,
    badge: "Receiving Bay",
    align: "left",
  },
  {
    number: "05",
    title: "GRN",
    subtitle: "Goods Receipt Note Generation",
    description: "Accepted inbound quantities are officially posted into Goods Receipt Notes (GRNs), updating inventory ledgers and printing QR bin labels.",
    route: "/grn",
    image: driverUrl,
    badge: "GRN Posting",
    align: "right",
  },
  {
    number: "06",
    title: "Quality Inspection / Quarantine",
    subtitle: "Defect Assessment & Hold Areas",
    description: "Damaged or non-conforming items are isolated in quarantine zones. Inspection reports are logged and suppliers are notified with photographic evidence.",
    route: "/procurement/quality-issues",
    image: truckRearUrl,
    badge: "Quality Control",
    align: "left",
  },
  {
    number: "07",
    title: "Putaway",
    subtitle: "Algorithmic Task Assignment",
    description: "Putaway tasks are dynamically generated to direct warehouse operators on optimal transport routes and bin placements for accepted items.",
    route: "/putaway-tasks",
    image: truckGateUrl,
    badge: "Putaway Engine",
    align: "right",
  },
  {
    number: "08",
    title: "Store / Storage Location",
    subtitle: "Multi-Zone Store Hierarchy",
    description: "Materials are placed into structured warehouse zones, aisles, racks, and bins optimized by item category and inventory turnover rate.",
    route: "/warehouse/stores",
    image: driverUrl,
    badge: "Store Management",
    align: "left",
  },
  {
    number: "09",
    title: "Inventory",
    subtitle: "Real-Time Stock Ledgers & Balances",
    description: "Complete visibility into available, allocated, quarantined, and reserved stock balances across all warehouse locations and materials.",
    route: "/inventory",
    image: truckRearUrl,
    badge: "Stock Ledger",
    align: "right",
  },
  {
    number: "10",
    title: "Material Request",
    subtitle: "Internal Requisitions & Approval Flow",
    description: "Production and warehouse teams raise material requests for procurement sourcing, complete with priority levels and department justification.",
    route: "/warehouse/material-requests",
    image: truckGateUrl,
    badge: "Demand Planning",
    align: "left",
  },
  {
    number: "11",
    title: "Pick",
    subtitle: "Picking Tasks & Order Fulfillment",
    description: "Store keepers receive optimized pick lists to retrieve exact quantities of raw materials and components from designated storage bins.",
    route: "/warehouse/material-requests",
    image: driverUrl,
    badge: "Order Picking",
    align: "right",
  },
  {
    number: "12",
    title: "Material Issue",
    subtitle: "Store Issuance & Handover",
    description: "Picked stock is formally issued and transferred to assembly floors, recording electronic sign-offs and updating inventory deductions.",
    route: "/warehouse/material-requests",
    image: truckRearUrl,
    badge: "Store Issuance",
    align: "left",
  },
  {
    number: "13",
    title: "Assembly / Work Order",
    subtitle: "Production Execution & Bill of Materials",
    description: "Manufacturing work orders are initiated. Operators track production steps, labor allocation, and component bills of materials.",
    route: "/assembly-work-orders",
    image: truckGateUrl,
    badge: "Assembly Floor",
    align: "right",
  },
  {
    number: "14",
    title: "Material Consumption",
    subtitle: "WIP Tracking & Stock Deductions",
    description: "Components consumed during assembly are debited from work-in-progress (WIP) stock ledgers with real-time audit trails.",
    route: "/assembly-work-orders",
    image: driverUrl,
    badge: "WIP Consumption",
    align: "left",
  },
  {
    number: "15",
    title: "Quality Inspection",
    subtitle: "In-Process & Finished Quality Checks",
    description: "Intermediate assemblies and final products undergo strict quality checks to verify adherence to engineering specifications.",
    route: "/assembly-work-orders",
    image: truckRearUrl,
    badge: "Assembly QC",
    align: "right",
  },
  {
    number: "16",
    title: "Rework / Scrap",
    subtitle: "Defect Correction & Scrap Accounting",
    description: "Failed production units are routed to rework stations or written off as scrap with mandatory supervisory approval and variance logging.",
    route: "/assembly-work-orders",
    image: truckGateUrl,
    badge: "Rework & Scrap",
    align: "left",
  },
  {
    number: "17",
    title: "Finished Goods",
    subtitle: "Production Output & Transfer to Stock",
    description: "Completed and tested finished goods are tagged, recorded as production output, and transferred into finished goods inventory zones.",
    route: "/assembly-finished-goods",
    image: driverUrl,
    badge: "Finished Goods",
    align: "right",
  },
  {
    number: "18",
    title: "Dispatch",
    subtitle: "Outbound Staging & Order Consolidation",
    description: "Finished goods are consolidated, packed, and staged at outbound loading bays in preparation for customer delivery transport.",
    route: "/vehicle-exit",
    image: truckRearUrl,
    badge: "Outbound Staging",
    align: "left",
  },
  {
    number: "19",
    title: "Vehicle Exit",
    subtitle: "Final Gate Clearance & Trip Closure",
    description: "Outbound transport undergoes final security clearance and weight verification before gate exit passes are closed and trips are completed.",
    route: "/vehicle-exit",
    image: truckGateUrl,
    badge: "Gate Exit",
    align: "right",
  },
];

function HomePage() {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
  const loggedIn = isAuthenticated();
  const userInfo = getUserInfo();

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const ctx = gsap.context(() => {
      sectionRefs.current.forEach((section, idx) => {
        if (!section) return;
        ScrollTrigger.create({
          trigger: section,
          start: "top center",
          end: "bottom center",
          onEnter: () => {
            setCurrentIndex(idx);
            setIsComplete(false);
          },
          onEnterBack: () => {
            setCurrentIndex(idx);
            setIsComplete(false);
          },
        });
      });

      // Final completion screen trigger
      const completionEl = document.getElementById("journey-complete-screen");
      if (completionEl) {
        ScrollTrigger.create({
          trigger: completionEl,
          start: "top center",
          onEnter: () => setIsComplete(true),
          onEnterBack: () => setIsComplete(true),
        });
      }
    });

    return () => ctx.revert();
  }, []);

  const goToDashboard = () => {
    if (loggedIn) {
      navigate({ to: getDefaultRouteForUser(userInfo) as any });
    } else {
      navigate({ to: "/login" });
    }
  };

  const scrollToModule = (index: number) => {
    if (index === wmsModules.length) {
      document.getElementById("journey-complete-screen")?.scrollIntoView({ behavior: "smooth" });
    } else {
      sectionRefs.current[index]?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const activeModule = wmsModules[currentIndex] || wmsModules[0];

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
              <span className="block text-[10px] text-blue-400 font-mono">Immersive Journey OS</span>
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

      {/* Fixed Side Journey Tracker / Progress Bar */}
      <div className="fixed left-6 top-1/2 -translate-y-1/2 z-40 hidden xl:flex flex-col items-center gap-3">
        <div className="h-96 w-1 bg-white/10 rounded-full relative overflow-hidden">
          <div
            className="absolute top-0 left-0 w-full bg-gradient-to-b from-blue-500 via-teal-400 to-emerald-400 transition-all duration-300"
            style={{ height: `${((currentIndex + (isComplete ? 1 : 0)) / wmsModules.length) * 100}%` }}
          />
        </div>
        <span className="text-[10px] font-mono font-bold text-slate-400">
          {isComplete ? "19/19" : `${currentIndex + 1}/19`}
        </span>
      </div>

      {/* Main Immersive Story Sections */}
      <main className="relative">
        {wmsModules.map((mod, idx) => {
          const isRight = mod.align === "right";
          return (
            <section
              key={mod.number}
              ref={(el) => (sectionRefs.current[idx] = el)}
              className="relative min-h-screen w-full flex items-center justify-center px-6 lg:px-20 py-32 overflow-hidden border-b border-white/10"
            >
              {/* Full-Screen Background Scene with Cinematic Gradient Overlay */}
              <div className="absolute inset-0 -z-10 overflow-hidden">
                <img
                  src={mod.image}
                  alt={mod.title}
                  className="h-full w-full object-cover brightness-90 scale-105 transition-transform duration-1000"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-slate-950/50" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(37,99,235,0.15),transparent_70%)]" />
              </div>

              {/* Floating Editorial Reader (No Cards) */}
              <div className={`w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10 ${
                isRight ? "lg:grid-flow-dense" : ""
              }`}>

                {/* Spacer or Visual Anchor on the opposite side */}
                <div className={`hidden lg:block lg:col-span-6 ${isRight ? "lg:col-start-7" : ""}`}>
                  <div className="text-right font-mono">
                    <span className="text-8xl font-black text-white/10 tracking-tighter block">
                      {mod.number}
                    </span>
                    <Badge className="bg-blue-600/90 text-white border-blue-400/30 text-xs font-bold px-4 py-1.5 mt-2">
                      {mod.badge}
                    </Badge>
                  </div>
                </div>

                {/* Editorial Content Reader */}
                <div className={`lg:col-span-6 ${isRight ? "lg:col-start-1" : ""}`}>
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-black font-mono text-blue-400">{mod.number}</span>
                      <span className="h-px w-12 bg-blue-500/50" />
                      <span className="text-xs font-mono uppercase tracking-widest text-slate-400">
                        {mod.route}
                      </span>
                    </div>

                    <h2 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
                      {mod.title}
                    </h2>

                    <p className="text-base sm:text-lg font-bold text-teal-400 font-mono">
                      {mod.subtitle}
                    </p>

                    <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl">
                      {mod.description}
                    </p>

                    <div className="pt-6 flex flex-wrap items-center gap-4">
                      <Button
                        onClick={() => navigate({ to: mod.route as any })}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl px-8 h-14 shadow-glow text-sm"
                      >
                        Open {mod.title} <ArrowRight className="size-4 ml-2" />
                      </Button>
                      <span className="text-xs font-mono text-slate-400">
                        Module {idx + 1} of 19
                      </span>
                    </div>
                  </div>
                </div>

              </div>
            </section>
          );
        })}

        {/* Final Completion Screen */}
        <section
          id="journey-complete-screen"
          className="relative min-h-screen w-full flex flex-col items-center justify-center px-6 py-32 text-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-t border-white/10"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(16,185,129,0.2),transparent_70%)]" />
          <div className="relative z-10 max-w-4xl mx-auto space-y-8">
            <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 px-5 py-2 text-sm font-bold uppercase tracking-widest">
              <CheckCircle2 className="size-4 inline mr-2 text-emerald-400" />
              End of Lifecycle Story
            </Badge>

            <h2 className="text-4xl sm:text-7xl font-black tracking-tight text-white">
              THE JOURNEY IS COMPLETE
            </h2>

            <p className="text-xl sm:text-2xl font-bold text-teal-400 font-mono">
              Every movement tracked. Every material accounted for. Every operation connected.
            </p>

            <p className="text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
              You have navigated the complete 19-module enterprise supply chain workflow from initial gate entry to final vehicle exit.
            </p>

            <div className="pt-8 flex flex-wrap justify-center gap-4">
              <Button
                size="lg"
                onClick={goToDashboard}
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl px-8 h-14 shadow-glow text-base"
              >
                Enter WMS Dashboard <ArrowRight className="size-5 ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => scrollToModule(0)}
                className="border-white/20 bg-white/5 text-white hover:bg-white/10 font-bold rounded-2xl px-8 h-14 text-base"
              >
                Explore Modules Again
              </Button>
            </div>
          </div>
        </section>

      </main>

      {/* Floating Bottom Quick Navigator */}
      <nav aria-label="Journey Navigation" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/90 border border-white/15 px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-2xl flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => scrollToModule(Math.max(0, currentIndex - 1))}
          className="text-white hover:bg-white/10 rounded-xl size-9"
          disabled={currentIndex === 0 && !isComplete}
        >
          <ChevronLeft className="size-5" />
        </Button>
        <div className="text-center font-mono">
          <p className="text-xs font-bold text-white">
            {isComplete ? "Journey Complete" : `${activeModule.number} — ${activeModule.title}`}
          </p>
          <p className="text-[10px] text-slate-400">
            {isComplete ? "19 of 19" : `${currentIndex + 1} of 19`}
          </p>
        </div>
        <Button
          variant="ghost"
      size="icon"
          onClick={() => scrollToModule(Math.min(wmsModules.length, currentIndex + 1))}
          className="text-white hover:bg-white/10 rounded-xl size-9"
          disabled={isComplete}
        >
          <ChevronRight className="size-5" />
        </Button>
      </nav>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-slate-950 py-10 text-center text-xs text-slate-500 relative z-10">
        <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Kaizentrix Global Solutions. NexusWMS Enterprise Logistics OS.</p>
          <p className="font-mono">19-Module Immersive Storyline • Gate to Exit</p>
        </div>
      </footer>
    </div>
  );
}
