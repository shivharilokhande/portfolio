/**
 * Fallback copy for every section header + Hero right-card + Footer.
 *
 *   These strings are what the public site shows if the CMS row `copy` is
 *   missing / empty / unreachable. In production the row exists (seeded by
 *   Flyway V13) and admin can edit any of these values from
 *   /admin/portfolio → Site copy — no redeploy needed.
 */

export type SectionHeaderCopy = {
  eyebrow:     string;
  title:       string;
  description: string;
};

export type ContactTrustBullet = {
  icon: 'clock' | 'shield' | 'check' | 'sparkles' | 'lock';
  text: string;
};

export type ContactBlock = {
  /** Chips shown above the contact list ("Replies within 24 hours", etc). */
  trustBullets: ContactTrustBullet[];
  /** Blockquote testimonial rendered under the contact list. Set text/attribution
   *  to an empty string to hide the block entirely. */
  quote: { text: string; attribution: string };
  /** Short privacy note under the form ("Submitting sends an email…"). */
  privacyNote: string;
  /** Submit button labels — idle + submitting. */
  submitLabel:     string;
  submittingLabel: string;
  /** Message shown after a successful submission. */
  successMessage:  string;
  /** Field labels + placeholders for the form. */
  fields: {
    nameLabel:        string;
    namePlaceholder:  string;
    emailLabel:       string;
    emailPlaceholder: string;
    companyLabel:     string;
    companyPlaceholder: string;
    projectTypeLabel: string;
    projectTypePlaceholder: string;
    messageLabel:     string;
    messagePlaceholder: string;
  };
};

export type CopyDoc = {
  sectionHeaders: {
    about:        SectionHeaderCopy;
    skills:       SectionHeaderCopy;
    timeline:     SectionHeaderCopy;
    projects:     SectionHeaderCopy;
    services:     SectionHeaderCopy;
    testimonials: SectionHeaderCopy;
    contact:      SectionHeaderCopy;
  };
  aboutPillars: Array<{
    icon:  'code' | 'briefcase' | 'award' | 'graduation' | 'shield';
    title: string;
    text:  string;
  }>;
  heroCard: {
    eyebrow:   string;
    title:     string;
    body:      string;
    liveBadge: string;
    stats: Array<{ n: string; l: string }>;
    chips: string[];
  };
  contact: ContactBlock;
  footer: {
    creditsEyebrow:     string;
    creditsTitle:       string;   // "{name}" placeholder gets replaced with profile.name
    creditsBody:        string;
    contactCardEyebrow: string;
    contactCardTitle:   string;
    contactCardBody:    string;
    contactCtaLabel:    string;
    copyright:          string;   // "{year}" and "{name}" placeholders honoured
    versionTag:         string;
  };
};

