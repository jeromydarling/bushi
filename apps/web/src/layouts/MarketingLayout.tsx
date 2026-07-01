import { Link, NavLink, Outlet } from 'react-router-dom';
import { Logo } from '../components/Logo.js';
import { ThemeToggle } from '../components/ThemeToggle.js';
import { Button, Container } from '../components/ui.js';
import { cn } from '../lib/cn.js';

const nav = [
  { to: '/features', label: 'Features' },
  { to: '/compare', label: 'Compare' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/discover', label: 'Discover' },
];

export function MarketingLayout() {
  return (
    <div className="min-h-screen bg-ink-950 not-dark:bg-ink-50">
      <header className="sticky top-0 z-40 border-b border-ink-800/80 bg-ink-950/80 backdrop-blur not-dark:border-ink-200 not-dark:bg-ink-50/80">
        <Container>
          <div className="flex h-16 items-center justify-between">
            <Link to="/">
              <Logo />
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              {nav.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  className={({ isActive }) =>
                    cn(
                      'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'text-white not-dark:text-ink-900'
                        : 'text-ink-300 hover:text-white not-dark:text-ink-500 not-dark:hover:text-ink-900',
                    )
                  }
                >
                  {n.label}
                </NavLink>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button as="link" to="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
                Sign in
              </Button>
              <Button as="link" to="/signup" size="sm">
                Start free
              </Button>
            </div>
          </div>
        </Container>
      </header>
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-ink-800/80 py-14 not-dark:border-ink-200">
      <Container>
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo />
            <p className="mt-4 max-w-sm text-sm text-ink-400">
              The modern operating system for martial arts tournaments — every style, live scoring,
              registration, and growth tools for the schools that show up.
            </p>
            <p className="mt-4 text-xs text-ink-600">
              A sibling to <span className="text-ink-400">Bitoku</span>, the school management platform.
            </p>
          </div>
          <FooterCol
            title="Product"
            links={[
              ['Features', '/features'],
              ['Compare', '/compare'],
              ['Pricing', '/pricing'],
              ['Discover events', '/discover'],
            ]}
          />
          <FooterCol
            title="Platform"
            links={[
              ['Organizer console', '/app'],
              ['Mat scoring', '/app/tournaments/tour-summer/mat/1'],
              ['Admin', '/admin'],
              ['Sign in', '/login'],
            ]}
          />
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-ink-800/80 pt-6 text-xs text-ink-600 not-dark:border-ink-200 sm:flex-row sm:items-center">
          <span>© {new Date().getFullYear()} Bushi 武士. Built on Cloudflare.</span>
          <span className="font-mono">Discipline · Precision · Performance</span>
        </div>
      </Container>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">{title}</div>
      <ul className="mt-4 space-y-2.5">
        {links.map(([label, to]) => (
          <li key={label}>
            <Link to={to} className="text-sm text-ink-400 transition-colors hover:text-white not-dark:hover:text-ink-900">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
