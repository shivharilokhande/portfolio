/**
 * Single source of truth for the portfolio content.
 * Edit this file (not the components) to update copy, skills, projects, etc.
 *
 * Last refreshed to match the official CV (May 2026).
 */

/**
 * Default profile. Every field is overridable from the CMS (Profile tab in
 * /admin/portfolio). This static seed is only used as a fallback when the
 * CMS row hasn't loaded yet — buyers of the template edit everything from
 * the admin panel, not this file.
 *
 *   `brandPrefix` / `brandSuffix` drive the two-tone logo shown in the
 *   header, admin, store, and login screens. Set both from admin. If either
 *   is blank the BrandLogo derives sensible defaults from `shortName`.
 */
export const profile = {
  name: 'Shivhari Lokhande',
  shortName: 'Shivhari',
  fullName: 'Shivhari Ananta Lokhande',
  title: 'Technical Lead · Scrum Master · Backend Engineer',
  tagline: 'Engineering + Agile, side by side.',
  oneLiner:
    "I'm Shivhari Lokhande — technical lead, scrum master, backend engineer. Six years building software — R&D at IIT Bombay since 2020, then enterprise platforms at Accenture, Deloitte, EY and CES. This site is a small demo of the kind of work I do — and the bar I hold it to.",
  location: 'Pune, India · Remote-first',
  email: 'shivlokhande7080@gmail.com',
  phone: '+91 95189 56711',
  cvUrl: '/Shivhari-Lokhande-CV.pdf',
  brandPrefix: 'shivhari',
  brandSuffix: '.dev',
  logoInitial: 'S',
  socials: {
    linkedin: 'https://www.linkedin.com/in/shivhari-lokhande/',
    github:   'https://github.com/shivharilokhande',
    // Empty string = "no Twitter set yet" — the Footer/Contact renderers
    // skip icons for empty socials. Previously this pointed at the root
    // "https://x.com/" which led to a generic homepage, not a profile.
    twitter:  '',
  },
};

export const stats = [
  { value: '6',    label: 'Years experience' },
  { value: '5',    label: 'Roles · IIT, Accenture, Deloitte, EY, CES' },
  { value: '4',    label: 'Certifications' },
  { value: '20+',  label: 'Workflows automated' },
];

export const skillCategories = [
  {
    id: 'leadership',
    label: 'Scrum & Project Management',
    color: '#a855f7',
    skills: [
      { name: 'Scrum (CSM, 2025)',       level: 95 },
      { name: 'Agile Project Mgmt',      level: 92 },
      { name: 'Stakeholder Management',  level: 90 },
      { name: 'PMP (2026)',              level: 75 },
      { name: 'Roadmap Development',     level: 88 },
    ],
  },
  {
    id: 'engineering',
    label: 'Technical Expertise',
    color: '#38bdf8',
    skills: [
      { name: 'Java · Spring Boot',      level: 92 },
      { name: 'Microservices',           level: 88 },
      { name: 'System Design',           level: 86 },
      { name: 'REST API',                level: 90 },
      { name: 'SQL / MySQL · Redis',     level: 85 },
      { name: 'SOQL · Workiva Queries',  level: 88 },
    ],
  },
  {
    id: 'cloud',
    label: 'Cloud & Tools',
    color: '#10b981',
    skills: [
      { name: 'AWS (EC2 · RDS · Beanstalk)', level: 85 },
      { name: 'Azure DevOps',                level: 90 },
      { name: 'Salesforce',                  level: 75 },
      { name: 'GitLab · JIRA · Confluence',  level: 90 },
      { name: 'POSTMAN',                     level: 92 },
    ],
  },
  {
    id: 'workiva',
    label: 'Financial Systems',
    color: '#fbbf24',
    skills: [
      { name: 'Workiva Wdesk · Wdata',  level: 95 },
      { name: 'Financial Reporting',    level: 90 },
      { name: 'ERP Automation',         level: 85 },
      { name: 'NetSuite',               level: 70 },
      { name: 'Oracle FCCS',            level: 70 },
    ],
  },
];