export const copyDefaults: CopyDoc = {
  sectionHeaders: {
    about: {
      eyebrow:     'About',
      title:       'Built to ship. Trained to lead.',
      description: '',   // empty = fall back to profile.oneLiner (About section wires that)
    },
    skills: {
      eyebrow:     'Capabilities',
      title:       'Skills, mapped in three dimensions.',
      description: 'The cluster below is the real catalogue — hover any node for proficiency. To the right, the same data folded onto a radar so the shape of the practice is obvious at a glance.',
    },
    timeline: {
      eyebrow:     'Journey',
      title:       'Six years of compounding craft.',
      description: 'From Accenture floor to Big 4 consulting to leading squads at CES — every step deepened the same two muscles: ship hard things, lead the people doing it.',
    },
    projects: {
      eyebrow:     'Featured work · Store',
      title:       'Built once. Ready for you to ship.',
      description: 'Most of these are production-grade systems you can buy as source code in the store — hospital, hotel, pharmacy, salon, invoicing, appointment booking and more. The grey-badged tiles are private client case studies. Tap any tile to view it on the store.',
    },
    services: {
      eyebrow:     'Services',
      title:       'Four ways to work together.',
      description: 'Engagements scoped to your team. Rates are quoted on the discovery call so they reflect the work — not a hidden hourly meter. Retainers and statements-of-work both available.',
    },
    testimonials: {
      eyebrow:     'Voices · Store reviews',
      title:       'What buyers say about the products.',
      description: 'Verified reviews from teams running the source code I sell — hotels, clinics, pharmacies, salons, consultancies. Names lightly edited where buyers asked for privacy.',
    },
    contact: {
      eyebrow:     'Hire me',
      title:       "Let's build something great.",
      description: "Tell me about your team, your timeline, and the problem you're chewing on. I reply within 24 hours — usually faster.",
    },
  },
  aboutPillars: [
    { icon: 'code',      title: 'Engineer',   text: 'Java · Spring Boot · microservices · REST · AWS · Redis · MySQL.' },
    { icon: 'briefcase', title: 'Scrum Lead', text: 'CSM-certified. Coaching squads at CES, EY, Deloitte and Accenture.' },
  ],
  heroCard: {
    eyebrow:   'SHIPPING · NOW',
    title:     'Currently building',
    body:      'Enterprise platforms at CES Ltd · API design, observability, agile delivery.',
    liveBadge: 'Live',
    stats: [
      { n: '6+',  l: 'years'   },
      { n: '5',   l: 'firms'   },
      { n: '12k', l: 'commits' },
    ],
    chips: ['Java', 'Spring Boot', 'AWS', 'Workiva', 'Scrum'],
  },
  contact: {
    trustBullets: [
      { icon: 'clock',  text: 'Replies within 24 hours' },
      { icon: 'shield', text: 'NDA-friendly · zero spam' },
    ],
    quote: {
      text:        'Shipped two sprints ahead of plan. The kind of lead you keep.',
      attribution: 'Engagement Partner · EY GDS',
    },
    privacyNote:     'Submitting sends an email to me directly. No newsletter, no spam.',
    submitLabel:     'Send message',
    submittingLabel: 'Sending…',
    successMessage:  "Got it — I'll reply within 24 hours.",
    fields: {
      nameLabel:        'Your name',
      namePlaceholder:  'Ada Lovelace',
      emailLabel:       'Email',
      emailPlaceholder: 'ada@example.com',
      companyLabel:     'Company (optional)',
      companyPlaceholder: 'Acme Inc.',
      projectTypeLabel: 'Project type',
      projectTypePlaceholder: 'e.g. fractional CTO, Workiva integration, Spring Boot rescue',
      messageLabel:     'What are you trying to build?',
      messagePlaceholder: 'A few sentences on the problem, the team, and the timeline.',
    },
  },
  footer: {
    creditsEyebrow:     'END · CREDITS',
    creditsTitle:       'Built end to end by {name}',
    creditsBody:        'React Three Fiber, Framer Motion, GSAP ScrollTrigger over a Spring Boot + MySQL backend. Designed and shipped as a single editorial experience.',
    contactCardEyebrow: 'Ready for the next one',
    contactCardTitle:   'Want a similar build?',
    contactCardBody:    'Freelance & fractional CTO engagements open. Six-week pilot or three-month retainer.',
    contactCtaLabel:    'Start a conversation',
    copyright:          '© {year} {name} · Pune, India · Remote-first',
    versionTag:         'v1.0',
  },
};

/** Merge a partial CMS copy doc onto the defaults so missing keys never crash. */
export function mergeCopy(remote: unknown): CopyDoc {
  const r = (remote ?? {}) as Partial<CopyDoc>;
  const rHeaders = (r.sectionHeaders ?? {}) as Partial<CopyDoc['sectionHeaders']>;
  return {
    sectionHeaders: {
      about:        { ...copyDefaults.sectionHeaders.about,        ...(rHeaders.about        ?? {}) },
      skills:       { ...copyDefaults.sectionHeaders.skills,       ...(rHeaders.skills       ?? {}) },
      timeline:     { ...copyDefaults.sectionHeaders.timeline,     ...(rHeaders.timeline     ?? {}) },
      projects:     { ...copyDefaults.sectionHeaders.projects,     ...(rHeaders.projects     ?? {}) },
      services:     { ...copyDefaults.sectionHeaders.services,     ...(rHeaders.services     ?? {}) },
      testimonials: { ...copyDefaults.sectionHeaders.testimonials, ...(rHeaders.testimonials ?? {}) },
      contact:      { ...copyDefaults.sectionHeaders.contact,      ...(rHeaders.contact      ?? {}) },
    },
    aboutPillars: Array.isArray(r.aboutPillars) ? r.aboutPillars : copyDefaults.aboutPillars,
    heroCard:     { ...copyDefaults.heroCard,     ...((r.heroCard as Partial<CopyDoc['heroCard']>) ?? {}) },
    contact: {
      ...copyDefaults.contact,
      ...((r.contact as Partial<ContactBlock>) ?? {}),
      trustBullets: Array.isArray(r.contact?.trustBullets)
        ? r.contact!.trustBullets
        : copyDefaults.contact.trustBullets,
      quote:  { ...copyDefaults.contact.quote,  ...((r.contact?.quote  as Partial<ContactBlock['quote']>)  ?? {}) },
      fields: { ...copyDefaults.contact.fields, ...((r.contact?.fields as Partial<ContactBlock['fields']>) ?? {}) },
    },
    footer:       { ...copyDefaults.footer,       ...((r.footer   as Partial<CopyDoc['footer']>)   ?? {}) },
  };
}
