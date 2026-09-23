import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Warehouse,
  ArrowRight,
  ShieldCheck,
  Building2,
  FileText,
  FileCheck2,
  Truck,
  PackageCheck,
  Boxes,
  Lock,
  History,
  Store,
  CheckCircle2,
  Database,
  BarChart3,
  Layers,
  ChevronRight,
  Menu,
  X,
  Clock,
  AlertTriangle,
  QrCode,
  Users,
  Eye,
  Activity,
  ArrowUpRight,
  FileSpreadsheet,
  Check,
  KeyRound,
  FileQuestion,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { IsometricWarehouse3D } from "@/components/wms/isometric-warehouse-3d";

export const Route = createFileRoute("/")({
  component: NexusWMSLandingPage,
});

export default function NexusWMSLandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [heroVisualMode, setHeroVisualMode] = useState<"3d" | "dashboard">("3d");
  const [operationsViewMode, setOperationsViewMode] = useState<"matrix" | "3d">("matrix");

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased selection:bg-primary/20 selection:text-primary">
      {/* ========================================================================= */}
      {/* 1. TOP STICKY NAVIGATION BAR                                              */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo & Name */}
          <Link to="/" className="flex items-center gap-3 group focus:outline-none">
            <div className="size-9 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-sm group-hover:scale-105 transition-transform">
              <Warehouse className="size-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-foreground leading-tight flex items-center gap-1.5">
                NexusWMS
                <span className="inline-block size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </span>
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider hidden sm:inline-block">
                Industrial Platform
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {[
              { label: "Platform", id: "platform" },
              { label: "Solutions", id: "solutions" },
              { label: "Workflow", id: "workflow" },
              { label: "Features", id: "features" },
              { label: "Security", id: "security" },
              { label: "About", id: "about" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className="px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg transition-colors cursor-pointer"
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden sm:flex items-center gap-2.5">
            <Link to="/login">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs font-semibold text-foreground hover:bg-muted/80 h-9 px-3.5 rounded-lg gap-1.5"
              >
                <Lock className="size-3.5 text-muted-foreground" />
                Staff Login
              </Button>
            </Link>
            <Link to="/login">
              <Button
                size="sm"
                className="text-xs font-semibold bg-primary hover:bg-primary/95 text-primary-foreground h-9 px-4 rounded-lg shadow-xs transition-all gap-1.5"
              >
                Get Started
                <ArrowRight className="size-3.5" />
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Toggle Button */}
          <div className="flex items-center gap-2 sm:hidden">
            <Link to="/login">
              <Button size="sm" variant="outline" className="h-8 text-xs font-semibold px-2.5">
                Login
              </Button>
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-b border-border bg-card px-4 py-4 space-y-2 shadow-lg animate-in slide-in-from-top-2 duration-200">
            {[
              { label: "Platform", id: "platform" },
              { label: "Solutions", id: "solutions" },
              { label: "Workflow", id: "workflow" },
              { label: "Features", id: "features" },
              { label: "Security", id: "security" },
              { label: "About", id: "about" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className="block w-full text-left px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-md transition-colors"
              >
                {item.label}
              </button>
            ))}
            <div className="pt-3 border-t border-border/80 flex flex-col gap-2">
              <Link to="/login" className="w-full">
                <Button variant="outline" className="w-full text-xs font-semibold h-9 justify-center gap-1.5">
                  <Lock className="size-3.5 text-muted-foreground" />
                  Staff Login
                </Button>
              </Link>
              <Link to="/login" className="w-full">
                <Button className="w-full text-xs font-semibold h-9 justify-center bg-primary text-primary-foreground gap-1.5">
                  Get Started
                  <ArrowRight className="size-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ========================================================================= */}
      {/* 2. HERO SECTION                                                           */}
      {/* ========================================================================= */}
      <section id="platform" className="relative pt-12 pb-16 lg:pt-20 lg:pb-24 overflow-hidden">
        {/* Subtle background grid accent */}
        <div
          className="absolute inset-0 -z-10 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(var(--foreground) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            {/* Left Hero Content (5 Cols) */}
            <div className="lg:col-span-5 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-semibold">
                <ShieldCheck className="size-3.5" />
                <span>Enterprise Supply Chain & Warehouse Management</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-[1.15]">
                Warehouse Operations.
                <br />
                <span className="text-primary">Connected. Controlled. Intelligent.</span>
              </h1>

              <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
                NexusWMS connects procurement, supplier management, gate operations, receiving,
                inventory and warehouse workflows through a unified platform designed for real-time
                operational visibility.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 sm:gap-4">
                <Button
                  size="lg"
                  onClick={() => scrollToSection("workflow")}
                  className="w-full sm:w-auto h-11 px-6 rounded-xl font-bold bg-primary hover:bg-primary/95 text-primary-foreground shadow-sm transition-all gap-2 text-sm cursor-pointer"
                >
                  Explore NexusWMS
                  <ChevronRight className="size-4" />
                </Button>
                <Link to="/login" className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto h-11 px-6 rounded-xl font-bold border-border/80 text-foreground hover:bg-muted/80 gap-2 text-sm"
                  >
                    <Lock className="size-4 text-muted-foreground" />
                    Staff Login
                  </Button>
                </Link>
              </div>

              {/* Status indicators */}
              <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  <span>Real-Time Gate ANPR & OCR</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  <span>Strict PO & Quality Governance</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  <span>Sub-Location Bin Putaway</span>
                </div>
              </div>
            </div>

            {/* Right Hero Visual / 3D Isometric Animated Warehouse (7 Cols) */}
            <div className="lg:col-span-7 w-full">
              {/* Segmented View Switcher */}
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="inline-flex p-1 rounded-xl bg-muted/70 border border-border/80">
                  <button
                    onClick={() => setHeroVisualMode("3d")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                      heroVisualMode === "3d"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Sparkles className="size-3.5" />
                    <span>3D Isometric Twin</span>
                    <Badge
                      variant="outline"
                      className="text-[9px] py-0 px-1 border-primary/40 text-primary-foreground bg-primary/20"
                    >
                      Live
                    </Badge>
                  </button>
                  <button
                    onClick={() => setHeroVisualMode("dashboard")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                      heroVisualMode === "dashboard"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <BarChart3 className="size-3.5" />
                    <span>Operations Hub</span>
                  </button>
                </div>

                <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground font-mono">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>DC-12 Autonomous Facility</span>
                </div>
              </div>

              {/* Conditional Display: 3D Isometric View or Operations Hub */}
              {heroVisualMode === "3d" ? (
                <IsometricWarehouse3D />
              ) : (
                <div className="relative rounded-2xl border border-border/80 bg-card p-4 sm:p-5 shadow-sm">
                  {/* Console Title Bar */}
                  <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <div className="size-3 rounded-full bg-rose-500/80" />
                      <div className="size-3 rounded-full bg-amber-500/80" />
                      <div className="size-3 rounded-full bg-emerald-500/80" />
                      <span className="ml-2 font-mono text-[11px] font-semibold text-muted-foreground">
                        NexusWMS Operations Hub · Pune DC (Plant 1200)
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-semibold border-emerald-500/30 text-emerald-600 bg-emerald-500/10">
                      Live Active
                    </Badge>
                  </div>

                  {/* Grid of Realistic Operational Widgets */}
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="p-3 rounded-xl border border-border/60 bg-muted/30 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                        <span>Today's Inbounds</span>
                        <Truck className="size-3.5 text-primary" />
                      </div>
                      <div className="text-lg font-bold text-foreground">18 Shipments</div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                        <span className="text-emerald-600 font-semibold">14 Completed</span> · 4 In Transit
                      </div>
                    </div>

                    <div className="p-3 rounded-xl border border-border/60 bg-muted/30 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                        <span>Gate Entry Queue</span>
                        <ShieldCheck className="size-3.5 text-emerald-600" />
                      </div>
                      <div className="text-lg font-bold text-foreground">3 Vehicles</div>
                      <div className="text-[10px] text-muted-foreground">
                        ANPR Matched · Gate 3 Active
                      </div>
                    </div>

                    <div className="p-3 rounded-xl border border-border/60 bg-muted/30 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                        <span>Dock Utilization</span>
                        <Warehouse className="size-3.5 text-primary" />
                      </div>
                      <div className="text-lg font-bold text-foreground">4 / 6 Bays Active</div>
                      <div className="text-[10px] text-muted-foreground">
                        Bays 1, 2, 4 Unloading · Bay 3 QC
                      </div>
                    </div>

                    <div className="p-3 rounded-xl border border-border/60 bg-muted/30 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                        <span>Store Capacity</span>
                        <Boxes className="size-3.5 text-indigo-600" />
                      </div>
                      <div className="text-lg font-bold text-foreground">89% Occupancy</div>
                      <div className="text-[10px] text-muted-foreground">
                        58,420 Items · 0 Critical Stockouts
                      </div>
                    </div>
                  </div>

                  {/* Real-time Activity Mini-Feed */}
                  <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-foreground border-b border-border/40 pb-1.5">
                      <span className="flex items-center gap-1.5">
                        <Activity className="size-3.5 text-primary" />
                        Live Material Verification Stream
                      </span>
                      <span className="font-mono text-[10px] text-muted-foreground">Updated 1m ago</span>
                    </div>

                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="font-mono text-foreground">Gate 3</span>
                        <span className="truncate max-w-[200px]">Vehicle MH-12-AB-9876 · PO-9042</span>
                        <span className="text-emerald-600 font-semibold">Verified</span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="font-mono text-foreground">Dock 4</span>
                        <span className="truncate max-w-[200px]">GRN-2026-0841 completed (480 pcs)</span>
                        <span className="text-primary font-semibold">Putaway</span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className="font-mono text-foreground">Procure</span>
                        <span className="truncate max-w-[200px]">RFQ-4029 approved by Finance</span>
                        <span className="text-amber-600 font-semibold">PO Created</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. TRUST / VALUE STRIP                                                    */}
      {/* ========================================================================= */}
      <section className="border-y border-border/80 bg-muted/40 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-6">
            One platform for the complete material lifecycle
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 items-center justify-center text-center">
            {[
              { label: "Procurement", icon: FileQuestion },
              { label: "Supplier Management", icon: Building2 },
              { label: "Finance Approval", icon: FileCheck2 },
              { label: "Gate Operations", icon: Truck },
              { label: "Receiving", icon: PackageCheck },
              { label: "Inventory", icon: Boxes },
              { label: "Warehouse Operations", icon: Warehouse },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="flex flex-col items-center justify-center p-3 rounded-xl border border-border/50 bg-card hover:border-primary/40 hover:bg-card/90 transition-colors"
                >
                  <Icon className="size-5 text-primary mb-1.5" />
                  <span className="text-xs font-semibold text-foreground leading-tight">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. PLATFORM WORKFLOW SECTION                                              */}
      {/* ========================================================================= */}
      <section id="workflow" className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
            <Badge variant="outline" className="text-xs font-semibold uppercase tracking-wider text-primary border-primary/30">
              End-to-End Traceability
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              From Procurement to Warehouse — One Connected Workflow
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Every step is digitally validated with immutable logs, automated notifications,
              and role-based handoffs from purchase requisition to physical assembly line dispatch.
            </p>
          </div>

          {/* Connected Process Steps Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
            {[
              { step: "01", title: "Material Request", role: "Warehouse / Store", desc: "Department raises spec & item requirements." },
              { step: "02", title: "RFQ", role: "Procurement", desc: "Inquiries dispatched to matched category vendors." },
              { step: "03", title: "Supplier Quotation", role: "Supplier Portal", desc: "Suppliers submit commercial bids & lead times." },
              { step: "04", title: "Finance Approval", role: "Finance Officer", desc: "Budget check, rate analysis, and PO sign-off." },
              { step: "05", title: "Purchase Order", role: "Procurement", desc: "Legally binding PO dispatched with terms & tax." },
              { step: "06", title: "ASN", role: "Supplier", desc: "Advance shipping notice with invoice & packaging slip." },
              { step: "07", title: "Gate Entry", role: "Gate Security", desc: "ANPR vehicle validation and driver ID check." },
              { step: "08", title: "Dock / Yard", role: "Operations", desc: "Real-time bay assignment and truck queueing." },
              { step: "09", title: "Receiving & QA", role: "GRN Officer", desc: "Unloading, physical defect check & photo evidence." },
              { step: "10", title: "GRN & QR Labels", role: "Receiving", desc: "Official Goods Receipt Note with 12-attribute QRs." },
              { step: "11", title: "Putaway Task", role: "Store Manager", desc: "Auto-routed to designated warehouse zone & bin." },
              { step: "12", title: "Inventory Balance", role: "Inventory", desc: "Real-time stock ledger incremented and visible." },
              { step: "13", title: "Material Issue", role: "Assembly / Mfg", desc: "Requisition fulfillment and line staging." },
            ].map((s, idx) => (
              <div
                key={idx}
                className="group relative p-4 rounded-xl border border-border/80 bg-card hover:border-primary/50 hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 rounded-md bg-primary/10">
                      STEP {s.step}
                    </span>
                    <span className="text-[10px] font-medium text-muted-foreground uppercase">
                      {s.role}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                    {s.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. CORE PLATFORM CAPABILITIES                                             */}
      {/* ========================================================================= */}
      <section id="features" className="py-16 lg:py-20 bg-muted/30 border-t border-border/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
            <Badge variant="outline" className="text-xs font-semibold uppercase tracking-wider text-primary border-primary/30">
              Modular Control
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Everything Your Warehouse Needs
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Engineered with specialized modules tailored for each department's operational mandate.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "Supplier Management",
                desc: "Centralize supplier onboarding, validation, compliance and supplier master data.",
                icon: Building2,
                items: ["Self-service vendor portal", "GSTIN & tax verification", "Supplier performance rating"],
              },
              {
                title: "Procurement Management",
                desc: "Manage RFQs, quotations, purchase orders and supplier coordination.",
                icon: FileText,
                items: ["Automated RFQ distribution", "Line-item bid comparisons", "PO revision and tracking"],
              },
              {
                title: "Finance Controls",
                desc: "Validate budgets, commercial values, tax, cost centers and payment terms before PO approval.",
                icon: FileCheck2,
                items: ["Three-way matching guardrails", "Approval threshold limits", "Audit-ready financial logs"],
              },
              {
                title: "Gate & Yard Management",
                desc: "Digitize vehicle arrival, gate verification, yard queues and dock assignment.",
                icon: Truck,
                items: ["ANPR automated license plate scan", "Driver license & photo capture", "Real-time dock bay routing"],
              },
              {
                title: "Receiving & Quality",
                desc: "Manage unloading, quality inspection, GRN generation and material acceptance.",
                icon: PackageCheck,
                items: ["6-step structured GRN workflow", "Photo defect documentation", "Batch-wise QR label printing"],
              },
              {
                title: "Inventory Management",
                desc: "Track stock movement, putaway, material issue and warehouse inventory.",
                icon: Boxes,
                items: ["Zone, rack, bin hierarchy", "Automated putaway tasks", "Stock movement ledger & reports"],
              },
            ].map((card, idx) => {
              const Icon = card.icon;
              return (
                <div
                  key={idx}
                  className="p-6 rounded-2xl border border-border/80 bg-card hover:border-primary/50 hover:shadow-sm transition-all flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Icon className="size-5" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="text-base font-bold text-foreground tracking-tight">
                        {card.title}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {card.desc}
                      </p>
                    </div>
                  </div>

                  <ul className="mt-5 pt-4 border-t border-border/60 space-y-2 text-xs text-muted-foreground">
                    {card.items.map((pt, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Check className="size-3.5 text-emerald-600 shrink-0" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. REAL-TIME OPERATIONS SECTION                                           */}
      {/* ========================================================================= */}
      <section id="solutions" className="py-16 lg:py-24 border-t border-border/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
            <Badge variant="outline" className="text-xs font-semibold uppercase tracking-wider text-primary border-primary/30">
              Live Visibility
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Real-Time Visibility Across Warehouse Operations
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Consolidated operational telemetry across inbound shipments, gate queues, dock bays,
              and store locations in a unified command cockpit.
            </p>
          </div>

          {/* Operational Cockpit Showcase */}
          <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs space-y-6">
            {/* View Switcher Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-border/70">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Facility Command & Telemetry Cockpit
                </span>
              </div>
              <div className="inline-flex p-1 rounded-xl bg-muted/60 border border-border/80">
                <button
                  onClick={() => setOperationsViewMode("matrix")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    operationsViewMode === "matrix"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <BarChart3 className="size-3.5" />
                  <span>Operations Matrix</span>
                </button>
                <button
                  onClick={() => setOperationsViewMode("3d")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                    operationsViewMode === "3d"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Sparkles className="size-3.5" />
                  <span>3D Autonomous Model</span>
                  <Badge variant="outline" className="text-[9px] py-0 px-1 border-primary/40 text-primary-foreground bg-primary/20">
                    Interactive
                  </Badge>
                </button>
              </div>
            </div>

            {operationsViewMode === "3d" ? (
              <div className="py-2">
                <IsometricWarehouse3D />
              </div>
            ) : (
              <>
                {/* Top Metric Bar */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pb-6 border-b border-border/70">
                  {[
                    { label: "Inbound Shipments", value: "24 Today", sub: "18 Cleared · 6 Pending", icon: Truck },
                    { label: "Pending Gate Entries", value: "3 Vehicles", sub: "Avg Wait 4.8 min", icon: ShieldCheck },
                    { label: "Dock Utilization", value: "67% Active", sub: "4 Docks in Unloading", icon: Warehouse },
                    { label: "Receiving Status", value: "1,240 Units", sub: "98.5% Acceptance Rate", icon: PackageCheck },
                    { label: "Inventory Movement", value: "86 Putaways", sub: "All Tasks Assigned", icon: Boxes },
                    { label: "PO Fulfillment", value: "94.2% On-Time", sub: "12 Open Purchase Orders", icon: FileText },
                  ].map((m, i) => {
                    const Icon = m.icon;
                    return (
                      <div key={i} className="p-3 rounded-xl border border-border/60 bg-muted/20 space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-semibold text-muted-foreground uppercase">
                          <span>{m.label}</span>
                          <Icon className="size-3.5 text-primary" />
                        </div>
                        <div className="text-base font-bold text-foreground">{m.value}</div>
                        <div className="text-[10px] text-muted-foreground">{m.sub}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Split Operations View */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Inbound & Dock Status Table (7 Cols) */}
                  <div className="lg:col-span-7 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Active Docks & Inbound Progress
                      </h4>
                      <span className="text-[10px] text-muted-foreground font-mono">Live Dock Telemetry</span>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-border/60">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-muted/50 border-b border-border/60 text-muted-foreground font-semibold">
                          <tr>
                            <th className="p-2.5">Dock</th>
                            <th className="p-2.5">Vehicle</th>
                            <th className="p-2.5">Supplier / PO</th>
                            <th className="p-2.5">Progress</th>
                            <th className="p-2.5 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {[
                            { dock: "Bay 1", vehicle: "MH-12-AB-9876", supplier: "Apex Dynamics · PO-9042", progress: 85, status: "Unloading" },
                            { dock: "Bay 2", vehicle: "KA-01-EF-4412", supplier: "Precision Castings · PO-9045", progress: 40, status: "QC Verification" },
                            { dock: "Bay 3", vehicle: "—", supplier: "Reserved for ASN-3029", progress: 0, status: "Available" },
                            { dock: "Bay 4", vehicle: "DL-04-GH-7811", supplier: "Global Fasteners · PO-9040", progress: 100, status: "GRN Posted" },
                          ].map((row, i) => (
                            <tr key={i} className="hover:bg-muted/20">
                              <td className="p-2.5 font-mono font-bold text-foreground">{row.dock}</td>
                              <td className="p-2.5 font-mono text-muted-foreground">{row.vehicle}</td>
                              <td className="p-2.5 font-medium text-foreground truncate max-w-[180px]">{row.supplier}</td>
                              <td className="p-2.5">
                                <div className="w-24 bg-muted rounded-full h-1.5 overflow-hidden">
                                  <div className="bg-primary h-full rounded-full" style={{ width: `${row.progress}%` }} />
                                </div>
                              </td>
                              <td className="p-2.5 text-right font-medium">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  row.status === "Available" ? "bg-emerald-500/10 text-emerald-600" :
                                  row.status === "GRN Posted" ? "bg-blue-500/10 text-blue-600" :
                                  "bg-amber-500/10 text-amber-600"
                                }`}>
                                  {row.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Warehouse Storage & Putaway Queue (5 Cols) */}
                  <div className="lg:col-span-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                        Real-Time Store Putaway Routing
                      </h4>
                      <span className="text-[10px] text-muted-foreground font-mono">Store Master</span>
                    </div>

                    <div className="space-y-2">
                      {[
                        { zone: "Zone A · Mechanical", bin: "Bin A-04-02", item: "Titanium Hex Bolts (M8x40)", qty: "480 PCS", status: "Putaway Assigned" },
                        { zone: "Zone B · Electronics", bin: "Bin B-02-14", item: "Microcontroller Boards V2", qty: "120 PCS", status: "Verified in Bin" },
                        { zone: "Zone C · Raw Steel", bin: "Bin C-01-08", item: "Seamless Steel Pipes 25mm", qty: "35 BUNDLES", status: "Store In-Transit" },
                      ].map((p, i) => (
                        <div key={i} className="p-3 rounded-xl border border-border/60 bg-muted/20 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-semibold text-foreground">{p.item}</p>
                            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                              {p.zone} · <span className="text-primary font-bold">{p.bin}</span>
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-foreground">{p.qty}</p>
                            <span className="text-[10px] font-semibold text-emerald-600">{p.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. SECURITY & ACCESS CONTROL SECTION                                      */}
      {/* ========================================================================= */}
      <section id="security" className="py-16 lg:py-20 bg-muted/30 border-t border-border/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
            <Badge variant="outline" className="text-xs font-semibold uppercase tracking-wider text-primary border-primary/30">
              Enterprise Governance
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Built for Controlled Enterprise Operations
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Protecting operational continuity, physical assets, and corporate compliance
              through granular role-based security guardrails.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "Role-Based Access Control",
                desc: "Enforce strict functional segregation between Procurement, Finance, Warehouse Operators, Gate Security, and Quality Inspectors.",
                icon: Users,
              },
              {
                title: "Secure Authentication",
                desc: "Session tokens, cryptographic JWT signatures, and credential protection for authorized company employees.",
                icon: KeyRound,
              },
              {
                title: "Audit Trail",
                desc: "Immutable change history recording who approved, verified, received, or adjusted every material record across the facility.",
                icon: History,
              },
              {
                title: "Store / Location Based Authorization",
                desc: "Store managers maintain authority exclusively over their assigned physical warehouses, zones, racks, and storage bins.",
                icon: Store,
              },
              {
                title: "Controlled Approval Workflows",
                desc: "Multi-party authorizations ensure purchase orders, vendor claims, and damage dispositions cannot be finalized without proper reviews.",
                icon: CheckCircle2,
              },
              {
                title: "Operational Data Protection",
                desc: "Relational ACID transaction boundaries with outbox messaging patterns safeguard transaction consistency during network drops.",
                icon: Database,
              },
            ].map((s, idx) => {
              const Icon = s.icon;
              return (
                <div
                  key={idx}
                  className="p-6 rounded-2xl border border-border/80 bg-card hover:border-primary/50 transition-all flex items-start gap-4"
                >
                  <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Icon className="size-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-foreground">
                      {s.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {s.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 8. ROLE-BASED OPERATIONS SECTION                                          */}
      {/* ========================================================================= */}
      <section className="py-16 lg:py-24 border-t border-border/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
            <Badge variant="outline" className="text-xs font-semibold uppercase tracking-wider text-primary border-primary/30">
              Tailored Workspaces
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              One Platform. Different Roles. Controlled Access.
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Every staff member receives a dedicated operational console designed specifically
              for their organizational responsibilities.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                role: "Admin",
                desc: "Configure system settings, facility parameters, user privileges, and master data hierarchies.",
                icon: ShieldCheck,
                color: "text-primary",
              },
              {
                role: "Procurement",
                desc: "Issue RFQs, evaluate vendor bids, and monitor purchase order fulfillment schedules.",
                icon: FileText,
                color: "text-blue-600",
              },
              {
                role: "Finance",
                desc: "Review and approve purchase orders according to financial controls and cost center budgets.",
                icon: FileCheck2,
                color: "text-emerald-600",
              },
              {
                role: "Supplier Management",
                desc: "Onboard suppliers, monitor vendor compliance, and manage supplier master documentation.",
                icon: Building2,
                color: "text-amber-600",
              },
              {
                role: "Gate Security",
                desc: "Verify incoming vehicles, scan barcodes, and manage gate entry passes.",
                icon: Truck,
                color: "text-cyan-600",
              },
              {
                role: "Warehouse",
                desc: "Manage receiving, GRN, putaway and warehouse operations across active dock bays.",
                icon: Warehouse,
                color: "text-purple-600",
              },
              {
                role: "Quality",
                desc: "Inspect material physical condition, document photographic evidence, and isolate defects.",
                icon: Eye,
                color: "text-rose-600",
              },
              {
                role: "Inventory",
                desc: "Track real-time stock balances, manage bin relocations, and fulfill assembly requisitions.",
                icon: Boxes,
                color: "text-indigo-600",
              },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={idx}
                  className="p-5 rounded-xl border border-border/80 bg-card hover:border-primary/40 hover:shadow-xs transition-all space-y-2.5"
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-lg bg-muted/60 ${item.color}`}>
                      <Icon className="size-4" />
                    </div>
                    <h3 className="text-sm font-bold text-foreground">
                      {item.role}
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 9. BUSINESS VALUE SECTION                                                 */}
      {/* ========================================================================= */}
      <section id="about" className="py-16 lg:py-20 bg-muted/30 border-t border-border/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
            <Badge variant="outline" className="text-xs font-semibold uppercase tracking-wider text-primary border-primary/30">
              Operational Impact
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Designed to Improve Operational Control
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              Standardized procedures, systematic verification, and accountable handoffs across the supply chain.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                title: "Better Visibility",
                desc: "Track material movement across the warehouse lifecycle from gate check-in to inventory putaway.",
                icon: Eye,
              },
              {
                title: "Faster Operations",
                desc: "Reduce manual coordination across procurement and warehouse teams through automated event relays.",
                icon: Sparkles,
              },
              {
                title: "Controlled Processes",
                desc: "Apply role-based approvals and operational validations before releasing inventory or authorizing payments.",
                icon: ShieldCheck,
              },
              {
                title: "Traceability",
                desc: "Maintain a clear record of operational activities and transactions with full serial and batch history.",
                icon: History,
              },
            ].map((v, idx) => {
              const Icon = v.icon;
              return (
                <div
                  key={idx}
                  className="p-6 rounded-2xl border border-border/80 bg-card hover:border-primary/50 transition-all space-y-3"
                >
                  <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="text-base font-bold text-foreground">
                    {v.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {v.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 10. FINAL CALL TO ACTION                                                  */}
      {/* ========================================================================= */}
      <section className="py-20 lg:py-24 border-t border-border/80 bg-background text-center">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="size-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mx-auto shadow-sm">
            <Warehouse className="size-6" />
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Bring Your Warehouse Operations Into One Connected Platform
          </h2>

          <p className="text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Manage procurement, supplier coordination, warehouse receiving and inventory operations
            through NexusWMS.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/login" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto h-11 px-8 rounded-xl font-bold bg-primary hover:bg-primary/95 text-primary-foreground shadow-sm text-sm gap-2"
              >
                Get Started
                <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link to="/login" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto h-11 px-8 rounded-xl font-bold border-border/80 text-foreground hover:bg-muted/80 text-sm gap-2"
              >
                <Lock className="size-4 text-muted-foreground" />
                Staff Login
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 11. ENTERPRISE FOOTER                                                     */}
      {/* ========================================================================= */}
      <footer className="border-t border-border/80 bg-muted/20 pt-16 pb-12 text-xs text-muted-foreground">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-border/60">
            {/* Brand column */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
                  <Warehouse className="size-4" />
                </div>
                <span className="text-base font-bold text-foreground">NexusWMS</span>
              </div>
              <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
                Warehouse Management & Supply Chain Operations Platform. Designed for industrial
                logistics, procurement governance, and real-time inventory control.
              </p>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="inline-block size-2 rounded-full bg-emerald-500" />
                <span>Systems Operational · Pune DC (Plant 1200)</span>
              </div>
            </div>

            {/* Platform links */}
            <div className="space-y-3">
              <p className="font-bold text-foreground uppercase tracking-wider text-[11px]">Platform</p>
              <ul className="space-y-2">
                <li><Link to="/login" className="hover:text-foreground transition-colors">Supplier Management</Link></li>
                <li><Link to="/login" className="hover:text-foreground transition-colors">Procurement</Link></li>
                <li><Link to="/login" className="hover:text-foreground transition-colors">Finance</Link></li>
                <li><Link to="/login" className="hover:text-foreground transition-colors">Gate Operations</Link></li>
                <li><Link to="/login" className="hover:text-foreground transition-colors">Receiving</Link></li>
                <li><Link to="/login" className="hover:text-foreground transition-colors">Inventory</Link></li>
              </ul>
            </div>

            {/* Company links */}
            <div className="space-y-3">
              <p className="font-bold text-foreground uppercase tracking-wider text-[11px]">Company</p>
              <ul className="space-y-2">
                <li><button onClick={() => scrollToSection("about")} className="hover:text-foreground transition-colors cursor-pointer">About</button></li>
                <li><Link to="/login" className="hover:text-foreground transition-colors">Contact</Link></li>
                <li><button onClick={() => scrollToSection("solutions")} className="hover:text-foreground transition-colors cursor-pointer">Operations Center</button></li>
              </ul>
            </div>

            {/* Security links */}
            <div className="space-y-3">
              <p className="font-bold text-foreground uppercase tracking-wider text-[11px]">Security</p>
              <ul className="space-y-2">
                <li><button onClick={() => scrollToSection("security")} className="hover:text-foreground transition-colors cursor-pointer">Access Control</button></li>
                <li><button onClick={() => scrollToSection("security")} className="hover:text-foreground transition-colors cursor-pointer">Audit & Compliance</button></li>
                <li><Link to="/login" className="hover:text-foreground transition-colors">Staff Login</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
            <p>&copy; 2026 NexusWMS Industrial Systems. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <span className="hover:text-foreground cursor-pointer">Privacy Policy</span>
              <span className="hover:text-foreground cursor-pointer">Terms of Service</span>
              <span className="hover:text-foreground cursor-pointer">Security Standards</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
