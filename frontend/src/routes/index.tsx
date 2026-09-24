import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getDefaultRouteForUser, getUserInfo, isAuthenticated } from "@/lib/auth-utils";
import logoUrl from "@/assets/Logo.png";
import { WarehouseJourney } from "@/components/journey/WarehouseJourney";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const loggedIn = isAuthenticated();
  const userInfo = getUserInfo();

  const goToDashboard = () => {
    if (loggedIn) {
      navigate({ to: getDefaultRouteForUser(userInfo) as any });
    } else {
      navigate({ to: "/login" });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="relative min-h-screen bg-slate-950 text-white selection:bg-cyan-500 selection:text-white font-sans">
      {/* Top Floating Glass Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <button
            type="button"
            onClick={goToDashboard}
            className="flex items-center gap-3 text-left group cursor-pointer focus:outline-none"
          >
            <span className="grid h-10 w-28 shrink-0 place-items-center overflow-hidden rounded-xl bg-white/10 p-1 ring-1 ring-white/20 transition-transform group-hover:scale-105">
              <img src={logoUrl} alt="Logo" className="h-full w-full object-contain brightness-0 invert" />
            </span>
            <div>
              <span className="block text-xs font-bold tracking-tight text-white">NexusWMS</span>
              <span className="block text-[10px] text-cyan-400 font-mono tracking-wider">3D Warehouse Journey</span>
            </div>
          </button>

          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate({ to: "/login" })}
              className="text-white hover:bg-white/10 text-xs font-bold"
            >
              Sign In
            </Button>
            <Button
              onClick={goToDashboard}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-[0_0_20px_rgba(6,182,212,0.4)] rounded-xl text-xs font-black px-5 tracking-wider uppercase"
            >
              {loggedIn ? "Dashboard" : "Launch App"} <ArrowRight className="size-3.5 ml-1.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main 3D Continuous Scroll-Controlled Warehouse Journey */}
      <main className="w-full">
        <WarehouseJourney />

        {/* Final Lifecycle Completion Screen */}
        <section
          id="journey-complete-screen"
          className="relative min-h-screen w-full flex flex-col items-center justify-center px-6 py-32 text-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border-t border-white/10"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(6,182,212,0.18),transparent_70%)]" />
          <div className="relative z-10 max-w-4xl mx-auto space-y-8">
            <Badge className="border-cyan-500/40 bg-cyan-500/10 text-cyan-300 px-5 py-2 text-sm font-bold uppercase tracking-widest">
              <CheckCircle2 className="size-4 inline mr-2 text-cyan-400" />
              Full Warehouse Lifecycle Complete
            </Badge>

            <h2 className="text-4xl sm:text-7xl font-black tracking-tight text-white">
              EVERY MOVEMENT TRACKED
            </h2>

            <p className="text-xl sm:text-2xl font-bold text-cyan-400 font-mono">
              Every material accounted for. Every operation connected.
            </p>

            <p className="text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
              From security gate arrival and dock manifest inspection to automated forklift putaway, live inventory ledgers, robotic assembly, dispatch consolidation, and vehicle exit clearance.
            </p>

            <div className="pt-6 flex flex-wrap justify-center gap-4">
              <Button
                size="lg"
                onClick={goToDashboard}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-2xl px-8 h-14 shadow-[0_0_25px_rgba(6,182,212,0.5)] text-base tracking-wider uppercase"
              >
                Enter WMS Dashboard <ArrowRight className="size-5 ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={scrollToTop}
                className="border-white/20 bg-white/5 text-white hover:bg-white/10 font-bold rounded-2xl px-8 h-14 text-base"
              >
                Replay 3D Journey
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-slate-950 py-10 text-center text-xs text-slate-500 relative z-10">
        <div className="mx-auto max-w-7xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Kaizentrix Global Solutions. NexusWMS Enterprise Logistics OS.</p>
          <p className="font-mono text-cyan-500/60">Continuous 3D Logistics Lifecycle • Gate to Exit</p>
        </div>
      </footer>
    </div>
  );
}
