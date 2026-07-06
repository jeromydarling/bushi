import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Badge, Button, Card } from '../../../components/ui.js';
import { HealthRing, HealthBar, StageBadge, Notice, locationText } from '../../../components/crm.js';
import {
  api,
  crmErrorMessage,
  type CustomerDetail,
  type InteractionKind,
  type CrmContact,
  type TicketPriority,
  type TicketStatus,
} from '../../../lib/api.js';
import { usd, cn } from '../../../lib/cn.js';
import { useSeo } from '../../../lib/seo.js';

const KIND_ICON: Record<string, string> = { note: '📝', call: '📞', email: '✉️', meeting: '🤝' };
const KINDS: InteractionKind[] = ['note', 'call', 'email', 'meeting'];

export function CustomerProfile() {
  const { id = '' } = useParams();
  const [data, setData] = useState<CustomerDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);

  useSeo(data ? `${data.customer.name} · Bushi CRM` : 'Customer · Bushi CRM');

  async function load() {
    const res = await api.crmCustomer(id);
    setLoading(false);
    if (res.ok) {
      setData(res.data);
      setError(null);
    } else {
      setError(crmErrorMessage(res.status, res.error));
    }
  }

  useEffect(() => {
    setLoading(true);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function recompute() {
    setRecomputing(true);
    const res = await api.crmRecomputeHealth(id);
    setRecomputing(false);
    if (res.ok) void load();
  }

  if (loading && !data) return <div className="py-16 text-center text-sm text-ink-500">Loading…</div>;
  if (error && !data) {
    return (
      <div className="space-y-4">
        <Notice tone="error">{error}</Notice>
        <Button as="link" to="/admin/crm/customers" variant="ghost" size="sm">
          ← Back to customers
        </Button>
      </div>
    );
  }
  if (!data) return null;

  const { customer, health, contacts } = data;

  return (
    <div className="space-y-6">
      <Link to="/admin/crm/customers" className="inline-block text-xs font-medium text-ink-400 hover:text-white not-dark:text-ink-500 not-dark:hover:text-ink-900">
        ← Back to customers
      </Link>

      {/* Header */}
      <Card>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="shrink-0">
            <HealthRing score={customer.healthScore} />
          </div>
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl font-bold text-white not-dark:text-ink-900">{customer.name}</h1>
              <StageBadge stage={customer.lifecycleStage} />
              {customer.atRisk && <Badge tone="live">At risk</Badge>}
            </div>
            <p className="text-sm text-ink-400">{health.reason || customer.healthReason || 'No health reason recorded.'}</p>
            <HealthBar score={customer.healthScore} showValue className="max-w-md" />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-400">
              <span className="font-mono text-white not-dark:text-ink-900">{usd(customer.mrrCents)}/mo</span>
              <span>{locationText(customer.city, customer.region, customer.country)}</span>
              {customer.ownerName && <span>Owner: {customer.ownerName}</span>}
            </div>
            {customer.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {customer.tags.map((t) => (
                  <Badge key={t} tone="neutral">
                    {t}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="shrink-0">
            <Button variant="secondary" size="sm" onClick={recompute} disabled={recomputing}>
              {recomputing ? 'Recomputing…' : 'Recompute health'}
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        {/* Left: composer + timeline */}
        <div className="space-y-6">
          <Composer customerId={id} onLogged={load} />
          <Timeline data={data} />
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <HealthBreakdown factors={health.factors} />
          <Tasks customerId={id} data={data} onChange={load} />
          <Tickets customerId={id} data={data} onChange={load} />
          <Contacts contacts={contacts} />
        </div>
      </div>
    </div>
  );
}

function Composer({ customerId, onLogged }: { customerId: string; onLogged: () => Promise<void> }) {
  const [kind, setKind] = useState<InteractionKind>('note');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  async function log() {
    if (!body.trim()) return;
    setBusy(true);
    setNote(null);
    const res = await api.crmAddInteraction(customerId, {
      kind,
      subject: subject.trim() || undefined,
      body: body.trim(),
      followUpAt: followUp ? new Date(followUp).getTime() : undefined,
    });
    setBusy(false);
    if (res.ok) {
      setSubject('');
      setBody('');
      setFollowUp('');
      setNote(res.data.emailed ? 'Logged — email sent to primary contact.' : 'Logged.');
      await onLogged();
    } else {
      setNote(crmErrorMessage(res.status, res.error));
    }
  }

  return (
    <Card className="space-y-3">
      <h2 className="text-sm font-semibold text-white not-dark:text-ink-900">Log an interaction</h2>
      <div className="flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors',
              kind === k
                ? 'border-kiai-500/50 bg-kiai-500/10 text-kiai-300'
                : 'border-ink-800 text-ink-400 hover:text-white not-dark:border-ink-200 not-dark:hover:text-ink-900',
            )}
          >
            {KIND_ICON[k]} {k}
          </button>
        ))}
      </div>
      {kind === 'email' && <p className="text-xs text-ink-500">Emails send to the customer’s primary contact.</p>}
      <input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        placeholder="Subject (optional)"
        className="w-full rounded-lg border border-ink-700 bg-ink-900 px-3.5 py-2 text-sm text-white not-dark:border-ink-200 not-dark:bg-white not-dark:text-ink-900"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What happened?"
        rows={3}
        className="w-full rounded-lg border border-ink-700 bg-ink-900 px-3.5 py-2 text-sm text-white not-dark:border-ink-200 not-dark:bg-white not-dark:text-ink-900"
      />
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-ink-400">
          Follow-up
          <input
            type="date"
            value={followUp}
            onChange={(e) => setFollowUp(e.target.value)}
            className="rounded-lg border border-ink-700 bg-ink-900 px-2.5 py-1.5 text-sm text-white not-dark:border-ink-200 not-dark:bg-white not-dark:text-ink-900"
          />
        </label>
        <Button size="sm" onClick={log} disabled={busy || !body.trim()} className="ml-auto">
          {busy ? 'Logging…' : 'Log'}
        </Button>
      </div>
      {note && <p className="text-xs text-ink-400">{note}</p>}
    </Card>
  );
}

