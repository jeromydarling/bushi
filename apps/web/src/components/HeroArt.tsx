/**
 * Abstract sports-tech hero art: an animated bracket converging to a title,
 * with timing bars and a live-score readout. Pure inline SVG — no external
 * image assets — so it renders crisp at any size and themes automatically.
 */
export function HeroArt() {
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-ink-800/80 bg-ink-900/70 not-dark:border-ink-200 not-dark:bg-white">
      <div className="absolute inset-0 grid-lines opacity-70" />
      <svg viewBox="0 0 400 300" className="relative h-full w-full" fill="none" aria-hidden="true">
        {/* bracket lines */}
        <g stroke="currentColor" className="text-ink-700 not-dark:text-ink-300" strokeWidth="1.5">
          <path d="M40 50 H120 V95 H180" />
          <path d="M40 95 H120" />
          <path d="M40 150 H120 V95" />
          <path d="M40 205 H120 V250 H180" />
          <path d="M40 250 H120" />
          <path d="M180 95 V172 H240" />
          <path d="M180 250 V172" />
        </g>
        {/* winner path highlighted */}
        <g stroke="#e8481a" strokeWidth="2.4" strokeLinecap="round">
          <path d="M40 50 H120 V95 H180 V172 H240" className="opacity-90" />
        </g>
        {/* seeds */}
        {[50, 95, 150, 205, 250].map((y, i) => (
          <circle key={y} cx="40" cy={y} r="4" fill={i === 0 ? '#e8481a' : '#4189bd'} />
        ))}
        {/* champion node */}
        <g>
          <rect x="240" y="156" width="120" height="32" rx="8" className="fill-ink-800 not-dark:fill-ink-100" />
          <rect x="240" y="156" width="120" height="32" rx="8" stroke="#e8481a" strokeWidth="1.5" />
          <text x="256" y="176" className="fill-white not-dark:fill-ink-900 font-mono" fontSize="12">
            FINAL · 11–6
          </text>
        </g>
        {/* timing bars */}
        <g>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <rect
              key={i}
              x={256 + i * 16}
              y={210 + (i % 3) * 4}
              width="9"
              height={30 - (i % 3) * 6}
              rx="2"
              className="fill-steel-500/70"
            />
          ))}
        </g>
        <text x="256" y="262" className="fill-ink-400 font-mono" fontSize="9">
          MAT 1 · LIVE
        </text>
      </svg>
      <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full border border-kiai-500/40 bg-kiai-500/10 px-2.5 py-1 text-xs font-semibold text-kiai-300">
        <span className="h-1.5 w-1.5 rounded-full bg-kiai-500 animate-pulse-live" />
        LIVE
      </div>
    </div>
  );
}
