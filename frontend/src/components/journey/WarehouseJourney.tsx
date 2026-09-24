import { useEffect, useRef, useState, useCallback } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { JOURNEY_STAGES, type JourneyStage } from "./data/journeyStages";
import { JourneyCanvas } from "./JourneyCanvas";
import { DetailReader } from "./DetailReader";
import { JourneyHUD } from "./JourneyHUD";

gsap.registerPlugin(ScrollTrigger);

interface WarehouseJourneyProps {
  stages?: JourneyStage[];
}

export function WarehouseJourney({ stages = JOURNEY_STAGES }: WarehouseJourneyProps) {
  const pinRef = useRef<HTMLDivElement>(null);
  const scrollTriggerRef = useRef<ScrollTrigger | null>(null);

  const [mounted, setMounted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });

  // Mouse Parallax Lerp
  const targetMouseRef = useRef({ x: 0, y: 0 });
  const currentMouseRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

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

      curr.x = lerp(curr.x, target.x, 0.05);
      curr.y = lerp(curr.y, target.y, 0.05);

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
        end: "+=7000",
        pin: true,
        scrub: prefersReducedMotion ? false : 0.8,
        anticipatePin: 1,
        onUpdate: (self) => {
          const p = self.progress;
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

      const targetFraction = index / (stages.length - 1);
      const targetScroll = trigger.start + targetFraction * (trigger.end - trigger.start);

      window.scrollTo({
        top: targetScroll,
        behavior: "smooth",
      });
    },
    [stages.length]
  );

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
          mouseOffset={mouseOffset}
          onSelectStage={handleSelectStage}
        />
      ) : (
        <div className="absolute inset-0 bg-slate-950 flex items-center justify-center">
          <div className="size-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
        </div>
      )}

      {/* Floating Editorial Stage Typography & Telemetry Layer (Card-Free) */}
      <DetailReader stages={stages} activeIndex={activeIndex} />

      {/* Bottom Interactive HUD & Rail */}
      <JourneyHUD
        stages={stages}
        activeIndex={activeIndex}
        scrollProgress={scrollProgress}
        onSelectStage={handleSelectStage}
      />
    </section>
  );
}
