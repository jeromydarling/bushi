/**
 * Demo data so the app shell and public pages are fully populated and demoable
 * without a running backend. Mirrors the shapes the API returns.
 */
import type { MartialArtStyle, TournamentStatus } from '@bushi/domain';

export interface DemoTournament {
  id: string;
  slug: string;
  name: string;
  status: TournamentStatus;
  styles: MartialArtStyle[];
  startDate: string;
  city: string;
  region: string;
  registrations: number;
  divisions: number;
  mats: number;
}

export interface DemoAthlete {
  id: string;
  name: string;
  style: MartialArtStyle;
  belt: string;
  weightKg: number;
  age: number;
  wins: number;
  losses: number;
}

export interface DemoSchool {
  id: string;
  slug: string;
  name: string;
  city: string;
  region: string;
  styles: MartialArtStyle[];
  athletes: number;
  rank: number;
}

export const tournaments: DemoTournament[] = [
  {
    id: 'tour-summer',
    slug: 'bushi-summer-open-2026',
    name: 'Bushi Summer Open 2026',
    status: 'registration_open',
    styles: ['karate', 'bjj', 'taekwondo'],
    startDate: '2026-08-15',
    city: 'San Jose',
    region: 'CA',
    registrations: 214,
    divisions: 28,
    mats: 6,
  },
  {
    id: 'tour-winter',
    slug: 'bushi-winter-classic-2026',
    name: 'Bushi Winter Classic 2026',
    status: 'completed',
    styles: ['bjj', 'judo'],
    startDate: '2026-02-08',
    city: 'Austin',
    region: 'TX',
    registrations: 176,
    divisions: 22,
    mats: 4,
  },
  {
    id: 'tour-spring',
    slug: 'iron-valley-grappling-invitational',
    name: 'Iron Valley Grappling Invitational',
    status: 'live',
    styles: ['bjj'],
    startDate: '2026-07-01',
    city: 'Denver',
    region: 'CO',
    registrations: 98,
    divisions: 14,
    mats: 3,
  },
];

export const schools: DemoSchool[] = [
  { id: 'school-ronin', slug: 'ronin-academy', name: 'Ronin Academy', city: 'San Jose', region: 'CA', styles: ['karate', 'taekwondo'], athletes: 42, rank: 1 },
  { id: 'school-ironbound', slug: 'ironbound-bjj', name: 'Ironbound BJJ', city: 'Austin', region: 'TX', styles: ['bjj'], athletes: 58, rank: 2 },
  { id: 'school-summit', slug: 'summit-taekwondo', name: 'Summit Taekwondo', city: 'Denver', region: 'CO', styles: ['taekwondo'], athletes: 31, rank: 3 },
  { id: 'school-bushido', slug: 'bushido-judo-club', name: 'Bushido Judo Club', city: 'Portland', region: 'OR', styles: ['judo'], athletes: 27, rank: 4 },
  { id: 'school-vanguard', slug: 'vanguard-striking', name: 'Vanguard Striking', city: 'Miami', region: 'FL', styles: ['kickboxing', 'mma_amateur'], athletes: 39, rank: 5 },
];

export const athletes: DemoAthlete[] = [
  { id: 'a1', name: 'Kenji Tanaka', style: 'bjj', belt: 'Purple', weightKg: 76, age: 24, wins: 18, losses: 4 },
  { id: 'a2', name: 'Mia Silva', style: 'bjj', belt: 'Blue', weightKg: 61, age: 21, wins: 12, losses: 3 },
  { id: 'a3', name: 'Diego Garcia', style: 'karate', belt: 'Black', weightKg: 70, age: 28, wins: 31, losses: 9 },
  { id: 'a4', name: 'Aisha Okafor', style: 'taekwondo', belt: 'Red', weightKg: 57, age: 19, wins: 22, losses: 6 },
  { id: 'a5', name: 'Liam Nguyen', style: 'judo', belt: 'Brown', weightKg: 81, age: 26, wins: 15, losses: 7 },
  { id: 'a6', name: 'Sofia Rossi', style: 'bjj', belt: 'Blue', weightKg: 64, age: 23, wins: 9, losses: 5 },
  { id: 'a7', name: 'Noah Kim', style: 'taekwondo', belt: 'Black', weightKg: 68, age: 25, wins: 27, losses: 8 },
  { id: 'a8', name: 'Yuki Nakamura', style: 'karate', belt: 'Brown', weightKg: 62, age: 20, wins: 14, losses: 4 },
];

export const registrationsFeed = [
  { id: 'r1', athlete: 'Kenji Tanaka', school: 'Ironbound BJJ', division: 'BJJ Adult Purple -76kg', when: '4m ago' },
  { id: 'r2', athlete: 'Aisha Okafor', school: 'Summit Taekwondo', division: 'TKD Junior -57kg', when: '11m ago' },
  { id: 'r3', athlete: 'Diego Garcia', school: 'Ronin Academy', division: 'Karate Open Kumite', when: '23m ago' },
  { id: 'r4', athlete: 'Mia Silva', school: 'Ironbound BJJ', division: 'BJJ Adult Blue -61kg', when: '38m ago' },
  { id: 'r5', athlete: 'Liam Nguyen', school: 'Bushido Judo Club', division: 'Judo -81kg', when: '52m ago' },
];

export const matSchedule = [
  { mat: 1, division: 'BJJ Adult Purple -76kg', match: 'Quarterfinal 1', status: 'live' as const },
  { mat: 2, division: 'Karate Open Kumite', match: 'Semifinal', status: 'live' as const },
  { mat: 3, division: 'TKD Junior -57kg', match: 'Round of 16', status: 'ready' as const },
  { mat: 4, division: 'Judo -81kg', match: 'Final', status: 'pending' as const },
];

export function findTournament(slug: string): DemoTournament | undefined {
  return tournaments.find((t) => t.slug === slug);
}
export function findSchool(slug: string): DemoSchool | undefined {
  return schools.find((s) => s.slug === slug);
}
