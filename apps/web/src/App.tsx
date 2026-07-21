import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { MarketingLayout } from './layouts/MarketingLayout.js';
import { AppLayout } from './layouts/AppLayout.js';
import { PublicLayout } from './layouts/PublicLayout.js';
import { RequireAuth } from './components/RequireAuth.js';
import { Home } from './pages/Home.js';
import { Features } from './pages/Features.js';
import { Compare } from './pages/Compare.js';
import { Pricing } from './pages/Pricing.js';
import { AuthPage } from './pages/Auth.js';
import { Admin } from './pages/Admin.js';
import { CrmLayout } from './layouts/CrmLayout.js';
import { Overview as CrmOverview } from './pages/admin/crm/Overview.js';
import { Customers as CrmCustomers } from './pages/admin/crm/Customers.js';
import { CustomerProfile as CrmCustomerProfile } from './pages/admin/crm/CustomerProfile.js';
// Code-split the map — mapbox-gl is heavy and only needed on this one route.
const CrmMap = lazy(() => import('./pages/admin/crm/CrmMap.js').then((m) => ({ default: m.CrmMap })));
import { NotFound } from './pages/NotFound.js';
import { Dashboard } from './pages/app/Dashboard.js';
import { TournamentWizard } from './pages/app/TournamentWizard.js';
import { TournamentDetail } from './pages/app/TournamentDetail.js';
import { MatRoom } from './pages/app/MatRoom.js';
import { Schools, SchoolDetail } from './pages/app/Schools.js';
import { Coach } from './pages/app/Coach.js';
import { Team } from './pages/app/Team.js';
import { Invite } from './pages/Invite.js';
import { PublicTournament } from './pages/public/PublicTournament.js';
import { PublicResults } from './pages/public/PublicResults.js';
import { PublicSchool } from './pages/public/PublicSchool.js';
import { Discover } from './pages/public/Discover.js';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Marketing */}
        <Route element={<MarketingLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/features" element={<Features />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/pricing" element={<Pricing />} />
        </Route>

        {/* Auth (full-bleed) */}
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/signup" element={<AuthPage mode="signup" />} />
        <Route path="/invite" element={<Invite />} />

        {/* App shell (auth-guarded) */}
        <Route path="/app" element={<RequireAuth><AppLayout /></RequireAuth>}>
          <Route index element={<Dashboard />} />
          <Route path="tournaments/new" element={<TournamentWizard />} />
          <Route path="tournaments/:id" element={<TournamentDetail />} />
          <Route path="schools" element={<Schools />} />
          <Route path="schools/:id" element={<SchoolDetail />} />
          <Route path="coach" element={<Coach />} />
          <Route path="team" element={<Team />} />
        </Route>
        {/* Mat room is full-bleed (own chrome); scoring is enforced server-side */}
        <Route path="/app/tournaments/:id/mat/:mat" element={<MatRoom />} />
        <Route path="/admin" element={<RequireAuth role="platform_admin"><Admin /></RequireAuth>} />

        {/* Super-admin CRM */}
        <Route path="/admin/crm" element={<RequireAuth role="platform_admin"><CrmLayout /></RequireAuth>}>
          <Route index element={<CrmOverview />} />
          <Route path="customers" element={<CrmCustomers />} />
          <Route path="customers/:id" element={<CrmCustomerProfile />} />
          <Route
            path="map"
            element={
              <Suspense fallback={<div className="p-8 text-sm text-ink-500">Loading map…</div>}>
                <CrmMap />
              </Suspense>
            }
          />
        </Route>

        {/* Public event pages */}
        <Route element={<PublicLayout />}>
          <Route path="/discover" element={<Discover />} />
          <Route path="/t/:slug" element={<PublicTournament />} />
          <Route path="/t/:slug/results" element={<PublicResults />} />
          <Route path="/s/:slug" element={<PublicSchool />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
