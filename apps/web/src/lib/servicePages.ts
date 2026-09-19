/**
 * Service landing pages — one URL per thing a buyer actually searches for.
 *
 *   /services/workiva-consultant   "Workiva consultant", "Wdata integration", "Wdesk implementation partner"
 *   /services/forward-deployed-engineer  "forward deployed engineer", "embedded delivery engineer", "FDE India US hours"
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
    related: ['forward-deployed-engineer', 'scrum-master'],
  },
  {
    slug: 'forward-deployed-engineer',
    keyword: 'Forward Deployed Engineer',
    title: 'Forward Deployed Engineer — Embedded Delivery for US Finance & SaaS Teams | Shivhari Lokhande',
    description: 'Forward deployed engineer who embeds with your customer or finance team, builds the integrations and workflows on their systems, and owns delivery to go-live. Java, Spring Boot, Workiva APIs, AWS. US hours from India.',
    eyebrow: 'Forward Deployed Engineer · Embedded Delivery',
    h1: 'Forward deployed engineer who sits with the customer and ships',
    answer: 'A forward deployed engineer works inside the customer\u2019s environment rather than behind a product backlog: understanding their data and process, building the integrations, pipelines and workflows on their systems, and owning the outcome to go-live. That is the shape of my work today \u2014 a Workiva-integrated financial reporting programme for a US client, 17 engineers, US and India hours \u2014 and before it 50+ API integrations and 20+ Wdata chains delivered on-site with EY, Deloitte and Accenture clients.',
    outcomes: [
      { stat: '17', label: 'engineers coordinated on an embedded client programme' },
      { stat: '50+', label: 'customer-side API integrations shipped' },
      { stat: '78\u219294%', label: 'commitment-to-delivery in two quarters' },
      { stat: '6 yrs', label: 'IIT Bombay \u00b7 Accenture \u00b7 Deloitte \u00b7 EY \u00b7 CES' },
    ],
    deliverables: [
      'Discovery inside the customer\u2019s systems: data sources, process owners, controls, what \u201cdone\u201d means to them',
      'Integrations and workflows built on their stack \u2014 Java/Spring Boot services, REST APIs, Workiva, ERP and Salesforce connectors, AWS',
      'A working increment every week the customer can see, with the RAID log and status pack their leadership reads',
      'Feedback carried back to your product team as concrete tickets, not anecdotes',
      'Go-live, hypercare and handover so the customer\u2019s team runs it without me',
    ],
    process: [
      { step: 'Embed (week 1)', detail: 'Access, people, data and the first three problems worth solving \u2014 written down and agreed with the customer.' },
      { step: 'Build (weeks 2\u20138)', detail: 'Weekly increments on the customer\u2019s systems; demos to their stakeholders, not just yours.' },
      { step: 'Go-live', detail: 'Parallel run or staged cutover, hypercare, runbooks.' },
      { step: 'Scale or hand over', detail: 'Templatise what worked for the next customer, or hand to their team and step back.' },
    ],
    fit: [
      'You sell a platform (Workiva, a finance or data product) and enterprise customers need an engineer on their side to make it real.',
      'Your US customers want someone in their meetings who can also write the code \u2014 without a US-hours price.',
      'Implementation is slipping because product engineers are pulled into customer work they were not hired for.',
    ],
    faq: [
      { q: 'What is a forward deployed engineer?', a: 'An engineer who works embedded with a customer to deploy, integrate and adapt a product to that customer\u2019s systems and processes, owning the outcome rather than a ticket queue. The role blends solutions engineering, integration development and delivery management.' },
      { q: 'How is this different from a consultant or a fractional CTO?', a: 'A consultant advises; a forward deployed engineer builds and ships inside the customer environment, then feeds what they learn back to the product team. I still take the delivery-lead layer \u2014 cadence, RAID, status \u2014 because that is what keeps enterprise customers calm.' },
      { q: 'Which stacks and platforms?', a: 'Java and Spring Boot services, REST APIs, PostgreSQL, AWS and Azure DevOps; Workiva (Wdesk, Wdata, DataPrep) and its APIs; ERP and Salesforce integrations. React and TypeScript when the customer needs a front end.' },
      { q: 'Part-time or full-time, and on whose hours?', a: 'Both. Embedded engagements usually start full-time for the first customer, then taper. Overlap with US hours is agreed up front; my current programme runs across US and India time zones.' },
    ],
    priceNote: 'Per-customer engagement or monthly retainer \u00b7 30-day notice \u00b7 NDA and clean IP',
    serviceType: 'Forward deployed engineering / embedded delivery',
    related: ['workiva-consultant', 'scrum-master'],
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
    related: ['forward-deployed-engineer', 'workiva-consultant'],
  },
];

export function findServicePage(slug: string | undefined): ServicePage | undefined {
  return servicePages.find((s) => s.slug === slug);
}

/** Old URLs that once existed → where they live now (ServicePage redirects). */
export const legacyServiceSlugs: Record<string, string> = { 'fractional-cto': 'forward-deployed-engineer' };
