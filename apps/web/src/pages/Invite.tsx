import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui.js';
import { Logo } from '../components/Logo.js';
import { api } from '../lib/api.js';
import { useSeo } from '../lib/seo.js';

type State = 'working' | 'ok' | 'need-auth' | 'error';

export function Invite() {
  useSeo('Accept invitation · Bushi');
  const [params] = useSearchParams();
  const token = params.get('token');
  const navigate = useNavigate();
  const [state, setState] = useState<State>('working');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setMsg('This invitation link is missing its token.');
      return;
    }
    let active = true;
    void api.acceptInvite(token).then((res) => {
      if (!active) return;
      if (res.ok) setState('ok');
      else if (res.status === 401) setState('need-auth');
      else {
        setState('error');
        setMsg(res.status === 0 ? 'Connect the API to accept this invitation.' : res.error);
      }
    });
    return () => {
      active = false;
    };
  }, [token]);

  const next = `/invite?token=${encodeURIComponent(token ?? '')}`;

  return (
    <div className="grid min-h-screen place-items-center bg-ink-950 px-6 not-dark:bg-ink-50">
      <div className="w-full max-w-sm text-center">
        <Link to="/" className="inline-block"><Logo /></Link>
        <div className="mt-8 rounded-2xl border border-ink-800/80 bg-ink-900/50 p-8 not-dark:border-ink-200 not-dark:bg-white">
          {state === 'working' && <p className="text-sm text-ink-400">Accepting your invitation…</p>}

          {state === 'ok' && (
            <>
              <h1 className="font-display text-xl font-bold text-white not-dark:text-ink-900">You're in 🎉</h1>
              <p className="mt-2 text-sm text-ink-400">Your invitation has been accepted.</p>
              <Button className="mt-6 w-full" onClick={() => navigate('/app')}>Go to your console</Button>
            </>
          )}

          {state === 'need-auth' && (
            <>
              <h1 className="font-display text-xl font-bold text-white not-dark:text-ink-900">Accept your invitation</h1>
              <p className="mt-2 text-sm text-ink-400">
                Sign in (or create an account) with the invited email to join the team.
              </p>
              <div className="mt-6 space-y-2">
                <Button as="link" to={`/login?next=${encodeURIComponent(next)}`} className="w-full">Sign in</Button>
                <Button as="link" to={`/signup?next=${encodeURIComponent(next)}`} variant="secondary" className="w-full">Create account</Button>
              </div>
            </>
          )}

          {state === 'error' && (
            <>
              <h1 className="font-display text-xl font-bold text-white not-dark:text-ink-900">Invitation problem</h1>
              <p className="mt-2 text-sm text-kiai-300">{msg}</p>
              <Button as="link" to="/" variant="secondary" className="mt-6 w-full">Back to home</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
