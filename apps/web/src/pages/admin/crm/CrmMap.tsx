import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card } from '../../../components/ui.js';
import { HealthBar, StageBadge, Notice, locationText, healthTone } from '../../../components/crm.js';
import { api, crmErrorMessage, type CrmMapPoint, type CustomerSummary } from '../../../lib/api.js';
import { usd } from '../../../lib/cn.js';
import { useTheme } from '../../../hooks/useTheme.js';
import { useSeo } from '../../../lib/seo.js';

const TOKEN = (import.meta.env.VITE_MAPBOX_TOKEN as string | undefined) ?? '';

const MARKER_COLORS: Record<'red' | 'amber' | 'green', string> = {
  red: '#ef4444',
  amber: '#f59e0b',
  green: '#10b981',
};

export function CrmMap() {
  useSeo('Customer map · Bushi CRM');
  const [points, setPoints] = useState<CrmMapPoint[]>([]);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api.crmMap().then((res) => {
      if (res.ok) setPoints(res.data.points);
      else setError(crmErrorMessage(res.status, res.error));
    });
    // Customer list powers the fallback view.
    void api.crmCustomers().then((res) => {
      if (res.ok) setCustomers(res.data.customers);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-white not-dark:text-ink-900">Customer map</h1>
        <p className="mt-1 text-sm text-ink-400">Where your accounts live, colored by health.</p>
      </div>

      {error && <Notice tone="error">{error}</Notice>}

      {TOKEN ? <MapView points={points} /> : <MapFallback customers={customers} />}
    </div>
  );
}

function MapView({ points }: { points: CrmMapPoint[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const { theme } = useTheme();

  // Init map once.
  useEffect(() => {
    if (!containerRef.current) return;
    mapboxgl.accessToken = TOKEN;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: theme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11',
      center: [-98, 39],
      zoom: 3.2,
    });
    mapRef.current = map;
    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swap style on theme change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.setStyle(theme === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11');
  }, [theme]);

  // Sync markers when points change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    for (const p of points) {
      if (typeof p.lat !== 'number' || typeof p.lng !== 'number') continue;
      const el = document.createElement('div');
      el.style.width = '16px';
      el.style.height = '16px';
      el.style.borderRadius = '9999px';
      el.style.border = '2px solid rgba(255,255,255,0.85)';
      el.style.boxShadow = '0 1px 4px rgba(0,0,0,0.4)';
      el.style.cursor = 'pointer';
      el.style.background = MARKER_COLORS[healthTone(p.healthScore)];

      const popupHtml = `
        <div style="font-family:Inter,system-ui,sans-serif;min-width:180px">
          <div style="font-weight:600;margin-bottom:2px">${escapeHtml(p.name)}</div>
          <div style="font-size:12px;color:#657078;text-transform:capitalize">${escapeHtml(p.stage.replace('_', ' '))} · health ${Math.round(p.healthScore)}</div>
          <div style="font-size:12px;color:#657078">${usd(p.mrrCents)}/mo</div>
          <a href="/admin/crm/customers/${encodeURIComponent(p.id)}" style="display:inline-block;margin-top:6px;font-size:12px;color:#e8481a;font-weight:600;text-decoration:none">Open profile →</a>
        </div>`;
      const popup = new mapboxgl.Popup({ offset: 16, closeButton: false }).setHTML(popupHtml);
      const marker = new mapboxgl.Marker({ element: el }).setLngLat([p.lng, p.lat]).setPopup(popup).addTo(map);
      markersRef.current.push(marker);
    }
  }, [points]);

  return <div ref={containerRef} className="h-[70vh] w-full overflow-hidden rounded-2xl border border-ink-800/80 not-dark:border-ink-200" />;
}

function MapFallback({ customers }: { customers: CustomerSummary[] }) {
  return (
    <div className="space-y-4">
      <Notice>Set VITE_MAPBOX_TOKEN to enable the map.</Notice>
      <Card className="p-0">
        <div className="border-b border-ink-800/80 px-5 py-3 text-sm font-semibold text-white not-dark:border-ink-200 not-dark:text-ink-900">
          Customers by location
        </div>
        {customers.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-ink-500">No customer locations to show.</div>
        ) : (
          <div className="divide-y divide-ink-800/50 not-dark:divide-ink-100">
            {customers.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-white not-dark:text-ink-900">{c.name}</div>
                  <div className="truncate text-xs text-ink-500">{locationText(c.city, c.region, c.country)}</div>
                </div>
                <div className="flex w-40 shrink-0 items-center gap-2">
                  <StageBadge stage={c.lifecycleStage} />
                  <HealthBar score={c.healthScore} showValue />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (ch) => {
    switch (ch) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}