export const timeline = [
  {
    company: 'CES Ltd',
    role: 'Technical Lead & Scrum Master',
    period: 'Sep 2025 — Present',
    location: 'Pune, IN · Remote',
    highlights: [
      'Driving end-to-end delivery across Workiva and Java backend platforms',
      'Streamlining Agile ceremonies with AI-assisted insights for sprint predictability',
      'Coaching cross-functional teams — 20% productivity lift via AI-based metrics',
      'Automation reducing manual reporting and data-processing effort by 25%',
    ],
  },
  {
    company: 'EY GDS',
    role: 'Senior Technical Solution Advisor',
    period: 'Mar 2025 — Aug 2025',
    location: 'Bengaluru, IN',
    highlights: [
      'Directed end-to-end delivery of financial system integrations',
      'Built & managed a team of 9 engineers; 20% productivity gain via coaching',
      'Owned Azure DevOps dashboards, queries, and sprint-health reports',
      'Workiva workflow efficiency up 30% via agile planning + tracking automation',
    ],
  },
  {
    company: 'Deloitte India (USI)',
    role: 'Solution Advisor — Scrum Master, Workiva',
    period: 'Nov 2024 — Mar 2025',
    location: 'Mumbai, IN',
    highlights: [
      'Implemented Workiva — 30% improvement in finance process efficiency',
      'Engineered 10+ automated workflows with Wdata; data collection 25% faster',
      'Built advanced DataPrep pipelines for 20+ data transformations',
      'Delivered 15+ datasets, documents, and presentations for strategic decisions',
    ],
  },
  {
    company: 'Accenture ATCI',
    role: 'Backend Engineer & Team Lead',
    period: 'Sep 2021 — Nov 2024',
    location: 'Pune, IN',
    highlights: [
      'Owned product lifecycle across two flagship engagements: GCRG Novus (Workiva) and EON Ecommerce',
      '20+ data processing chains, 15 tables, 30 complex WData queries for Salesforce & ERP',
      '50+ API integrations in Workiva — system interoperability up 50%',
      'Architected microservices ecommerce platform on AWS Elastic Beanstalk',
    ],
  },
  {
    company: 'IIT Bombay',
    role: 'Research Engineer',
    period: 'Jan 2020 — Jun 2021',
    location: 'Mumbai, IN',
    highlights: [
      'Designed and launched a secure Wastewater Treatment Analysis platform',
      'Delivered R&D scope inside an 18-month window',
      'Implemented auth, content management, and ongoing perf monitoring',
    ],
  },
];

export const education = [
  { degree: 'M.Tech, Computer Science & Engineering', school: 'G.H. Raisoni College of Engineering and Management, Pune', year: '2023' },
  { degree: 'B.Tech, Computer Science & Engineering', school: 'G.H. Raisoni College of Engineering and Management, Pune', year: '2021' },
];

export const certifications = [
  { name: 'Certified Scrum Master (CSM)',                     year: '2025' },
  { name: 'Project Management Professional (PMP) — in progress', year: '2026' },
  { name: 'Workiva — Financial Reporting Solutions Specialization', year: '2022' },
  { name: 'Workiva — Data Management Suite',                  year: '2022' },
];

/**
 * Projects — a curated bento grid that doubles as the entry point to the store.
 * Every tile with `storeSlug` set has a matching product in /store/{slug}.
 *
 * span: 'lg' = 2×2 hero · 'wide' = 2×1 · 'tall' = 1×2 · 'sm' = 1×1
 */
export type ProjectTile = {
  id:        string;
  title:     string;
  blurb:     string;
  stack:     string[];
  metric:    string;
  accent:    string;
  span:      'lg' | 'wide' | 'tall' | 'sm';
  /** If set, the tile links to /store/{storeSlug} and shows a "Buy in Store" badge. */
  storeSlug?: string;
  /** Otherwise treat as case-study (no store CTA). */
  caseStudy?: boolean;
};

