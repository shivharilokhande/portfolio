/**
 * Service landing pages — one URL per thing a buyer actually searches for.
 *
 *   /services/workiva-consultant   "Workiva consultant", "Wdata integration", "Wdesk implementation partner"
 *   /services/fractional-cto       "fractional CTO India", "fractional tech lead for US startup"
 *   /services/scrum-master         "freelance scrum master", "offshore scrum master US hours"
 *
 * Each page is a real, indexable document: H1 with the keyword, a plain
 * answer paragraph (what AI assistants quote), proof, process, FAQ and CTA.
 */
export type ServicePage = {
  slug: string;
  keyword: string;            // primary search phrase (used in H1 + title)
  title: string;              // <title>
  description: string;        // meta description (≤155 chars)
  eyebrow: string;
  h1: string;
  answer: string;             // 2–3 sentence direct answer, quotable
  outcomes: { stat: string; label: string }[];
  deliverables: string[];
  process: { step: string; detail: string }[];
  fit: string[];              // "This is for you if…"
  faq: { q: string; a: string }[];
  priceNote: string;
  serviceType: string;        // schema.org Service.serviceType
  related: string[];          // other slugs
};

export const servicePages: ServicePage[] = [
  {
    slug: 'workiva-consultant',
    keyword: 'Workiva consultant',
    title: 'Workiva Consultant — Wdesk, Wdata & DataPrep Implementation | Shivhari Lokhande',
    description: 'Certified Workiva specialist for Wdesk financial reporting, Wdata processing chains and ERP/Salesforce API integrations. 50+ integrations shipped at EY, Deloitte and Accenture. US hours from India.',
    eyebrow: 'Workiva · Wdesk · Wdata · DataPrep',
    h1: 'Workiva consultant for finance teams that need reporting to just work',
    answer: 'I implement and integrate Workiva — Wdesk financial reporting with SOX-friendly audit trails, Wdata processing chains and DataPrep pipelines, and API connectors into ERPs, Salesforce and data warehouses. Across EY, Deloitte and Accenture I have shipped 50+ Workiva API integrations and 20+ Wdata chains, and I currently lead a 17-engineer Workiva-integrated reporting programme for a US client on US and India hours.',
    outcomes: [
      { stat: '50+', label: 'Workiva API integrations delivered' },
      { stat: '20+', label: 'Wdata processing chains in production' },
      { stat: '25%', label: 'reporting effort automated on current programme' },
      { stat: '2', label: 'Workiva specialisations (Reporting, Data Management)' },
    ],
    deliverables: [
      'Wdesk report build-out: linked source data, roll-forwards, XBRL-ready structure, review workflow',
      'Wdata processing chains and DataPrep pipelines with validation and exception handling',
      'ERP / Salesforce / warehouse integrations through the Workiva REST APIs, with a reusable connector library',
      'Audit-trail and SOX-control design so every number ties back to source',
      'Runbooks and hands-on training so your finance team owns the platform after go-live',
    ],
    process: [
      { step: 'Discovery (week 1)', detail: 'Map current reports, sources and close calendar; agree scope, controls and success metrics.' },
      { step: 'Build (weeks 2–6)', detail: 'Chains, connectors and Wdesk templates delivered in weekly increments you can review live.' },
      { step: 'Parallel run (1 close)', detail: 'Run the new flow beside the old one for a full period; reconcile, fix, sign off.' },
      { step: 'Handover', detail: 'Documentation, training and an optional retainer for the next two closes.' },
    ],
    fit: [
      'You are on Workiva (or moving to it) and the reporting still depends on spreadsheets and manual pastes.',
      'Your controllers spend the close chasing data instead of reviewing it.',
      'You need someone who has done the integration before, not a generalist learning on your invoice.',
    ],
    faq: [
      { q: 'Which Workiva products do you cover?', a: 'Wdesk (financial and management reporting), Wdata and DataPrep (data pipelines and processing chains), and the Workiva REST APIs for integrations. I hold the Workiva Financial Reporting Solutions and Data Management Suite specialisations.' },
      { q: 'Can you work with a US finance team from India?', a: 'Yes — my current programme is a US client run across US and India hours, with a weekly status pack and a live RAID log for leadership. Overlap hours are agreed up front.' },
      { q: 'How is a Workiva engagement priced?', a: 'Fixed-scope statements of work for implementations, or a monthly retainer for ongoing chain and connector ownership. The first 30-minute discovery call is free and ends with a written scope.' },
    ],
    priceNote: 'Fixed-scope SOW or monthly retainer · NDA and clean IP on every engagement',
    serviceType: 'Financial reporting platform implementation',
    related: ['fractional-cto', 'scrum-master'],
  },
  {
    slug: 'fractional-cto',
    keyword: 'Fractional CTO',
    title: 'Fractional CTO & Tech Lead for US Startups — India Hours | Shivhari Lokhande',
    description: 'Part-time CTO / tech lead who owns architecture, delivery cadence and the engineering team for founders and finance teams in the US. Java, Spring Boot, AWS, agile delivery. Six years, IIT to EY.',
    eyebrow: 'Fractional CTO · Tech Lead · Delivery',
    h1: 'Fractional CTO who ships, not just advises',
    answer: 'As a fractional CTO I take end-to-end ownership of a product engineering team a few days a week: architecture decisions, sprint cadence, hiring and coaching, and the roadmap conversation with founders and stakeholders. My background is hands-on — Java and Spring Boot microservices on AWS at Accenture, research engineering at IIT Bombay — and I currently run delivery for a 17-engineer programme for a US client.',
    outcomes: [
      { stat: '17', label: 'engineers led across US and India hours' },
      { stat: '78→94%', label: 'commitment-to-delivery in two quarters' },
      { stat: '~30%', label: 'faster delivery on a fixed-date engagement' },
      { stat: '6 yrs', label: 'IIT Bombay · Accenture · Deloitte · EY · CES' },
    ],
    deliverables: [
      'Architecture and technical decisions, written down as ADRs your team can follow',
      'Delivery cadence: sprint planning, reviews, retros, release management and a live RAID log',
      'Hiring plan, interview loop and onboarding for the first engineers',
      'Weekly founder/board-ready status: progress, risks, spend, next decisions',
      'Vendor and platform choices (cloud, payments, analytics) with cost in view',
    ],
    process: [
      { step: 'Audit (week 1)', detail: 'Codebase, infra, team and backlog review; a one-page plan with the three things to fix first.' },
      { step: 'Stabilise (month 1)', detail: 'Cadence, CI/CD, monitoring and a definition of done everyone can point at.' },
      { step: 'Scale (months 2–6)', detail: 'Roadmap execution, hiring, architecture evolution, cost control.' },
      { step: 'Hand over', detail: 'Coach an in-house lead or stay on a lighter retainer — your call.' },
    ],
    fit: [
      'You are a non-technical founder or a finance leader who inherited an engineering team.',
      'Releases slip, nobody can say why, and a full-time CTO is not in the budget yet.',
      'You want US-hours coverage without US-hours cost.',
    ],
    faq: [
      { q: 'How many days a week does a fractional CTO engagement take?', a: 'Typically 2–3 days a week for the first quarter, tapering to 1–2 once cadence and monitoring are in place. Everything is on a monthly retainer with a 30-day notice.' },
      { q: 'Do you write code?', a: 'When it unblocks the team — proofs of concept, reviews, the occasional critical fix. The job is to make the team faster, not to be the bottleneck.' },
      { q: 'What stacks do you know best?', a: 'Java and Spring Boot microservices, React and TypeScript front ends, PostgreSQL, AWS and Azure DevOps. I have also led Workiva and financial-reporting platforms end to end.' },
    ],
    priceNote: 'Monthly retainer · 2–3 days/week to start · 30-day notice',
    serviceType: 'Technical leadership',
    related: ['scrum-master', 'workiva-consultant'],
  },
  {
    slug: 'scrum-master',
    keyword: 'Scrum Master',
    title: 'Freelance Scrum Master & Delivery Lead — Offshore Teams on US Hours | Shivhari Lokhande',
    description: 'Certified Scrum Master (Scrum Alliance) who runs sprints, RAID and stakeholder reporting for offshore-onshore teams. Throughput 45→54 points, commitment 78→94% on current programme.',
    eyebrow: 'Scrum Master · Delivery Lead · CSM 2025',
    h1: 'Scrum Master who makes offshore–onshore delivery predictable',
    answer: 'I run the full Scrum cadence for distributed teams — planning, stand-ups, reviews, retros, refinement and scrum-of-scrums — plus the parts that keep clients calm: a live RAID log, definition of ready and done, and a weekly status pack for leadership. On my current 17-engineer programme sprint throughput moved from 45 to 54 points and commitment-to-delivery from 78% to 94% in two quarters.',
    outcomes: [
      { stat: '45→54', label: 'sprint points per sprint' },
      { stat: '78→94%', label: 'commitment-to-delivery' },
      { stat: '~20%', label: 'less rework on a fixed-scope engagement' },
      { stat: 'CSM', label: 'Scrum Alliance certified · PMP in progress' },
    ],
    deliverables: [
      'Sprint cadence set up and run: planning, daily, review, retro, refinement, scrum-of-scrums',
      'Backlog hygiene with the product owner: DoR, DoD, sizing, dependency mapping',
      'RAID log, weekly status pack and a single dashboard leadership actually reads',
      'Team coaching on estimation, WIP limits and honest commitments',
      'Coordination across US and India hours, including release and UAT windows',
    ],
    process: [
      { step: 'Baseline (sprint 0)', detail: 'Measure current throughput, carry-over and cycle time; agree the metrics we will move.' },
      { step: 'Cadence (sprints 1–2)', detail: 'Ceremonies in place, backlog cleaned, RAID live, status pack shipping weekly.' },
      { step: 'Improve (sprints 3–6)', detail: 'Retro actions tracked to closure; throughput and predictability trend published.' },
      { step: 'Sustain', detail: 'Coach an internal SM or continue part-time.' },
    ],
    fit: [
      'Your offshore team is busy but the client cannot see progress.',
      'Sprint commitments are optimistic and carry-over is normal.',
      'You need a delivery lead who has run programmes for US clients, not a ceremony facilitator.',
    ],
    faq: [
      { q: 'Can one Scrum Master handle multiple teams?', a: 'Two teams comfortably with scrum-of-scrums; beyond that I recommend a second SM and I take the delivery-lead layer.' },
      { q: 'Which tools do you use?', a: 'Jira and Azure DevOps for backlog and boards, Confluence or Notion for RAID and status, Miro for planning and retros.' },
      { q: 'Part-time or full-time?', a: 'Both. Part-time works from sprint 2 onward once cadence is set; full-time for turnarounds or programmes with more than two squads.' },
    ],
    priceNote: 'Part-time or full-time · monthly retainer · 30-day notice',
    serviceType: 'Agile delivery',
    related: ['fractional-cto', 'workiva-consultant'],
  },
];

export function findServicePage(slug: string | undefined): ServicePage | undefined {
  return servicePages.find((s) => s.slug === slug);
}
