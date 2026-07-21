import { useEffect, useState, type FormEvent } from 'react';
import { Badge, Button, Card } from '../../components/ui.js';
import { api, API_CONFIGURED, type OrgInvite } from '../../lib/api.js';
import { cn } from '../../lib/cn.js';
import { useSeo } from '../../lib/seo.js';

const ROLES = ['organizer', 'scorekeeper', 'referee', 'coach'] as const;

export function Team() {
  useSeo('Team · Bushi');
  const [orgId, setOrgId] = useState<string | null>(null);
  const [invites, setInvites] = useState<OrgInvite[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<string>('organizer');
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    if (!API_CONFIGURED) {
      setNote('Connect the API (VITE_API_BASE) to invite teammates.');
      return;
    }
    const me = await api.me();
    if (!me.ok || !me.data.orgId) {
      setNote('Sign in to manage your team.');
      return;
    }
    setOrgId(me.data.orgId);
    const res = await api.listInvites(me.data.orgId);
    if (res.ok) setInvites(res.data.invites);
  }

  useEffect(() => {
    void load();
  }, []);

  async function invite(e: FormEvent) {
    e.preventDefault();
    if (!orgId) return;
    setBusy(true);
    setNote(null);
    const res = await api.createInvite({ orgId, email, role });
    setBusy(false);
    if (res.ok) {
      setEmail('');
      setNote(`Invitation sent to ${res.data.email}.`);
      void load();
    } else {
      setNote(res.error);
    }
  }

  async function revoke(id: string) {
    await api.revokeInvite(id);
    void load();
  }

  const inputCls = cn(
    'w-full rounded-lg border border-ink-700 bg-ink-900 px-3.5 py-2.5 text-sm text-white placeholder:text-ink-600',
    'focus:border-kiai-500/60 focus:outline-none focus:ring-2 focus:ring-kiai-500/30',
    'not-dark:border-ink-200 not-dark:bg-white not-dark:text-ink-900',
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white not-dark:text-ink-900">Team</h1>
        <p className="mt-1 text-sm text-ink-400">Invite organizers, scorekeepers, and referees to your organization.</p>
      </div>

      <Card>
        <form onSubmit={invite} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block flex-1">
            <span className="mb-1.5 block text-sm font-medium text-ink-300 not-dark:text-ink-600">Email</span>
            <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@dojo.com" required aria-label="Invitee email" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink-300 not-dark:text-ink-600">Role</span>
            <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value)} aria-label="Invitee role">
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </label>
          <Button type="submit" disabled={busy || !orgId}>
            {busy ? 'Sending…' : 'Send invite'}
          </Button>
        </form>
        {note && <p className="mt-3 text-sm text-ink-400">{note}</p>}
      </Card>

      <Card className="p-0">
        <div className="border-b border-ink-800/80 px-5 py-3 text-sm font-semibold text-white not-dark:border-ink-200 not-dark:text-ink-900">
          Invitations
        </div>
        {invites.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-ink-500">No invitations yet.</div>
        ) : (
          invites.map((inv) => {
            const status = inv.accepted_at ? 'accepted' : inv.expires_at < Date.now() ? 'expired' : 'pending';
            return (
              <div key={inv.id} className="flex items-center justify-between border-b border-ink-800/50 px-5 py-3 text-sm last:border-0 not-dark:border-ink-100">
                <div className="min-w-0">
                  <div className="truncate font-medium text-white not-dark:text-ink-900">{inv.email}</div>
                  <div className="text-xs text-ink-500">{inv.role}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge tone={status === 'accepted' ? 'success' : status === 'expired' ? 'neutral' : 'accent'}>{status}</Badge>
                  {status === 'pending' && (
                    <Button variant="ghost" size="sm" onClick={() => revoke(inv.id)}>Revoke</Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </Card>
    </div>
  );
}
