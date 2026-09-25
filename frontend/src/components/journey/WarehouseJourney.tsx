import { useEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { JOURNEY_STAGES, type JourneyStage } from "./data/journeyStages";
import { JourneyCanvas } from "./JourneyCanvas";
import { DetailReader } from "./DetailReader";
import { JourneyHUD } from "./JourneyHUD";

gsap.registerPlugin(ScrollTrigger);

const OVERVIEW_SCROLL_FRACTION = 0.08;

interface WarehouseJourneyProps {
  stages?: JourneyStage[];
}

export function WarehouseJourney({ stages = JOURNEY_STAGES }: WarehouseJourneyProps) {
  const pinRef = useRef<HTMLDivElement>(null);
  const scrollTriggerRef = useRef<ScrollTrigger | null>(null);

  const [mounted, setMounted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [overviewProgress, setOverviewProgress] = useState(0);
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });

  const introTweenRef = useRef<gsap.core.Tween | null>(null);
  const overviewRef = useRef({ val: 0 });

  // Mouse Parallax Lerp
  const targetMouseRef = useRef({ x: 0, y: 0 });
  const currentMouseRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Automatic cinematic intro on page load:
  // Starts with the front warehouse top view (val = 0), holds briefly, then smoothly swoops down to Gate Entry (val = 1).
  useEffect(() => {
    if (!mounted) return;

    introTweenRef.current = gsap.to(overviewRef.current, {
      val: 1,
      duration: 2.4,
      delay: 1.0,
      ease: "power2.inOut",
      onUpdate: () => {
        setOverviewProgress(overviewRef.current.val);
      },
    });

    return () => {
      introTweenRef.current?.kill();
    };
  }, [mounted]);

  // Parallax animation frame loop
  useEffect(() => {
    if (!mounted) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Normalize mouse between -1 and 1
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      targetMouseRef.current = { x: nx, y: ny };
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    const lerp = (a: number, b: number, factor: number) => a + (b - a) * factor;

    const loop = () => {
      const curr = currentMouseRef.current;
      const target = targetMouseRef.current;

      curr.x = lerp(curr.x, target.x, 0.18);
      curr.y = lerp(curr.y, target.y, 0.18);

      setMouseOffset({ x: curr.x, y: curr.y });
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [mounted]);

  // GSAP ScrollTrigger pinning and scrub tracking
  useEffect(() => {
    if (!mounted || !pinRef.current) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = gsap.context(() => {
      const trigger = ScrollTrigger.create({
        trigger: pinRef.current,
        start: "top top",
        end: "+=7800",
        pin: true,
        scrub: prefersReducedMotion ? false : 0.08,
        anticipatePin: 1,
        onUpdate: (self) => {
          const rawProgress = self.progress;

          // If user starts scrolling, kill the intro animation so scroll takes control
          if (rawProgress > 0.002 && introTweenRef.current?.isActive()) {
            introTweenRef.current.kill();
          }

          if (rawProgress <= OVERVIEW_SCROLL_FRACTION) {
            const op = rawProgress / OVERVIEW_SCROLL_FRACTION;
            overviewRef.current.val = op;
            setOverviewProgress(op);
          } else {
            overviewRef.current.val = 1;
            setOverviewProgress(1);
          }

          const p = Math.max(0, (rawProgress - OVERVIEW_SCROLL_FRACTION) / (1 - OVERVIEW_SCROLL_FRACTION));
          setScrollProgress(p);

          // 7 Stages transition mapping (0 to 6)
          const stageIndex = Math.min(
            stages.length - 1,
            Math.max(0, Math.round(p * (stages.length - 1)))
          );
          setActiveIndex(stageIndex);
        },
      });

      scrollTriggerRef.current = trigger;
    });

    return () => {
      ctx.revert();
    };
  }, [mounted, stages.length]);

  // Jump to specific stage
  const handleSelectStage = useCallback(
    (index: number) => {
      const trigger = scrollTriggerRef.current;
      if (!trigger) return;

      introTweenRef.current?.kill();
      overviewRef.current.val = 1;
      setOverviewProgress(1);

      const targetFraction = OVERVIEW_SCROLL_FRACTION + (index / (stages.length - 1)) * (1 - OVERVIEW_SCROLL_FRACTION);
      const targetScroll = trigger.start + targetFraction * (trigger.end - trigger.start);

      window.scrollTo({
        top: targetScroll,
        behavior: "smooth",
      });
    },
    [stages.length]
  );

  // Toggle between front warehouse top view and gate entry
  const handleToggleTopView = useCallback(() => {
    introTweenRef.current?.kill();
    const targetVal = overviewProgress < 0.5 ? 1 : 0;

    if (targetVal === 0 && window.scrollY > 80) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    introTweenRef.current = gsap.to(overviewRef.current, {
      val: targetVal,
      duration: 2.2,
      ease: "power2.inOut",
      onUpdate: () => {
        setOverviewProgress(overviewRef.current.val);
      },
    });
  }, [overviewProgress]);

  return (
    <section
      id="wms-flow-journey"
      ref={pinRef}
      className="relative w-full h-screen overflow-hidden bg-slate-950 select-none"
    >
      {/* 3D WebGL Canvas Layer (Single Persistent World) */}
      {mounted ? (
        <JourneyCanvas
          stages={stages}
          activeIndex={activeIndex}
          scrollProgress={scrollProgress}
          overviewProgress={overviewProgress}
          mouseOffset={mouseOffset}
          onSelectStage={handleSelectStage}
        />
      ) : (
        <div className="absolute inset-0 bg-slate-950 flex items-center justify-center">
          <div className="size-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
        </div>
      )}

      {/* Warehouse Front Facade & Entry Badge */}
      {overviewProgress < 0.85 ? (
        <div className="pointer-events-none absolute inset-x-0 top-24 sm:top-28 text-center transition-all duration-500">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-950/70 border border-cyan-500/40 backdrop-blur-md mb-2.5 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            <span className="size-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="font-mono text-[11px] font-bold tracking-[0.2em] text-cyan-300 uppercase">
              FACILITY FRONT • FULL PERSPECTIVE
            </span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight drop-shadow-[0_2px_16px_rgba(0,0,0,0.8)]">
            Logistics Terminal & Inbound Gate
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-300 max-w-md mx-auto drop-shadow font-medium px-4">
            Full view of warehouse front facade, security gate, and inbound approach
          </p>
        </div>
      ) : (
        <DetailReader stages={stages} activeIndex={activeIndex} />
      )}

      {/* Bottom Interactive HUD & Rail */}
      <JourneyHUD
        stages={stages}
        activeIndex={activeIndex}
        scrollProgress={scrollProgress}
        overviewProgress={overviewProgress}
        onSelectStage={handleSelectStage}
        onToggleTopView={handleToggleTopView}
      />
    </section>
  );
}
