import { Link } from 'react-router-dom';
import { Button } from '../components/ui.js';
import { Logo } from '../components/Logo.js';
import { useSeo } from '../lib/seo.js';

export function NotFound() {
  useSeo('Not found · Bushi');
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink-950 px-6 text-center not-dark:bg-ink-50">
      <Link to="/"><Logo /></Link>
      <div className="mt-10 font-jp text-6xl font-black text-kiai-500/70">迷</div>
      <h1 className="mt-6 font-display text-3xl font-bold text-white not-dark:text-ink-900">Off the mat</h1>
      <p className="mt-2 max-w-sm text-ink-400">The page you’re looking for scratched from this bracket.</p>
      <div className="mt-8 flex gap-3">
        <Button as="link" to="/">Back home</Button>
        <Button as="link" to="/discover" variant="secondary">Discover events</Button>
      </div>
    </div>
  );
}
