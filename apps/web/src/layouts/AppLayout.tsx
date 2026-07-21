import { NavLink, Outlet, Link } from 'react-router-dom';
import { Logo } from '../components/Logo.js';
import { ThemeToggle } from '../components/ThemeToggle.js';
import { cn } from '../lib/cn.js';

const nav = [
  { to: '/app', label: 'Overview', end: true },
  { to: '/app/tournaments/new', label: 'New tournament' },
  { to: '/app/tournaments/tour-summer', label: 'Summer Open' },
  { to: '/app/schools', label: 'Schools' },
  { to: '/app/coach', label: 'Coach' },
  { to: '/app/team', label: 'Team' },
];

export function AppLayout() {
  return (
    <div className="min-h-screen bg-ink-950 not-dark:bg-ink-50">
      <div className="flex">
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-ink-800/80 p-4 not-dark:border-ink-200 lg:flex">
          <Link to="/" className="px-2 py-2">
            <Logo />
          </Link>
          <nav className="mt-6 flex flex-col gap-1">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-ink-800 text-white not-dark:bg-white not-dark:text-ink-900 not-dark:shadow-card'
                      : 'text-ink-300 hover:bg-ink-800/50 hover:text-white not-dark:text-ink-500 not-dark:hover:text-ink-900',
                  )
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto rounded-xl border border-ink-800 p-3 not-dark:border-ink-200">
            <div className="text-xs font-semibold text-ink-300">Open Circuit MA</div>
            <div className="text-xs text-ink-500">Pro plan · 3 events</div>
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-ink-800/80 bg-ink-950/80 px-5 backdrop-blur not-dark:border-ink-200 not-dark:bg-ink-50/80">
            <div className="flex items-center gap-2 text-sm text-ink-400">
              <span className="lg:hidden">
                <Logo />
              </span>
              <span className="hidden lg:inline">Organizer console</span>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-kiai-500 text-sm font-bold text-white">
                R
              </div>
            </div>
          </header>
          <main className="p-5 sm:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