function Timeline({ data }: { data: CustomerDetail }) {
  return (
    <Card className="p-0">
      <div className="border-b border-ink-800/80 px-5 py-3 text-sm font-semibold text-white not-dark:border-ink-200 not-dark:text-ink-900">
        Activity timeline
      </div>
      {data.interactions.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-ink-500">No interactions yet.</div>
      ) : (
        <div className="divide-y divide-ink-800/50 not-dark:divide-ink-100">
          {data.interactions.map((it) => (
            <div key={it.id} className="flex gap-3 px-5 py-4">
              <span className="mt-0.5 text-lg leading-none" aria-hidden>
                {KIND_ICON[it.kind] ?? '•'}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-white not-dark:text-ink-900">
                    {it.subject || it.kind.charAt(0).toUpperCase() + it.kind.slice(1)}
                  </span>
                  <span className="font-mono text-xs text-ink-500">{new Date(it.created_at).toLocaleString()}</span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-ink-300 not-dark:text-ink-600">{it.body}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-500">
                  {it.author_name && <span>by {it.author_name}</span>}
                  {it.follow_up_at && (
                    <Badge tone="accent">Follow-up {new Date(it.follow_up_at).toLocaleDateString()}</Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function HealthBreakdown({ factors }: { factors: CustomerDetail['health']['factors'] }) {
  return (
    <Card className="space-y-3">
      <h2 className="text-sm font-semibold text-white not-dark:text-ink-900">Health breakdown</h2>
      {factors.length === 0 ? (
        <p className="text-sm text-ink-500">No factors recorded.</p>
      ) : (
        <ul className="space-y-2">
          {factors.map((f, i) => (
            <li key={i} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate text-ink-300 not-dark:text-ink-600">{f.label}</span>
              <span
                className={cn(
                  'shrink-0 font-mono font-semibold',
                  f.value > 0 ? 'text-emerald-400' : f.value < 0 ? 'text-red-400' : 'text-ink-400',
                )}
              >
                {f.value > 0 ? '+' : ''}
                {f.value}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Tasks({ customerId, data, onChange }: { customerId: string; data: CustomerDetail; onChange: () => Promise<void>; }) {
  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!title.trim()) return;
    setBusy(true);
    const res = await api.crmAddTask(customerId, { title: title.trim(), dueAt: due ? new Date(due).getTime() : undefined });
    setBusy(false);
    if (res.ok) {
      setTitle('');
      setDue('');
      await onChange();
    }
  }

  async function toggle(taskId: string, done: boolean) {
    const res = await api.crmUpdateTask(taskId, { status: done ? 'done' : 'open' });
    if (res.ok) await onChange();
  }

  return (
    <Card className="space-y-3">
      <h2 className="text-sm font-semibold text-white not-dark:text-ink-900">Tasks</h2>
      {data.tasks.length === 0 ? (
        <p className="text-sm text-ink-500">No tasks.</p>
      ) : (
        <ul className="space-y-1.5">
          {data.tasks.map((t) => {
            const done = t.status === 'done';
            return (
              <li key={t.id} className="flex items-start gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={done}
                  onChange={(e) => toggle(t.id, e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-kiai-500"
                />
                <span className="min-w-0 flex-1">
                  <span className={cn('text-white not-dark:text-ink-900', done && 'text-ink-500 line-through not-dark:text-ink-400')}>
                    {t.title}
                  </span>
                  {t.due_at && <span className="ml-2 font-mono text-xs text-ink-500">{new Date(t.due_at).toLocaleDateString()}</span>}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex flex-col gap-2 border-t border-ink-800/60 pt-3 not-dark:border-ink-200">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New task…"
          className="w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-white not-dark:border-ink-200 not-dark:bg-white not-dark:text-ink-900"
        />
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
            className="rounded-lg border border-ink-700 bg-ink-900 px-2.5 py-1.5 text-sm text-white not-dark:border-ink-200 not-dark:bg-white not-dark:text-ink-900"
          />
          <Button size="sm" onClick={add} disabled={busy || !title.trim()} className="ml-auto">
            Add task
          </Button>
        </div>
      </div>
    </Card>
  );
}

const TICKET_STATUSES: TicketStatus[] = ['open', 'pending', 'resolved', 'closed'];
const TICKET_PRIORITIES: TicketPriority[] = ['low', 'normal', 'high', 'urgent'];

function priorityTone(p: string): 'neutral' | 'accent' | 'live' {
  if (p === 'urgent' || p === 'high') return 'live';
  if (p === 'normal') return 'accent';
  return 'neutral';
}

function Tickets({ customerId, data, onChange }: { customerId: string; data: CustomerDetail; onChange: () => Promise<void>; }) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<TicketPriority>('normal');
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!subject.trim()) return;
    setBusy(true);
    const res = await api.crmAddTicket(customerId, { subject: subject.trim(), body: body.trim() || undefined, priority });
    setBusy(false);
    if (res.ok) {
      setSubject('');
      setBody('');
      setPriority('normal');
      await onChange();
    }
  }

  async function setStatus(ticketId: string, status: TicketStatus) {
    const res = await api.crmUpdateTicket(ticketId, { status });
    if (res.ok) await onChange();
  }

  return (
    <Card className="space-y-3">
      <h2 className="text-sm font-semibold text-white not-dark:text-ink-900">Tickets</h2>
      {data.tickets.length === 0 ? (
        <p className="text-sm text-ink-500">No tickets.</p>
      ) : (
        <ul className="space-y-2">
          {data.tickets.map((t) => (
            <li key={t.id} className="rounded-lg border border-ink-800 p-3 not-dark:border-ink-200">
              <div className="flex items-start justify-between gap-2">
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-white not-dark:text-ink-900">{t.subject}</span>
                <Badge tone={priorityTone(t.priority)}>{t.priority}</Badge>
              </div>
              {t.body && <p className="mt-1 line-clamp-2 text-xs text-ink-400">{t.body}</p>}
              <div className="mt-2">
                <select
                  value={t.status}
                  onChange={(e) => setStatus(t.id, e.target.value as TicketStatus)}
                  className="rounded-lg border border-ink-700 bg-ink-900 px-2 py-1 text-xs text-white not-dark:border-ink-200 not-dark:bg-white not-dark:text-ink-900"
                >
                  {TICKET_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-col gap-2 border-t border-ink-800/60 pt-3 not-dark:border-ink-200">
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Ticket subject…"
          className="w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-white not-dark:border-ink-200 not-dark:bg-white not-dark:text-ink-900"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Details (optional)"
          rows={2}
          className="w-full rounded-lg border border-ink-700 bg-ink-900 px-3 py-2 text-sm text-white not-dark:border-ink-200 not-dark:bg-white not-dark:text-ink-900"
        />
        <div className="flex items-center gap-2">
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as TicketPriority)}
            className="rounded-lg border border-ink-700 bg-ink-900 px-2.5 py-1.5 text-sm text-white not-dark:border-ink-200 not-dark:bg-white not-dark:text-ink-900"
          >
            {TICKET_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <Button size="sm" onClick={add} disabled={busy || !subject.trim()} className="ml-auto">
            Add ticket
          </Button>
        </div>
      </div>
    </Card>
  );
}

function Contacts({ contacts }: { contacts: CrmContact[] }) {
  return (
    <Card className="space-y-3">
      <h2 className="text-sm font-semibold text-white not-dark:text-ink-900">Contacts</h2>
      {contacts.length === 0 ? (
        <p className="text-sm text-ink-500">No contacts.</p>
      ) : (
        <ul className="space-y-3">
          {contacts.map((c) => (
            <li key={c.id} className="text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium text-white not-dark:text-ink-900">{c.name}</span>
                {c.is_primary ? <Badge tone="success">Primary</Badge> : null}
                {c.role && <span className="text-xs text-ink-500">{c.role}</span>}
              </div>
              <div className="mt-0.5 space-y-0.5 text-xs text-ink-400">
                {c.email && (
                  <a href={`mailto:${c.email}`} className="block hover:text-white not-dark:hover:text-ink-900">
                    {c.email}
                  </a>
                )}
                {c.phone && <div>{c.phone}</div>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
