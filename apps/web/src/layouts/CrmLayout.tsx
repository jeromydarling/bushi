import { NavLink, Outlet, Link } from 'react-router-dom';
import { Logo } from '../components/Logo.js';
import { ThemeToggle } from '../components/ThemeToggle.js';
import { Badge } from '../components/ui.js';
import { cn } from '../lib/cn.js';

const nav = [
  { to: '/admin/crm', label: 'Overview', end: true },
  { to: '/admin/crm/customers', label: 'Customers', end: false },
  { to: '/admin/crm/map', label: 'Map', end: false },
];

export function CrmLayout() {
  return (
    <div className="min-h-screen bg-ink-950 not-dark:bg-ink-50">
      <header className="flex items-center justify-between border-b border-ink-800/80 px-5 py-3 not-dark:border-ink-200">
        <div className="flex items-center gap-3">
          <Link to="/">
            <Logo />
          </Link>
          <Badge tone="accent">Admin · CRM</Badge>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/admin" className="text-xs font-medium text-ink-400 hover:text-white not-dark:text-ink-500 not-dark:hover:text-ink-900">
            ← Platform admin
          </Link>
          <ThemeToggle />
        </div>
      </header>
      <div className="border-b border-ink-800/80 px-5 not-dark:border-ink-200">
        <nav className="mx-auto flex max-w-6xl gap-1">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                cn(
                  '-mb-px border-b-2 px-4 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'border-kiai-500 text-white not-dark:text-ink-900'
                    : 'border-transparent text-ink-400 hover:text-white not-dark:text-ink-500 not-dark:hover:text-ink-900',
                )
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <main className="mx-auto max-w-6xl p-5 sm:p-8">
        <Outlet />
      </main>
    </div>
  );
}
