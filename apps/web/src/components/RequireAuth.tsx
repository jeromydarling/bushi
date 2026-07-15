import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api, API_CONFIGURED } from '../lib/api.js';

type Status = 'checking' | 'authed' | 'denied';

/**
 * Client-side route guard. Redirects to /login when there's no valid session
 * (or, with `role`, when the caller lacks that role). Data is always protected
 * server-side; this stops the app/admin shells from rendering to anonymous
 * visitors. In demo mode (no VITE_API_BASE) it's a no-op so the demo still works.
 */
export function RequireAuth({ children, role }: { children: ReactNode; role?: string }) {
  const [status, setStatus] = useState<Status>(API_CONFIGURED ? 'checking' : 'authed');
  const location = useLocation();

  useEffect(() => {
    if (!API_CONFIGURED) return;
    let active = true;
    void api.me().then((res) => {
      if (!active) return;
      if (res.ok && (!role || res.data.roles.includes(role))) setStatus('authed');
      else setStatus('denied');
    });
    return () => {
      active = false;
    };
  }, [role]);

  if (status === 'checking') {
    return (
      <div className="grid min-h-screen place-items-center bg-ink-950 text-sm text-ink-500 not-dark:bg-ink-50">
        Checking access…
      </div>
    );
  }
  if (status === 'denied') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
