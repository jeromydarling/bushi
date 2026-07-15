import type { ReactNode } from 'react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Logo } from '../components/Logo.js';
import { Button } from '../components/ui.js';
import { api, API_CONFIGURED } from '../lib/api.js';
import { useSeo } from '../lib/seo.js';
import { cn } from '../lib/cn.js';

export function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const isSignup = mode === 'signup';
  useSeo(isSignup ? 'Start free · Bushi' : 'Sign in · Bushi');
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const resetToken = params.get('reset');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [forgot, setForgot] = useState(false);
  const [busy, setBusy] = useState(false);

  const view: 'reset' | 'forgot' | 'auth' = resetToken ? 'reset' : forgot ? 'forgot' : 'auth';

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    // Consume an emailed reset link.
    if (view === 'reset') {
      if (password.length < 8) return setError('Password must be at least 8 characters.');
      setBusy(true);
      const res = await api.resetPassword(resetToken!, password);
      setBusy(false);
      if (res.ok) {
        setNotice('Password updated. You can sign in now.');
        navigate('/login');
      } else {
        setError(API_CONFIGURED ? res.error : 'Connect the API to reset your password.');
      }
      return;
    }

    // Request a reset link.
    if (view === 'forgot') {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setError('Enter a valid email address.');
      setBusy(true);
      await api.requestPasswordReset(email);
      setBusy(false);
      setNotice('If that account exists, a reset link is on its way.');
      return;
    }

    // Client-side validation for signup/login.
    if (isSignup && fullName.trim().length < 2) return setError('Please enter your name.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setError('Enter a valid email address.');
    if (password.length < (isSignup ? 10 : 1)) return setError(isSignup ? 'Password must be at least 10 characters.' : 'Enter your password.');

    setBusy(true);
    const res = isSignup ? await api.signup({ email, password, fullName }) : await api.login({ email, password });
    setBusy(false);
    if (res.ok) {
      navigate('/app');
    } else if (!API_CONFIGURED) {
      // Demo mode (no backend configured) — proceed to the console to explore.
      navigate('/app');
    } else {
      setError(res.error);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* form */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-16">
        <div className="mx-auto w-full max-w-sm">
          <Link to="/">
            <Logo />
          </Link>
          <h1 className="mt-10 font-display text-3xl font-bold text-white not-dark:text-ink-900">
            {view === 'reset' ? 'Set a new password' : view === 'forgot' ? 'Reset your password' : isSignup ? 'Start free' : 'Welcome back'}
          </h1>
          <p className="mt-2 text-sm text-ink-400">
            {view === 'reset'
              ? 'Choose a strong password for your account.'
              : view === 'forgot'
                ? 'We’ll email you a link to reset your password.'
                : isSignup
                  ? 'Spin up your first tournament in minutes.'
                  : 'Sign in to your organizer console.'}
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            {view === 'auth' && isSignup && (
              <Field label="Full name">
                <input className={inputCls} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Rin Watanabe" autoComplete="name" />
              </Field>
            )}
            {(view === 'auth' || view === 'forgot') && (
              <Field label="Email">
                <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@dojo.com" autoComplete="email" />
              </Field>
            )}
            {(view === 'auth' || view === 'reset') && (
              <Field label={view === 'reset' ? 'New password' : 'Password'}>
                <input className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={view === 'reset' || isSignup ? 'At least 8 characters' : '••••••••'} autoComplete={view === 'reset' || isSignup ? 'new-password' : 'current-password'} />
              </Field>
            )}
            {error && <p className="rounded-lg bg-kiai-500/10 px-3 py-2 text-sm text-kiai-300">{error}</p>}
            {notice && <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">{notice}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? 'Please wait…' : view === 'reset' ? 'Update password' : view === 'forgot' ? 'Send reset link' : isSignup ? 'Create account' : 'Sign in'}
            </Button>
          </form>

          {view === 'auth' && !isSignup && (
            <button type="button" onClick={() => setForgot(true)} className="mt-4 text-sm font-medium text-kiai-400 hover:text-kiai-300">
              Forgot password?
            </button>
          )}

          <p className="mt-6 text-sm text-ink-400">
            {view === 'forgot' || view === 'reset' ? (
              <Link to="/login" onClick={() => setForgot(false)} className="font-semibold text-kiai-400 hover:text-kiai-300">
                ← Back to sign in
              </Link>
            ) : (
              <>
                {isSignup ? 'Already have an account? ' : 'New to Bushi? '}
                <Link to={isSignup ? '/login' : '/signup'} className="font-semibold text-kiai-400 hover:text-kiai-300">
                  {isSignup ? 'Sign in' : 'Start free'}
                </Link>
              </>
            )}
          </p>
        </div>
      </div>

      {/* brand panel */}
      <div className="relative hidden overflow-hidden border-l border-ink-800/80 bg-ink-900 lg:block not-dark:border-ink-200">
        <div className="absolute inset-0 grid-lines opacity-40" />
        <div className="pointer-events-none absolute -left-20 top-1/3 h-80 w-80 rounded-full bg-kiai-500/15 blur-3xl" />
        <div className="relative flex h-full flex-col justify-center p-16">
          <span className="font-jp text-6xl font-black text-kiai-500/80">武士</span>
          <blockquote className="mt-8 max-w-md font-display text-2xl font-semibold leading-snug text-white">
            “We ran a 6-mat event with live scoring the whole gym could follow — and filled the next
            one before brackets opened.”
          </blockquote>
          <div className="mt-6 text-sm text-ink-400">— Head organizer, Open Circuit Martial Arts</div>
        </div>
      </div>
    </div>
  );
}

const inputCls = cn(
  'w-full rounded-lg border border-ink-700 bg-ink-900 px-3.5 py-2.5 text-sm text-white',
  'placeholder:text-ink-600 focus:border-kiai-500/60 focus:outline-none focus:ring-2 focus:ring-kiai-500/30',
  'not-dark:border-ink-200 not-dark:bg-white not-dark:text-ink-900',
);

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-300 not-dark:text-ink-600">{label}</span>
      {children}
    </label>
  );
}
