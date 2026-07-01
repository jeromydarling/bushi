/**
 * Row types mirror the D1 schema in migrations/. They are intentionally
 * hand-written (rather than generated) so the API can depend on stable shapes
 * without a codegen step in the Worker build.
 */

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  email_verified_at: number | null;
  status: string;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

export interface UserProfileRow {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  locale: string;
  created_at: number;
  updated_at: number;
}

export interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
  plan_tier: string;
  created_by: string | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

export interface OrganizationMembershipRow {
  id: string;
  org_id: string;
  user_id: string;
  role: string;
  created_at: number;
  updated_at: number;
}

export interface SessionRow {
  id: string;
  user_id: string;
  token_hash: string;
  user_agent: string | null;
  ip: string | null;
  expires_at: number;
  created_at: number;
  revoked_at: number | null;
}

export interface SchoolRow {
  id: string;
  org_id: string | null;
  name: string;
  slug: string;
  styles: string;
  bio: string | null;
  logo_url: string | null;
  website: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  claimed_by: string | null;
  is_public: number;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

export interface AthleteRow {
  id: string;
  school_id: string | null;
  user_id: string | null;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  gender: string | null;
  primary_style: string | null;
  belt_rank: string | null;
  is_public: number;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

export interface TournamentRow {
  id: string;
  org_id: string;
  name: string;
  slug: string;
  styles: string;
  status: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  venue_name: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  banner_url: string | null;
  is_public: number;
  registration_opens_at: number | null;
  registration_closes_at: number | null;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

export interface DivisionRow {
  id: string;
  tournament_id: string;
  name: string;
  style: string;
  format: string;
  gender: string | null;
  age_min: number | null;
  age_max: number | null;
  weight_min_kg: number | null;
  weight_max_kg: number | null;
  belt_rank: string | null;
  cap: number | null;
  mat_id: string | null;
  status: string;
  created_at: number;
  updated_at: number;
}

export interface DivisionEntryRow {
  id: string;
  division_id: string;
  athlete_id: string;
  seed: number | null;
  status: string;
  created_at: number;
  updated_at: number;
}

export interface MatchRow {
  id: string;
  tournament_id: string;
  division_id: string;
  bracket_id: string | null;
  mat_id: string | null;
  round: number;
  ordinal: number;
  label: string | null;
  status: string;
  winner_athlete_id: string | null;
  method: string | null;
  scheduled_at: number | null;
  started_at: number | null;
  completed_at: number | null;
  created_at: number;
  updated_at: number;
}

export interface RegistrationRow {
  id: string;
  tournament_id: string;
  athlete_id: string;
  school_id: string | null;
  registered_by: string | null;
  status: string;
  amount_cents: number;
  currency: string;
  stripe_checkout_id: string | null;
  created_at: number;
  updated_at: number;
}

export interface SubscriptionRow {
  id: string;
  org_id: string;
  tier: string;
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: number | null;
  cancel_at_period_end: number;
  created_at: number;
  updated_at: number;
}
