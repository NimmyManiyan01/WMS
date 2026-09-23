import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ElementType } from "react";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Boxes,
  Building2,
  CheckCircle2,
  ClipboardList,
  Factory,
  FileBadge,
  FileCheck2,
  FileQuestion,
  FileText,
  Gauge,
  LockKeyhole,
  PackageCheck,
  PackageSearch,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Store,
  Truck,
  Users,
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

type ModuleStep = {
  id: string;
  title: string;
  route: string;
  description: string;
  icon: ElementType;
  image?: string;
  tone: string;
  badge: string;
};

type RoleCard = {
  role: string;
  route: string;
  icon: ElementType;
  capabilities: string[];
};

const moduleSteps: ModuleStep[] = [
  {
    id: "gate-entry",
    title: "Gate Entry",
    route: "/gate-entry",
    description: "Capture ASN, PO, driver, vehicle, photos, and gate-pass evidence.",
    icon: ShieldCheck,
    image: truckGateUrl,
    tone: "text-blue-600 bg-blue-50 border-blue-200",
    badge: "Security",
  },
  {
    id: "vehicle-verification",
    title: "Vehicle Verification",
    route: "/vehicle-queue",
    description: "Track inbound arrivals, queue state, dock readiness, and movement status.",
    icon: Truck,
    image: driverUrl,
    tone: "text-cyan-700 bg-cyan-50 border-cyan-200",
    badge: "Inbound",
  },
  {
    id: "dock-allocation",
    title: "Dock Allocation",
    route: "/dock-management",
    description: "Assign inbound bays, monitor AT_DOCK status, and manage dock capacity.",
    icon: Warehouse,
    image: truckRearUrl,
    tone: "text-teal-700 bg-teal-50 border-teal-200",
    badge: "Dock",
  },
  {
    id: "grn",
    title: "Receiving / GRN",
    route: "/grn",
    description: "Post goods receipts, inspect documents, print QR labels, and close receiving.",
    icon: FileCheck2,
    image: truckGateUrl,
    tone: "text-emerald-700 bg-emerald-50 border-emerald-200",
    badge: "GRN",
  },
  {
    id: "quality",
    title: "Quality Inspection",
    route: "/procurement/quality-issues",
    description: "Inspect damaged goods, raise claims, and notify suppliers with evidence.",
    icon: ShieldAlert,
    image: driverUrl,
    tone: "text-rose-700 bg-rose-50 border-rose-200",
    badge: "QC",
  },
  {
    id: "putaway",
    title: "Putaway Tasks",
    route: "/putaway-tasks",
    description: "Route accepted materials into stores, zones, bins, and QR-tracked locations.",
    icon: PackageCheck,
    image: truckRearUrl,
    tone: "text-green-700 bg-green-50 border-green-200",
    badge: "Storage",
  },
  {
    id: "stores",
    title: "Store / Zone / Bin Management",
    route: "/warehouse/stores",
    description: "Maintain store hierarchy, zone isolation, bin status, and manager assignment.",
    icon: Store,
    image: truckGateUrl,
    tone: "text-lime-700 bg-lime-50 border-lime-200",
    badge: "Master",
  },
  {
    id: "inventory",
    title: "Inventory Control",
    route: "/inventory",
    description: "View available, allocated, quarantined, and reserved stock across materials.",
    icon: Boxes,
    image: driverUrl,
    tone: "text-indigo-700 bg-indigo-50 border-indigo-200",
    badge: "Stock",
  },
  {
    id: "material-requests",
    title: "Material Requests",
    route: "/warehouse/material-requests",
    description: "Request material from procurement with approvals, notes, and audit history.",
    icon: ClipboardList,
    image: truckRearUrl,
    tone: "text-violet-700 bg-violet-50 border-violet-200",
    badge: "Demand",
  },
  {
    id: "procurement",
    title: "Procurement Dashboard",
    route: "/procurement-dashboard",
    description: "Control suppliers, RFQs, quotations, purchase orders, ASNs, and reports.",
    icon: Building2,
    image: truckGateUrl,
    tone: "text-blue-700 bg-blue-50 border-blue-200",
    badge: "Sourcing",
  },
  {
    id: "supplier-onboarding",
    title: "Supplier Onboarding",
    route: "/master-data",
    description: "Create vendor profiles, documents, GSTIN, addresses, banking, and approvals.",
    icon: Users,
    image: driverUrl,
    tone: "text-sky-700 bg-sky-50 border-sky-200",
    badge: "Vendor",
  },
  {
    id: "rfq",
    title: "RFQs",
    route: "/procurement/rfqs",
    description: "Publish requests for quotation, invite suppliers, and track bid closure.",
    icon: FileQuestion,
    image: truckRearUrl,
    tone: "text-amber-700 bg-amber-50 border-amber-200",
    badge: "RFQ",
  },
  {
    id: "quotations",
    title: "Quotations",
    route: "/procurement/quotations",
    description: "Compare supplier quotes, capture selection reasons, and create PO proposals.",
    icon: FileBadge,
    image: truckGateUrl,
    tone: "text-purple-700 bg-purple-50 border-purple-200",
    badge: "Bids",
  },
  {
    id: "purchase-orders",
    title: "Purchase Orders",
    route: "/procurement/purchase-orders",
    description: "Generate POs, download PDFs, send to suppliers, and track acknowledgements.",
    icon: FileText,
    image: driverUrl,
    tone: "text-slate-700 bg-slate-50 border-slate-200",
    badge: "PO",
  },
  {
    id: "finance",
    title: "Finance Approvals",
    route: "/finance/approvals",
    description: "Authorize spend, reject exceptions, compare RFQs, and audit decisions.",
    icon: FileCheck2,
    image: truckRearUrl,
    tone: "text-emerald-700 bg-emerald-50 border-emerald-200",
    badge: "Control",
  },
  {
    id: "asn",
    title: "Supplier ASN",
    route: "/procurement/asns",
    description: "Track advance shipping notices, supplier dispatch, and incoming vehicles.",
    icon: Truck,
    image: truckGateUrl,
    tone: "text-cyan-700 bg-cyan-50 border-cyan-200",
    badge: "Shipment",
  },
  {
    id: "assembly-req",
    title: "Assembly Requisitions",
    route: "/warehouse/assembly-requisitions",
    description: "Review internal assembly requests and assign stores for physical pickup.",
    icon: PackageSearch,
    image: driverUrl,
    tone: "text-orange-700 bg-orange-50 border-orange-200",
    badge: "Issue",
  },
  {
    id: "assembly-orders",
    title: "Assembly Work Orders",
    route: "/assembly-work-orders",
    description: "Run production orders, workforce, progress, quality, rework, and output.",
    icon: Factory,
    image: truckRearUrl,
    tone: "text-fuchsia-700 bg-fuchsia-50 border-fuchsia-200",
    badge: "Build",
  },
  {
    id: "reservations",
    title: "Material Reservations",
    route: "/assembly-material-reservations",
    description: "Protect stock for released work orders before consumption and issue.",
    icon: PackageCheck,
    image: truckGateUrl,
    tone: "text-indigo-700 bg-indigo-50 border-indigo-200",
    badge: "Reserve",
  },
  {
    id: "finished-goods",
    title: "Finished Goods",
    route: "/assembly-finished-goods",
    description: "Confirm completed production output and finished-goods availability.",
    icon: BadgeCheck,
    image: driverUrl,
    tone: "text-green-700 bg-green-50 border-green-200",
    badge: "Output",
  },
  {
    id: "exit",
    title: "Vehicle Exit",
    route: "/vehicle-exit",
    description: "Approve outbound movement, complete gate exit, and close vehicle lifecycle.",
    icon: Truck,
    image: truckRearUrl,
    tone: "text-blue-700 bg-blue-50 border-blue-200",
    badge: "Exit",
  },
  {
    id: "reports",
    title: "Reports & Analytics",
    route: "/reports",
    description: "Analyze procurement, stores, assembly, GRN, quality, and inventory health.",
    icon: BarChart3,
    image: truckGateUrl,
    tone: "text-violet-700 bg-violet-50 border-violet-200",
    badge: "Insights",
  },
  {
    id: "admin",
    title: "Admin / User Management",
    route: "/admin/users",
    description: "Create users, assign roles, scope access, and review administrative activity.",
    icon: LockKeyhole,
    image: driverUrl,
    tone: "text-zinc-700 bg-zinc-50 border-zinc-200",
    badge: "Access",
  },
];

