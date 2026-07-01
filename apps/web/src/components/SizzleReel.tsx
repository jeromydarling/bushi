import { useEffect, useRef, useState } from 'react';
import { Container, Eyebrow } from './ui.js';

/**
 * Full-bleed cinematic "blimp cam" band — a looping aerial drift across
 * tournament floors (generated in Higgsfield, stitched to ~30s). Renders only
 * when VITE_HERO_VIDEO_URL is set, so the site is unaffected until the asset
 * exists. Respects prefers-reduced-motion (shows the poster still instead).
 */
const VIDEO_URL = import.meta.env.VITE_HERO_VIDEO_URL as string | undefined;
const POSTER_URL = import.meta.env.VITE_HERO_VIDEO_POSTER as string | undefined;

export function SizzleReel() {
  if (!VIDEO_URL) return null;
  return <SizzleReelInner url={VIDEO_URL} poster={POSTER_URL} />;
}

function SizzleReelInner({ url, poster }: { url: string; poster?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    // Some browsers need an explicit play() nudge for muted autoplay.
    if (!reducedMotion) void ref.current?.play().catch(() => {});
  }, [reducedMotion]);

  return (
    <section className="relative h-[60vh] min-h-[420px] w-full overflow-hidden border-y border-ink-800/80 bg-ink-950 not-dark:border-ink-200">
      {reducedMotion ? (
        poster && <img src={poster} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <video
          ref={ref}
          className="absolute inset-0 h-full w-full object-cover"
          src={url}
          poster={poster}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
        />
      )}
      {/* Legibility overlay + brand vignette. */}
      <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/40 to-ink-950/70" />
      <div className="absolute inset-0 grid-lines opacity-20" />
      <Container className="relative flex h-full flex-col justify-end pb-12">
        <Eyebrow>One arena · every style</Eyebrow>
        <h2 className="mt-4 max-w-2xl font-display text-3xl font-bold text-white sm:text-5xl">
          The floor, from above.
        </h2>
        <p className="mt-3 max-w-xl text-ink-300">
          Karate, BJJ, Taekwondo, Judo, kickboxing — every mat, every match, one platform running it all.
        </p>
      </Container>
    </section>
  );
}
