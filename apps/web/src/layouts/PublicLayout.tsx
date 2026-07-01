import { Link, Outlet } from 'react-router-dom';
import { Logo } from '../components/Logo.js';
import { ThemeToggle } from '../components/ThemeToggle.js';
import { Button, Container } from '../components/ui.js';

/** Lightweight chrome for public, mobile-first spectator pages. */
export function PublicLayout() {
  return (
    <div className="min-h-screen bg-ink-950 not-dark:bg-ink-50">
      <header className="border-b border-ink-800/80 not-dark:border-ink-200">
        <Container>
          <div className="flex h-14 items-center justify-between">
            <Link to="/">
              <Logo />
            </Link>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Button as="link" to="/discover" variant="ghost" size="sm">
                Discover events
              </Button>
            </div>
          </div>
        </Container>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="border-t border-ink-800/80 py-8 text-center text-xs text-ink-600 not-dark:border-ink-200">
        Powered by Bushi 武士 · Free live scoring for spectators
      </footer>
    </div>
  );
}