const roleCards: RoleCard[] = [
  {
    role: "Admin",
    route: "/admin/users",
    icon: LockKeyhole,
    capabilities: ["User creation", "Role access", "Application scope", "Audit trail"],
  },
  {
    role: "Warehouse",
    route: "/warehouse-dashboard",
    icon: Warehouse,
    capabilities: ["Inventory", "Putaway", "Docks", "Vehicle exit"],
  },
  {
    role: "Store Manager",
    route: "/my-store",
    icon: Store,
    capabilities: ["Store control", "Zones", "Bins", "Pickup tasks"],
  },
  {
    role: "Gate Security",
    route: "/gate-dashboard",
    icon: ShieldCheck,
    capabilities: ["Gate entry", "Driver verification", "Arrival queue", "Gate pass"],
  },
  {
    role: "Procurement",
    route: "/procurement-dashboard",
    icon: ClipboardList,
    capabilities: ["Suppliers", "RFQs", "Quotations", "Purchase orders"],
  },
  {
    role: "Supplier",
    route: "/supplier-dashboard",
    icon: Building2,
    capabilities: ["Quotation portal", "ASN creation", "PO confirmation", "Quality claims"],
  },
  {
    role: "Finance",
    route: "/finance-dashboard",
    icon: FileCheck2,
    capabilities: ["PO approvals", "Spend control", "RFQ compare", "Approval history"],
  },
  {
    role: "Assembly Manager",
    route: "/assembly-dashboard",
    icon: Factory,
    capabilities: ["Work orders", "Consumption", "Quality", "Finished goods"],
  },
];

