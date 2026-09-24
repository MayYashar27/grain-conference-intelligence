import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Logo } from '../components/Logo';

/**
 * Branded entry screen — a polished Grain blue-gradient/wave hero. NOT auth and
 * no state: one click enters the workspace at /conferences. The wave is drawn as
 * inline SVG (no external asset) to echo grainfinance.com's flowing-currency feel.
 */
export function EntryScreen() {
  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center"
      style={{ background: 'linear-gradient(135deg, #1b2350 0%, #2b3674 46%, #3a57c9 100%)' }}
    >
      {/* soft radial highlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(70% 55% at 50% 30%, rgba(120,150,255,0.22), transparent 70%)' }}
      />

      {/* flowing waves at the bottom */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[42vh] w-full"
        viewBox="0 0 1440 420"
        fill="none"
        preserveAspectRatio="xMidYMax slice"
      >
        <path d="M0 240 C 240 160 480 320 720 260 C 960 200 1200 300 1440 230 L1440 420 L0 420 Z" fill="rgba(255,255,255,0.05)" />
        <path d="M0 300 C 260 230 520 360 780 300 C 1040 240 1240 330 1440 280 L1440 420 L0 420 Z" fill="rgba(255,255,255,0.07)" />
        <path d="M0 360 C 300 300 560 400 820 350 C 1080 300 1260 370 1440 340 L1440 420 L0 420 Z" fill="rgba(255,255,255,0.10)" />
      </svg>

      <div className="relative w-full max-w-lg">
        <div className="flex justify-center">
          <Logo height={44} />
        </div>

        <h1 className="mt-10 text-4xl font-bold tracking-tight text-white sm:text-[3rem] sm:leading-[1.05]">
          Conference Intelligence
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-white/75">
          Turn conferences into better sales opportunities.
        </p>

        <Link
          to="/conferences"
          className="group mt-9 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-bold text-grain-700 shadow-lg shadow-grain-950/30 transition-transform hover:-translate-y-0.5"
        >
          Enter workspace
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
        </Link>

        <p className="mt-12 text-xs font-semibold uppercase tracking-[0.3em] text-white/45">
          Discover · Plan · Capture · Convert
        </p>
      </div>
    </div>
  );
}
