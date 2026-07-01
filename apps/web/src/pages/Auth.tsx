import type { ReactNode } from 'react';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo.js';
import { Button } from '../components/ui.js';
import { api } from '../lib/api.js';
import { useSeo } from '../lib/seo.js';
import { cn } from '../lib/cn.js';

export function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const isSignup = mode === 'signup';
  useSeo(isSignup ? 'Start free · Bushi' : 'Sign in · Bushi');
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    // Client-side validation.
    if (isSignup && fullName.trim().length < 2) return setError('Please enter your name.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setError('Enter a valid email address.');
    if (password.length < (isSignup ? 10 : 1)) return setError(isSignup ? 'Password must be at least 10 characters.' : 'Enter your password.');

    setBusy(true);
    const res = isSignup ? await api.signup({ email, password, fullName }) : await api.login({ email, password });
    setBusy(false);
    if (res.ok) {
      navigate('/app');
    } else if (res.status === 0) {
      // No backend in demo — proceed to the console anyway.
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
            {isSignup ? 'Start free' : 'Welcome back'}
          </h1>
          <p className="mt-2 text-sm text-ink-400">
            {isSignup ? 'Spin up your first tournament in minutes.' : 'Sign in to your organizer console.'}
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            {isSignup && (
              <Field label="Full name">
                <input className={inputCls} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Rin Watanabe" autoComplete="name" />
              </Field>
            )}
            <Field label="Email">
              <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@dojo.com" autoComplete="email" />
            </Field>
            <Field label="Password">
              <input className={inputCls} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={isSignup ? 'At least 10 characters' : '••••••••'} autoComplete={isSignup ? 'new-password' : 'current-password'} />
            </Field>
            {error && <p className="rounded-lg bg-kiai-500/10 px-3 py-2 text-sm text-kiai-300">{error}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-6 text-sm text-ink-400">
            {isSignup ? 'Already have an account? ' : 'New to Bushi? '}
            <Link to={isSignup ? '/login' : '/signup'} className="font-semibold text-kiai-400 hover:text-kiai-300">
              {isSignup ? 'Sign in' : 'Start free'}
            </Link>
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