const liveMetrics = [
  ["Vehicles at gate", "18", "Live"],
  ["Dock allocations", "07", "Queued"],
  ["GRNs posted", "126", "Today"],
  ["Open material requests", "42", "Pending"],
  ["Active RFQs", "13", "Sourcing"],
  ["POs awaiting finance", "09", "Approval"],
  ["ASNs in transit", "24", "Inbound"],
  ["Putaway tasks", "31", "Open"],
];

const moduleShowcase = [
  {
    title: "Gate Security Control",
    description: "Vehicle photos, driver details, ASN lookup, PO verification, and gate queue.",
    image: truckGateUrl,
    icon: ShieldCheck,
  },
  {
    title: "Warehouse Execution",
    description: "Storage racks, store hierarchy, inventory balances, putaway and pickup tasks.",
    image: truckRearUrl,
    icon: Warehouse,
  },
  {
    title: "Supplier & Procurement Flow",
    description: "Supplier onboarding, RFQs, quotations, POs, ASN shipment notices, and reports.",
    image: driverUrl,
    icon: ClipboardList,
  },
];

const journeyPath =
  "M180 52 C54 196 314 303 184 448 C58 588 316 714 178 862 C40 1012 322 1138 180 1294 C42 1450 319 1578 180 1744 C55 1900 305 2016 180 2178 C74 2318 286 2434 180 2572";
const journeyHeight = 2624;
const markerFallback = { x: 180, y: 52 };