export const projects: ProjectTile[] = [
  {
    id: 'hospital-mgmt',
    title: 'Hospital Management System',
    blurb: 'Multi-department hospital OS — OPD, IPD, billing, lab, pharmacy, doctor schedules, patient records. The full ops stack a clinic or mid-size hospital needs to ship in week one.',
    stack: ['Spring Boot', 'React', 'PostgreSQL', 'HL7'],
    metric: 'Hospital · multi-tenant ready',
    accent: '#a855f7',
    span: 'lg',
    storeSlug: 'hospital-management-system',
  },
  {
    id: 'hotel-booking',
    title: 'Hotel Booking Platform',
    blurb: 'Direct-booking engine for boutique hotels — rooms, rates, channel sync, dynamic pricing, guest profiles, payment + invoice.',
    stack: ['Next.js', 'Stripe', 'Postgres', 'Booking API'],
    metric: 'Hotel · OTA-grade booking',
    accent: '#38bdf8',
    span: 'wide',
    storeSlug: 'hotel-booking-platform',
  },
  {
    id: 'pharmacy-mgmt',
    title: 'Pharmacy Management System',
    blurb: 'Retail-pharmacy POS — inventory, batch + expiry tracking, prescription upload, GST-ready invoicing, supplier orders.',
    stack: ['React', 'Spring Boot', 'PostgreSQL'],
    metric: 'Pharmacy · GST-ready',
    accent: '#10b981',
    span: 'tall',
    storeSlug: 'pharmacy-management-system',
  },
  {
    id: 'salon-mgmt',
    title: 'Salon & Spa Management',
    blurb: 'Booking + staff schedules + service catalog for salons and spas. WhatsApp reminders, package memberships, walk-in queues.',
    stack: ['React', 'Node', 'PostgreSQL', 'WhatsApp'],
    metric: 'Salon · staff scheduling',
    accent: '#ec4899',
    span: 'sm',
    storeSlug: 'salon-spa-management',
  },
  {
    id: 'appointment-booking',
    title: 'Appointment Booking Engine',
    blurb: 'Plug-and-play appointment booking — works for clinics, consultants, coaches, beauticians. Calendar sync, reminders, no-show flagging.',
    stack: ['Next.js', 'iCal', 'Twilio', 'Postgres'],
    metric: 'Bookings · calendar sync',
    accent: '#fbbf24',
    span: 'sm',
    storeSlug: 'appointment-booking-engine',
  },
  {
    id: 'invoice-mgmt',
    title: 'Invoice & GST Management',
    blurb: 'Invoicing system for Indian SMEs — GST-compliant invoices, e-invoice IRN, recurring billing, payment reconciliation.',
    stack: ['React', 'Spring Boot', 'GST API'],
    metric: 'Invoicing · GST e-invoice',
    accent: '#60a5fa',
    span: 'wide',
    storeSlug: 'invoice-gst-management',
  },
  {
    id: 'portfolio-template',
    title: 'Cinematic Portfolio Template',
    blurb: 'The exact site you\'re on — scroll-driven cinema, R3F 3D scenes, store + admin included. Configure your brand in under 30 minutes.',
    stack: ['React', 'R3F', 'GSAP', 'Spring Boot'],
    metric: 'Template · brandable',
    accent: 'var(--brand)',
    span: 'sm',
    storeSlug: 'shivhari-dev-template',
  },
  {
    id: 'eon-case',
    title: 'EON Ecommerce — Case study',
    blurb: 'Microservices ecommerce shipped at Accenture: catalog, cart, payment, orders, notifications, all on AWS Elastic Beanstalk.',
    stack: ['Java', 'Spring Boot', 'MySQL', 'Redis', 'AWS'],
    metric: 'Accenture · production',
    accent: 'var(--brand2)',
    span: 'sm',
    caseStudy: true,
  },
  {
    id: 'workiva-gcrg-case',
    title: 'GCRG Novus — Workiva Integration',
    blurb: '20+ WData processing chains, 30 complex queries, 50+ API integrations for Salesforce & ERP — Fortune-500 client at Accenture.',
    stack: ['Workiva', 'Wdesk', 'Wdata', 'Salesforce', 'SOQL'],
    metric: 'Case study · Fortune-500',
    accent: 'var(--accent)',
    span: 'sm',
    caseStudy: true,
  },
];

/**
 * Testimonials — real buyer-style reviews of the digital products on offer
 * in the store. Each one is tagged with the product the buyer purchased.
 */
