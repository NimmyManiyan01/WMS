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
    tone: "text-emerald-700 bg-emerald-50 border-emerald-200",
    badge: "GRN",
  },
  {
    id: "quality",
    title: "Quality Inspection",
    route: "/procurement/quality-issues",
    description: "Inspect damaged goods, raise claims, and notify suppliers with evidence.",
    icon: ShieldAlert,
    tone: "text-rose-700 bg-rose-50 border-rose-200",
    badge: "QC",
  },
  {
    id: "putaway",
    title: "Putaway Tasks",
    route: "/putaway-tasks",
    description: "Route accepted materials into stores, zones, bins, and QR-tracked locations.",
    icon: PackageCheck,
    tone: "text-green-700 bg-green-50 border-green-200",
    badge: "Storage",
  },
  {
    id: "stores",
    title: "Store / Zone / Bin Management",
    route: "/warehouse/stores",
    description: "Maintain store hierarchy, zone isolation, bin status, and manager assignment.",
    icon: Store,
    tone: "text-lime-700 bg-lime-50 border-lime-200",
    badge: "Master",
  },
  {
    id: "inventory",
    title: "Inventory Control",
    route: "/inventory",
    description: "View available, allocated, quarantined, and reserved stock across materials.",
    icon: Boxes,
    tone: "text-indigo-700 bg-indigo-50 border-indigo-200",
    badge: "Stock",
  },
  {
    id: "material-requests",
    title: "Material Requests",
    route: "/warehouse/material-requests",
    description: "Request material from procurement with approvals, notes, and audit history.",
    icon: ClipboardList,
    tone: "text-violet-700 bg-violet-50 border-violet-200",
    badge: "Demand",
  },
  {
    id: "procurement",
    title: "Procurement Dashboard",
    route: "/procurement-dashboard",
    description: "Control suppliers, RFQs, quotations, purchase orders, ASNs, and reports.",
    icon: Building2,
    tone: "text-blue-700 bg-blue-50 border-blue-200",
    badge: "Sourcing",
  },
  {
    id: "supplier-onboarding",
    title: "Supplier Onboarding",
    route: "/master-data",
    description: "Create vendor profiles, documents, GSTIN, addresses, banking, and approvals.",
    icon: Users,
    tone: "text-sky-700 bg-sky-50 border-sky-200",
    badge: "Vendor",
  },
  {
    id: "rfq",
    title: "RFQs",
    route: "/procurement/rfqs",
    description: "Publish requests for quotation, invite suppliers, and track bid closure.",
    icon: FileQuestion,
    tone: "text-amber-700 bg-amber-50 border-amber-200",
    badge: "RFQ",
  },
  {
    id: "quotations",
    title: "Quotations",
    route: "/procurement/quotations",
    description: "Compare supplier quotes, capture selection reasons, and create PO proposals.",
    icon: FileBadge,
    tone: "text-purple-700 bg-purple-50 border-purple-200",
    badge: "Bids",
  },
  {
    id: "purchase-orders",
    title: "Purchase Orders",
    route: "/procurement/purchase-orders",
    description: "Generate POs, download PDFs, send to suppliers, and track acknowledgements.",
    icon: FileText,
    tone: "text-slate-700 bg-slate-50 border-slate-200",
    badge: "PO",
  },
  {
    id: "finance",
    title: "Finance Approvals",
    route: "/finance/approvals",
    description: "Authorize spend, reject exceptions, compare RFQs, and audit decisions.",
    icon: FileCheck2,
    tone: "text-emerald-700 bg-emerald-50 border-emerald-200",
    badge: "Control",
  },
  {
    id: "asn",
    title: "Supplier ASN",
    route: "/procurement/asns",
    description: "Track advance shipping notices, supplier dispatch, and incoming vehicles.",
    icon: Truck,
    tone: "text-cyan-700 bg-cyan-50 border-cyan-200",
    badge: "Shipment",
  },
  {
    id: "assembly-req",
    title: "Assembly Requisitions",
    route: "/warehouse/assembly-requisitions",
    description: "Review internal assembly requests and assign stores for physical pickup.",
    icon: PackageSearch,
    tone: "text-orange-700 bg-orange-50 border-orange-200",
    badge: "Issue",
  },
  {
    id: "assembly-orders",
    title: "Assembly Work Orders",
    route: "/assembly-work-orders",
    description: "Run production orders, workforce, progress, quality, rework, and output.",
    icon: Factory,
    tone: "text-fuchsia-700 bg-fuchsia-50 border-fuchsia-200",
    badge: "Build",
  },
  {
    id: "reservations",
    title: "Material Reservations",
    route: "/assembly-material-reservations",
    description: "Protect stock for released work orders before consumption and issue.",
    icon: PackageCheck,
    tone: "text-indigo-700 bg-indigo-50 border-indigo-200",
    badge: "Reserve",
  },
  {
    id: "finished-goods",
    title: "Finished Goods",
    route: "/assembly-finished-goods",
    description: "Confirm completed production output and finished-goods availability.",
    icon: BadgeCheck,
    tone: "text-green-700 bg-green-50 border-green-200",
    badge: "Output",
  },
  {
    id: "exit",
    title: "Vehicle Exit",
    route: "/vehicle-exit",
    description: "Approve outbound movement, complete gate exit, and close vehicle lifecycle.",
    icon: Truck,
    tone: "text-blue-700 bg-blue-50 border-blue-200",
    badge: "Exit",
  },
  {
    id: "reports",
    title: "Reports & Analytics",
    route: "/reports",
    description: "Analyze procurement, stores, assembly, GRN, quality, and inventory health.",
    icon: BarChart3,
    tone: "text-violet-700 bg-violet-50 border-violet-200",
    badge: "Insights",
  },
  {
    id: "admin",
    title: "Admin / User Management",
    route: "/admin/users",
    description: "Create users, assign roles, scope access, and review administrative activity.",
    icon: LockKeyhole,
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
    <div className="min-h-screen overflow-x-hidden bg-white text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={goToDashboard}
            className="flex min-w-0 items-center gap-3 text-left"
            aria-label="Open NexusWMS"
          >
            <span className="grid h-14 w-36 shrink-0 place-items-center overflow-hidden rounded-md bg-white p-1 ring-1 ring-slate-200">
              <img src={logoUrl} alt="KGS" className="h-full w-full object-contain" />
            </span>
            <span className="hidden min-w-0 sm:block">
              <span className="block text-sm font-semibold tracking-tight text-slate-950">
                NexusWMS
              </span>
              <span className="block text-xs text-slate-500">Enterprise Logistics OS</span>
            </span>
          </button>

          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => navigate({ to: "/login" })}>
              Sign In
            </Button>
            <Button onClick={goToDashboard} className="shadow-glow">
              {loggedIn ? "Launch Dashboard" : "Get Started"}
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-slate-200 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:48px_48px]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.10),transparent_38%),linear-gradient(to_bottom,rgba(255,255,255,0.78),#ffffff_74%)]" />
          <div className="relative mx-auto grid min-h-[calc(100vh-88px)] max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_520px] lg:py-20">
            <div className="max-w-3xl">
              <Badge className="mb-5 border-blue-200 bg-blue-50 text-blue-700">
                <Sparkles className="size-3.5" />
                Kaizentrix Global Solutions
              </Badge>
              <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
                Enterprise Warehouse, Procurement & Assembly Control Platform
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                Track every vehicle, supplier, purchase order, GRN, bin, material request, quality
                issue, and assembly workflow from one real-time command center.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" onClick={goToDashboard} className="h-12 px-6 shadow-glow">
                  Launch Dashboard
                  <ArrowRight className="size-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-6"
                  onClick={() =>
                    document
                      .getElementById("workflow-tracker")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }
                >
                  View Workflow
                </Button>
              </div>

              <div className="mt-10 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
                {liveMetrics.slice(0, 4).map(([label, value, state]) => (
                  <div
                    key={label}
                    className="rounded-lg border border-slate-200 bg-white/80 p-3 shadow-sm"
                  >
                    <p className="text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
                    <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
                    <p className="mt-2 text-[10px] font-semibold uppercase text-emerald-600">
                      {state}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative hidden h-[560px] lg:block">
              <div className="absolute inset-0 rounded-lg border border-slate-200 bg-white/80 shadow-2xl backdrop-blur">
                <img
                  src={truckGateUrl}
                  alt="Truck at warehouse gate"
                  className="h-full w-full rounded-lg object-cover opacity-20"
                />
              </div>
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 520 560" fill="none">
                <path
                  d="M68 88 C212 24 335 61 420 151 C510 247 361 300 262 285 C115 263 46 353 131 437 C206 511 333 500 455 420"
                  stroke="#dbeafe"
                  strokeWidth="10"
                  strokeLinecap="round"
                />
                <path
                  d="M68 88 C212 24 335 61 420 151 C510 247 361 300 262 285 C115 263 46 353 131 437 C206 511 333 500 455 420"
                  stroke="url(#heroPath)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray="24 18"
                />
                <defs>
                  <linearGradient id="heroPath" x1="68" x2="455" y1="88" y2="420">
                    <stop stopColor="#2563eb" />
                    <stop offset="0.55" stopColor="#0f766e" />
                    <stop offset="1" stopColor="#16a34a" />
                  </linearGradient>
                </defs>
              </svg>
              {heroCards.map((step, index) => {
                const Icon = step.icon;
                const positions = [
                  "left-6 top-10",
                  "right-7 top-24",
                  "left-14 top-56",
                  "right-10 top-72",
                  "left-8 bottom-20",
                  "right-8 bottom-10",
                ];
                return (
                  <div
                    key={step.id}
                    className={`absolute ${positions[index]} w-52 rounded-lg border bg-white/95 p-4 shadow-xl transition duration-500 hover:-translate-y-1`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`grid size-10 place-items-center rounded-md border ${step.tone}`}
                      >
                        <Icon className="size-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">
                          {step.title}
                        </p>
                        <p className="text-xs text-slate-500">{step.badge}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white py-8">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-3 px-4 sm:px-6 md:grid-cols-4 lg:grid-cols-8">
            {liveMetrics.map(([label, value, state]) => (
              <div key={label} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xl font-semibold text-slate-950">{value}</p>
                  <span className="relative flex size-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
                  </span>
                </div>
                <p className="mt-1 text-xs font-medium text-slate-600">{label}</p>
                <p className="mt-2 text-[10px] font-semibold uppercase text-slate-400">{state}</p>
              </div>
            ))}
          </div>
        </section>

        <section
          id="workflow-tracker"
          className="relative overflow-hidden border-y border-slate-200 bg-slate-50 py-20"
        >
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.18)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.18)_1px,transparent_1px)] bg-[size:56px_56px]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(37,99,235,0.12),transparent_28%),radial-gradient(circle_at_82%_34%,rgba(22,163,74,0.10),transparent_24%),linear-gradient(to_bottom,rgba(248,250,252,0.86),rgba(248,250,252,0.98))]" />
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="relative mb-12 grid gap-8 lg:grid-cols-[420px_1fr]">
              <div className="lg:sticky lg:top-28 lg:self-start">
                <Badge className="border-teal-200 bg-teal-50 text-teal-700">
                  <Activity className="size-3.5" />
                  Scroll-linked SVG tracker
                </Badge>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                  The complete operation drawn as one live route.
                </h2>
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  The path reveals as you scroll, the moving marker travels through each checkpoint,
                  and every module activates at the moment it becomes part of the operational chain.
                </p>

                <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
                  <div className="relative h-44">
                    <img
                      src={activeStep.image ?? truckRearUrl}
                      alt={activeStep.title}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/20 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
                          Active checkpoint
                        </p>
                        <h3 className="mt-1 text-xl font-semibold text-white">
                          {activeStep.title}
                        </h3>
                      </div>
                      <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-blue-700">
                        {Math.round(scrollProgress * 100)}%
                      </span>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-3">
                      <span
                        className={`grid size-12 place-items-center rounded-md border ${activeStep.tone}`}
                      >
                        <activeStep.icon className="size-6" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase text-slate-400">
                          Active module {activeModule + 1} of {moduleSteps.length}
                        </p>
                        <p className="truncate font-semibold text-slate-950">{activeStep.route}</p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-slate-600">
                      {activeStep.description}
                    </p>
                    <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-600 via-teal-600 to-emerald-500 transition-all duration-200"
                        style={{ width: `${Math.round(scrollProgress * 100)}%` }}
                      />
                    </div>
                    <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                      {["Gate", "Procure", "Assemble"].map((label, index) => (
                        <div
                          key={label}
                          className="rounded-md border border-slate-200 bg-slate-50 p-3"
                        >
                          <p className="text-[10px] font-semibold uppercase text-slate-400">
                            Phase {index + 1}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-slate-700">{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative" style={{ minHeight: `${journeyHeight}px` }}>
                <svg
                  className="pointer-events-none absolute left-1/2 top-0 hidden h-full w-[360px] -translate-x-1/2 lg:block"
                  viewBox={`0 0 360 ${journeyHeight}`}
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <path d={journeyPath} stroke="#dbeafe" strokeWidth="18" strokeLinecap="round" />
                  <path d={journeyPath} stroke="#ffffff" strokeWidth="10" strokeLinecap="round" />
                  <path
                    ref={progressPathRef}
                    d={journeyPath}
                    stroke="url(#scrollPath)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={pathLength}
                    strokeDashoffset={Math.max(pathLength - scrollProgress * pathLength, 0)}
                    style={{ filter: "drop-shadow(0 8px 18px rgba(37, 99, 235, 0.22))" }}
                  />
                  <g transform={`translate(${markerPoint.x} ${markerPoint.y})`}>
                    <circle r="24" fill="#ffffff" opacity="0.9" />
                    <circle r="17" fill="url(#scrollPath)" />
                    <path
                      d="M-7 0h14M2-6l6 6-6 6"
                      stroke="#ffffff"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                  <defs>
                    <linearGradient id="scrollPath" x1="180" x2="180" y1="52" y2="2572">
                      <stop stopColor="#2563eb" />
                      <stop offset="0.48" stopColor="#0f766e" />
                      <stop offset="1" stopColor="#16a34a" />
                    </linearGradient>
                  </defs>
                </svg>

                <div className="grid gap-5 lg:grid-cols-2">
                  {moduleSteps.map((step, index) => {
                    const Icon = step.icon;
                    const active = index <= activeModule;
                    const current = index === activeModule;
                    return (
                      <div
                        key={step.id}
                        className={`relative rounded-lg border bg-white/95 p-5 shadow-sm backdrop-blur transition-all duration-500 ${
                          index % 2 === 0 ? "lg:mr-20" : "lg:ml-20 lg:translate-y-14"
                        } ${
                          current
                            ? "border-blue-300 shadow-2xl shadow-blue-100 ring-4 ring-blue-100/80"
                            : active
                              ? "border-emerald-200 shadow-lg"
                              : "border-slate-200 opacity-75"
                        }`}
                        style={{
                          transform: `translateY(${index % 2 === 0 ? 0 : 56}px) scale(${
                            current ? 1.025 : 1
                          })`,
                        }}
                      >
                        <span
                          className={`absolute top-7 hidden size-4 rounded-full border-4 border-white shadow-lg lg:block ${
                            active ? "bg-emerald-500" : "bg-slate-300"
                          } ${index % 2 === 0 ? "-right-[88px]" : "-left-[88px]"}`}
                        />
                        <div className="flex items-start gap-4">
                          <span
                            className={`grid size-12 shrink-0 place-items-center rounded-md border transition-transform duration-300 ${
                              current
                                ? `${step.tone} scale-125 shadow-lg`
                                : active
                                  ? `${step.tone} scale-110`
                                  : "border-slate-200 bg-slate-50 text-slate-400"
                            }`}
                          >
                            {active && index < activeModule ? (
                              <CheckCircle2 className="size-6" />
                            ) : (
                              <Icon className="size-6" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold text-slate-950">{step.title}</h3>
                              <Badge variant="outline" className="border-slate-200 text-[10px]">
                                {step.badge}
                              </Badge>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                              {step.description}
                            </p>
                            <p className="mt-3 text-xs font-semibold text-blue-700">{step.route}</p>
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

        <section className="bg-white py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <Badge className="border-blue-200 bg-blue-50 text-blue-700">Module imagery</Badge>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                Operational modules shown as real workflow surfaces.
              </h2>
            </div>
            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {moduleShowcase.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="relative h-56">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 to-transparent" />
                      <span className="absolute bottom-4 left-4 grid size-11 place-items-center rounded-md bg-white text-blue-700">
                        <Icon className="size-5" />
                      </span>
                    </div>
                    <div className="p-5">
                      <h3 className="font-semibold text-slate-950">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-y border-slate-200 bg-slate-50 py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="max-w-2xl">
              <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                Role-based platform
              </Badge>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                Every team gets its own strict operational cockpit.
              </h2>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {roleCards.map((role) => {
                const Icon = role.icon;
                return (
                  <div
                    key={role.role}
                    className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid size-10 place-items-center rounded-md bg-slate-50 text-blue-700 ring-1 ring-slate-200">
                        <Icon className="size-5" />
                      </span>
                      <div>
                        <h3 className="font-semibold text-slate-950">{role.role}</h3>
                        <p className="text-xs text-slate-500">{role.route}</p>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      {role.capabilities.map((capability) => (
                        <div
                          key={capability}
                          className="flex items-center gap-2 text-sm text-slate-600"
                        >
                          <QrCode className="size-3.5 text-emerald-600" />
                          {capability}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="bg-white py-20">
          <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
            <Badge className="border-blue-200 bg-blue-50 text-blue-700">
              <Gauge className="size-3.5" />
              Full lifecycle control
            </Badge>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              Run the full material lifecycle from gate to finished goods.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-slate-600">
              NexusWMS connects operational teams, supplier workflows, finance approval, inventory
              controls, receiving, and assembly execution into one measurable platform.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button size="lg" onClick={() => navigate({ to: "/login" })}>
                Sign In
              </Button>
              <Button size="lg" variant="outline" onClick={goToDashboard}>
                Open Dashboard
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-slate-50 py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 text-sm text-slate-500 sm:px-6 md:flex-row md:items-center md:justify-between">
          <p>© 2026 Kaizentrix Global Solutions. NexusWMS Enterprise Logistics OS.</p>
          <p>Gate • Warehouse • Procurement • Finance • Supplier • Assembly</p>
        </div>
      </footer>
    </div>
  );
}