function HomePage() {
  const navigate = useNavigate();
  const progressPathRef = useRef<SVGPathElement | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeModule, setActiveModule] = useState(0);
  const [pathLength, setPathLength] = useState(1);
  const [markerPoint, setMarkerPoint] = useState(markerFallback);
  const loggedIn = isAuthenticated();
  const userInfo = getUserInfo();

  useEffect(() => {
    const handleScroll = () => {
      const tracker = document.getElementById("workflow-tracker");
      if (!tracker) return;

      const rect = tracker.getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      const total = rect.height + viewport;
      const progress = Math.min(Math.max((viewport - rect.top) / total, 0), 1);
      const measuredLength = progressPathRef.current?.getTotalLength() ?? 1;
      const nextPoint =
        progressPathRef.current?.getPointAtLength(progress * measuredLength) ?? markerFallback;

      setScrollProgress(progress);
      setPathLength(measuredLength);
      setMarkerPoint({ x: nextPoint.x, y: nextPoint.y });
      setActiveModule(Math.min(moduleSteps.length - 1, Math.floor(progress * moduleSteps.length)));
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  const activeStep = moduleSteps[activeModule];
  const heroCards = useMemo(() => moduleSteps.slice(0, 6), []);

  const goToDashboard = () => {
    if (loggedIn) {
      navigate({ to: getDefaultRouteForUser(userInfo) as any });
    } else {
      navigate({ to: "/login" });
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-950 text-white selection:bg-blue-600 selection:text-white">
      {/* Sticky Cinematic Glassmorphism Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={goToDashboard}
            className="flex min-w-0 items-center gap-3 text-left group"
            aria-label="Open NexusWMS"
          >
            <span className="grid h-12 w-32 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/10 p-1 ring-1 ring-white/20 transition group-hover:scale-105">
              <img src={logoUrl} alt="KGS" className="h-full w-full object-contain brightness-0 invert" />
            </span>
            <span className="hidden min-w-0 sm:block">
              <span className="block text-sm font-bold tracking-tight text-white">
                NexusWMS OS
              </span>
              <span className="block text-xs text-blue-400 font-mono">Cinematic Storyline</span>
            </span>
          </button>

          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate({ to: "/login" })} className="text-white hover:bg-white/10">
              Sign In
            </Button>
            <Button onClick={goToDashboard} className="bg-blue-600 hover:bg-blue-500 text-white shadow-glow rounded-xl font-bold">
              {loggedIn ? "Launch Dashboard" : "Get Started"}
              <ArrowRight className="size-4 ml-1" />
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Cinematic Hero Section */}
        <section className="relative overflow-hidden border-b border-white/10 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 py-24 lg:py-32">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.25),transparent_50%)]" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 text-center">
            <Badge className="mb-6 border-blue-500/30 bg-blue-500/10 text-blue-400 px-4 py-1.5 text-xs font-bold uppercase tracking-widest">
              <Sparkles className="size-3.5 inline mr-1.5" />
              Immersive Awwwards-Grade Storytelling
            </Badge>
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl max-w-5xl mx-auto leading-tight">
              The Enterprise Supply Chain <br />
              <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent">
                Roadmap & Cinematic Journey
              </span>
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-base text-slate-400 sm:text-lg leading-relaxed">
              Scroll down to scrub through our live SVG path tracker. Each checkpoint animates seamlessly through every module from Gate Entry to Vehicle Exit.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Button size="lg" onClick={goToDashboard} className="h-12 px-8 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-glow">
                Launch Platform <ArrowRight className="size-4 ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-8 border-white/20 bg-white/5 text-white hover:bg-white/10 rounded-2xl font-bold"
                onClick={() =>
                  document
                    .getElementById("workflow-tracker")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              >
                Explore Story Tracker
              </Button>
            </div>
          </div>
        </section>

        {/* Live Metrics Bar */}
        <section className="border-b border-white/10 bg-slate-900/50 backdrop-blur py-8">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-3 px-4 sm:px-6 md:grid-cols-4 lg:grid-cols-8">
            {liveMetrics.map(([label, value, state]) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-2xl font-bold text-white font-mono">{value}</p>
                  <span className="relative flex size-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
                  </span>
                </div>
                <p className="mt-1 text-xs font-medium text-slate-300">{label}</p>
                <p className="mt-2 text-[10px] font-bold uppercase text-emerald-400 font-mono">{state}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Cinematic Scroll-Linked SVG Path Tracker Section */}
        <section
          id="workflow-tracker"
          className="relative overflow-hidden border-b border-white/10 bg-slate-950 py-24"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.15),transparent_40%),radial-gradient(circle_at_80%_80%,rgba(16,185,129,0.12),transparent_40%)]" />
          <div className="mx-auto max-w-7xl px-4 sm:px-6 relative z-10">
            <div className="relative mb-16 grid gap-12 lg:grid-cols-[440px_1fr]">
              {/* Sticky Preview Media Container (Awwwards Video/Cinematic Style) */}
              <div className="lg:sticky lg:top-28 lg:self-start">
                <Badge className="border-blue-500/30 bg-blue-500/10 text-blue-400 mb-4">
                  <Activity className="size-3.5 mr-1.5" />
                  Scroll Scrubbing Preview
                </Badge>
                <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
                  Storyline checkpoint tracker.
                </h2>
                <p className="mt-4 text-sm leading-relaxed text-slate-400">
                  As you scroll down the page, the glowing SVG path tracker follows your motion, lighting up checkpoints and updating the cinematic preview card in real time.
                </p>

                <div className="mt-8 overflow-hidden rounded-3xl border border-white/15 bg-slate-900 shadow-2xl shadow-blue-500/10 backdrop-blur-xl">
                  <div className="relative h-60">
                    <img
                      src={activeStep.image ?? truckRearUrl}
                      alt={activeStep.title}
                      className="h-full w-full object-cover brightness-90 transition duration-700 hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
                    <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4">
                      <div>
                        <p className="text-xs font-mono uppercase tracking-widest text-blue-400">
                          Milestone {activeModule + 1} of {moduleSteps.length}
                        </p>
                        <h3 className="mt-1 text-2xl font-bold text-white">
                          {activeStep.title}
                        </h3>
                      </div>
                      <span className="rounded-full bg-blue-600/90 text-white px-3.5 py-1 text-xs font-bold font-mono shadow-glow">
                        {Math.round(scrollProgress * 100)}%
                      </span>
                    </div>
                  </div>
                  <div className="p-6 bg-slate-900/90">
                    <div className="flex items-center gap-3">
                      <span className={`grid size-12 place-items-center rounded-2xl border ${activeStep.tone} shadow-lg`}>
                        <activeStep.icon className="size-6" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase text-slate-400 font-mono">
                          {activeStep.badge} Module
                        </p>
                        <p className="truncate font-mono text-xs text-blue-400">{activeStep.route}</p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-relaxed text-slate-300">
                      {activeStep.description}
                    </p>
                    <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 via-teal-400 to-emerald-400 transition-all duration-200"
                        style={{ width: `${Math.round(scrollProgress * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Scrollable Story Journey Path Container */}
              <div className="relative" style={{ minHeight: `${journeyHeight}px` }}>
                <svg
                  className="pointer-events-none absolute left-1/2 top-0 hidden h-full w-[360px] -translate-x-1/2 lg:block"
                  viewBox={`0 0 360 ${journeyHeight}`}
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <path d={journeyPath} stroke="rgba(255,255,255,0.1)" strokeWidth="18" strokeLinecap="round" />
                  <path d={journeyPath} stroke="rgba(255,255,255,0.2)" strokeWidth="10" strokeLinecap="round" />
                  <path
                    ref={progressPathRef}
                    d={journeyPath}
                    stroke="url(#cinematicScrollPath)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={pathLength}
                    strokeDashoffset={Math.max(pathLength - scrollProgress * pathLength, 0)}
                    style={{ filter: "drop-shadow(0 0 16px rgba(59, 130, 246, 0.6))" }}
                  />
                  <g transform={`translate(${markerPoint.x} ${markerPoint.y})`}>
                    <circle r="26" fill="#3b82f6" opacity="0.3" className="animate-ping" />
                    <circle r="18" fill="#ffffff" />
                    <circle r="12" fill="url(#cinematicScrollPath)" />
                    <path
                      d="M-5 0h10M2-5l5 5-5 5"
                      stroke="#ffffff"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                  <defs>
                    <linearGradient id="cinematicScrollPath" x1="180" x2="180" y1="52" y2="2572">
                      <stop stopColor="#3b82f6" />
                      <stop offset="0.5" stopColor="#06b6d4" />
                      <stop offset="1" stopColor="#10b981" />
                    </linearGradient>
                  </defs>
                </svg>

                <div className="grid gap-6 lg:grid-cols-2">
                  {moduleSteps.map((step, index) => {
                    const Icon = step.icon;
                    const active = index <= activeModule;
                    const current = index === activeModule;
                    return (
                      <div
                        key={step.id}
                        className={`relative rounded-3xl border p-6 transition-all duration-500 backdrop-blur-xl ${
                          index % 2 === 0 ? "lg:mr-16" : "lg:ml-16 lg:translate-y-16"
                        } ${
                          current
                            ? "border-blue-500 bg-slate-900/90 shadow-2xl shadow-blue-500/20 ring-4 ring-blue-500/20"
                            : active
                              ? "border-emerald-500/50 bg-slate-900/60 shadow-lg shadow-emerald-500/10"
                              : "border-white/10 bg-slate-900/30 opacity-70 hover:opacity-100"
                        }`}
                        style={{
                          transform: `translateY(${index % 2 === 0 ? 0 : 64}px) scale(${
                            current ? 1.03 : 1
                          })`,
                        }}
                      >
                        <span
                          className={`absolute top-8 hidden size-4 rounded-full border-4 border-slate-950 shadow-lg lg:block ${
                            active ? "bg-emerald-400" : "bg-slate-700"
                          } ${index % 2 === 0 ? "-right-[76px]" : "-left-[76px]"}`}
                        />
                        <div className="flex items-start gap-4">
                          <span
                            className={`grid size-14 shrink-0 place-items-center rounded-2xl border transition-transform duration-300 ${
                              current
                                ? "bg-blue-600 text-white border-blue-400 scale-110 shadow-glow"
                                : active
                                  ? "bg-emerald-600/20 text-emerald-400 border-emerald-500/30"
                                  : "border-white/10 bg-white/5 text-slate-500"
                            }`}
                          >
                            {active && index < activeModule ? (
                              <CheckCircle2 className="size-7" />
                            ) : (
                              <Icon className="size-7" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-bold text-white text-lg">{step.title}</h3>
                              <Badge variant="outline" className="border-white/20 bg-white/5 text-[10px] text-slate-300">
                                {step.badge}
                              </Badge>
                            </div>
                            <p className="mt-2 text-sm leading-relaxed text-slate-300">
                              {step.description}
                            </p>
                            <p className="mt-3 text-xs font-mono font-semibold text-blue-400">{step.route}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Module Showcase Grid */}
        <section className="bg-slate-950 py-24 border-b border-white/10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <Badge className="border-purple-500/30 bg-purple-500/10 text-purple-400">Cinematic Module Surfaces</Badge>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
                Real operational modules brought to life.
              </h2>
            </div>
            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {moduleShowcase.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 shadow-2xl backdrop-blur-xl transition hover:-translate-y-1"
                  >
                    <div className="relative h-64">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="h-full w-full object-cover brightness-90"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
                      <span className="absolute bottom-5 left-5 grid size-12 place-items-center rounded-2xl bg-blue-600 text-white shadow-glow">
                        <Icon className="size-6" />
                      </span>
                    </div>
                    <div className="p-6">
                      <h3 className="font-bold text-white text-lg">{item.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Role-Based Cockpit Section */}
        <section className="bg-slate-900/50 py-24 border-b border-white/10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <Badge className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                Strict Role Governance
              </Badge>
              <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
                Every role gets a dedicated operational cockpit.
              </h2>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {roleCards.map((role) => {
                const Icon = role.icon;
                return (
                  <div
                    key={role.role}
                    className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-xl backdrop-blur-xl transition hover:border-blue-500/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid size-12 place-items-center rounded-2xl bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/30">
                        <Icon className="size-6" />
                      </span>
                      <div>
                        <h3 className="font-bold text-white text-base">{role.role}</h3>
                        <p className="text-xs font-mono text-slate-400">{role.route}</p>
                      </div>
                    </div>
                    <div className="mt-6 space-y-2.5">
                      {role.capabilities.map((capability) => (
                        <div
                          key={capability}
                          className="flex items-center gap-2.5 text-sm text-slate-300"
                        >
                          <QrCode className="size-4 text-emerald-400 shrink-0" />
                          <span>{capability}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="bg-slate-950 py-24 text-center">
          <div className="mx-auto max-w-4xl px-4 sm:px-6">
            <Badge className="border-blue-500/30 bg-blue-500/10 text-blue-400 mb-4">
              <Gauge className="size-3.5 inline mr-1.5" />
              Complete Lifecycle Control
            </Badge>
            <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-6xl">
              Run the full supply chain from gate to finished goods.
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-base text-slate-400 leading-relaxed">
              NexusWMS unites warehouse execution, procurement sourcing, financial approvals, supplier portals, and assembly lines into one integrated platform.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Button size="lg" onClick={() => navigate({ to: "/login" })} className="h-14 px-8 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-glow">
                Sign In
              </Button>
              <Button size="lg" variant="outline" onClick={goToDashboard} className="h-14 px-8 border-white/20 bg-white/5 text-white hover:bg-white/10 font-bold rounded-2xl">
                Open Dashboard <ArrowRight className="size-4 ml-2" />
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-slate-950 py-10 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Kaizentrix Global Solutions. NexusWMS Enterprise Logistics OS.</p>
          <p className="font-mono">Gate • Warehouse • Procurement • Finance • Supplier • Assembly</p>
        </div>
      </footer>
    </div>
  );
}