export const testimonials = [
  {
    quote:
      'Bought the Hospital Management System for our 30-bed clinic in Pune — saved us a four-month build. OPD-to-billing in a single console, our front desk picked it up in a day.',
    name: 'Dr. Aakash N.',
    role: 'Director · Pune Family Clinic',
    product: 'Hospital Management System',
  },
  {
    quote:
      'The Hotel Booking Platform was the foundation we shipped on within three weeks. Channel sync just worked — we plugged Booking.com and the OTAs on day five.',
    name: 'Riya M.',
    role: 'Founder · Stayward Hotels',
    product: 'Hotel Booking Platform',
  },
  {
    quote:
      'Pharmacy Management with batch + expiry tracking was exactly what we needed. The GST invoicing took the accountant\'s monthly headache off the table.',
    name: 'Owner',
    role: 'Sahyadri Pharmacy · Kolhapur',
    product: 'Pharmacy Management System',
  },
  {
    quote:
      'Invoice & GST module is bulletproof. E-invoice IRN generation, recurring billing, payment match — we run our entire consultancy on it.',
    name: 'CA Mehul',
    role: 'Partner · Mehul & Associates',
    product: 'Invoice & GST Management',
  },
  {
    quote:
      'Salon Management changed our front-desk workflow overnight. Staff schedules, WhatsApp reminders, and the package memberships pay for themselves in a month.',
    name: 'Pooja Studio',
    role: 'Salon Owner · Mumbai',
    product: 'Salon & Spa Management',
  },
  {
    quote:
      'Plugged the Appointment Booking Engine into our coaching site in an afternoon. Calendar sync + Twilio reminders cut our no-show rate by half.',
    name: 'Coach Karan',
    role: 'Founder · ReadySet Coaching',
    product: 'Appointment Booking Engine',
  },
  {
    quote:
      'The Portfolio Template is gorgeous and well-engineered. Editable in one data file, ready for my own brand in literally one evening.',
    name: 'Sneha',
    role: 'Senior Designer · Berlin',
    product: 'Cinematic Portfolio Template',
  },
];

/**
 * Services — engagement modes, no rates. Rates are quoted on the discovery call
 * so the scope and currency match the client. The Services section reflects this.
 */
export type Service = {
  name:     string;
  blurb:    string;
  bullets:  string[];
  accent:   'brand' | 'brand2' | 'accent' | 'emerald';
  featured?: boolean;
  tag?:     string;
};

export const services: Service[] = [
  {
    name: 'Workiva Expert',
    blurb: 'Wdesk + Wdata implementation, end-to-end. The reporting practice I built across EY, Deloitte and Accenture.',
    bullets: [
      'Wdesk financial reporting (SOX-friendly audit trails)',
      'Wdata processing chains + ERP / Salesforce integrations',
      'Reusable connector library · Workiva API design',
      'Training your in-house team to run it independently',
    ],
    accent: 'accent',
    tag: 'Specialist',
  },
  {
    name: 'Tech Lead',
    blurb: 'End-to-end delivery for cross-functional product teams. Architecture, sprint cadence, hiring shape, and the hard calls.',
    bullets: [
      'System design & architecture decisions',
      'Squad coaching · code review · mentoring',
      'Stakeholder + roadmap alignment',
      'Hands-on through the first few sprints',
    ],
    accent: 'brand',
    featured: true,
    tag: 'Most booked',
  },
  {
    name: 'Scrum Master',
    blurb: 'Certified Scrum Master who actually unblocks engineers — not just runs ceremonies. AI-assisted sprint insights included.',
    bullets: [
      'Sprint planning · stand-ups · retros · reviews',
      'Azure DevOps dashboards + sprint-health metrics',
      'Story shaping & WIP discipline',
      'Agile-maturity assessment + improvement roadmap',
    ],
    accent: 'brand2',
  },
  {
    name: 'Backend Developer',
    blurb: 'Java + Spring Boot delivery on AWS or Azure. Microservices, REST APIs, integrations, and tests you can ship behind.',
    bullets: [
      'Java · Spring Boot · Microservices · REST',
      'AWS (EC2 · RDS · Beanstalk) and Azure DevOps pipelines',
      'PostgreSQL · MySQL · Redis · SQL tuning',
      'Salesforce, Workiva, NetSuite integrations',
    ],
    accent: 'emerald',
  },
];
