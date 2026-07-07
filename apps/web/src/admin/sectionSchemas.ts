/**
 * sectionSchemas.ts — declarative shape of every editable Portfolio section.
 *
 *  AdminPortfolioPage routes each section to the right editor:
 *   - 'profile'  → ProfileEditor (structured single-object form)
 *   - 'hero'     → HeroEditor    (structured single-object form)
 *   - 'skills'   → SkillsEditor  (nested categories + skills)
 *   - everything else → ArrayEditor with the schema below
 */

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'color'
  | 'csv-tags'       // comma-separated → string[]
  | 'pipe-list'      // pipe-separated → string[] (one bullet per pipe)
  | 'boolean'
  | 'url';

export type FieldSchema = {
  key:          string;
  label:        string;
  type:         FieldType;
  placeholder?: string;
  hint?:        string;
  rows?:        number;
  options?:     { value: string; label: string }[];
  required?:    boolean;
  /** Half-width on desktop when true */
  half?:        boolean;
};

export type SectionSchema = {
  itemLabel:   string;
  /** how to label the card heading (read-only summary) */
  cardTitle:   (item: Record<string, unknown>) => string;
  /** factory for a new empty item when "Add" is clicked */
  defaultItem: () => Record<string, unknown>;
  fields:      FieldSchema[];
};

/* ---------- Stats ---------- */

const STATS: SectionSchema = {
  itemLabel:   'Stat',
  cardTitle:   (i) => `${i.value ?? '?'} · ${i.label ?? ''}`,
  defaultItem: () => ({ value: '', label: '' }),
  fields: [
    { key: 'value', label: 'Value',  type: 'text', half: true, placeholder: '6+ · 4 · ₹30L+' },
    { key: 'label', label: 'Label',  type: 'text', half: true, placeholder: 'Years experience' },
  ],
};

/* ---------- Services ---------- */

const SERVICES: SectionSchema = {
  itemLabel:   'Service',
  cardTitle:   (i) => String(i.name ?? '(untitled)'),
  defaultItem: () => ({
    name: '', blurb: '', bullets: [], accent: 'brand', featured: false, tag: '',
  }),
  fields: [
    { key: 'name',     label: 'Name',     type: 'text', required: true },
    { key: 'blurb',    label: 'Blurb',    type: 'textarea', rows: 2 },
    { key: 'bullets',  label: 'Bullets',  type: 'pipe-list',
      hint: 'Separate bullets with the | character.' },
    { key: 'accent',   label: 'Accent',   type: 'select', half: true,
      options: [
        { value: 'brand',   label: 'Brand' },
        { value: 'brand2',  label: 'Cyan' },
        { value: 'accent',  label: 'Amber' },
        { value: 'emerald', label: 'Emerald' },
      ]},
    { key: 'tag',      label: 'Badge tag', type: 'text', half: true, placeholder: 'Most booked' },
    { key: 'featured', label: 'Featured (glowing card)', type: 'boolean' },
  ],
};

/* ---------- Projects ---------- */

const PROJECTS: SectionSchema = {
  itemLabel:   'Project',
  cardTitle:   (i) => String(i.title ?? '(untitled)'),
  defaultItem: () => ({
    id: '', title: '', blurb: '', stack: [], metric: '',
    accent: '#a855f7', span: 'sm', storeSlug: '', caseStudy: false,
  }),
  fields: [
    { key: 'id',         label: 'ID (slug)', type: 'text', required: true, half: true,
      placeholder: 'hospital-mgmt' },
    { key: 'title',      label: 'Title', type: 'text', required: true, half: true },
    { key: 'metric',     label: 'Metric chip', type: 'text', half: true,
      placeholder: 'Hospital · multi-tenant ready' },
    { key: 'accent',     label: 'Accent colour', type: 'color', half: true },
    { key: 'blurb',      label: 'Blurb',    type: 'textarea', rows: 3 },
    { key: 'stack',      label: 'Tech stack', type: 'csv-tags',
      hint: 'Comma-separated. Shown as chips on the card.' },
    { key: 'span',       label: 'Bento span', type: 'select', half: true,
      options: [
        { value: 'sm',   label: 'Small (1×1)' },
        { value: 'wide', label: 'Wide (2×1)' },
        { value: 'tall', label: 'Tall (1×2)' },
        { value: 'lg',   label: 'Large hero (2×2)' },
      ]},
    { key: 'storeSlug',  label: 'Store slug (if buyable)', type: 'text', half: true,
      placeholder: 'hospital-management-system' },
    { key: 'caseStudy',  label: 'Case study only (no buy CTA)', type: 'boolean' },
  ],
};

/* ---------- Testimonials ---------- */

const TESTIMONIALS: SectionSchema = {
  itemLabel:   'Voice',
  cardTitle:   (i) => `“${String(i.quote ?? '').slice(0, 60)}…” — ${i.name ?? ''}`,
  defaultItem: () => ({ quote: '', name: '', role: '', product: '' }),
  fields: [
    { key: 'quote',   label: 'Quote',          type: 'textarea', rows: 3, required: true },
    { key: 'name',    label: 'Person',         type: 'text', half: true, required: true },
    { key: 'role',    label: 'Role / company', type: 'text', half: true },
    { key: 'product', label: 'Product chip',   type: 'text',
      placeholder: 'Hospital Management System' },
  ],
};

/* ---------- Timeline ---------- */

const TIMELINE: SectionSchema = {
  itemLabel:   'Role',
  cardTitle:   (i) => `${i.role ?? ''} @ ${i.company ?? ''}`,
  defaultItem: () => ({ company: '', role: '', period: '', location: '', highlights: [] }),
  fields: [
    { key: 'company',    label: 'Company',  type: 'text', half: true, required: true },
    { key: 'role',       label: 'Role',     type: 'text', half: true, required: true },
    { key: 'period',     label: 'Period',   type: 'text', half: true, placeholder: 'Sep 2025 — Present' },
    { key: 'location',   label: 'Location', type: 'text', half: true, placeholder: 'Pune, IN' },
    { key: 'highlights', label: 'Highlights', type: 'pipe-list',
      hint: 'One achievement per | separator. Each becomes a bullet.' },
  ],
};

/* ---------- Education ---------- */

const EDUCATION: SectionSchema = {
  itemLabel:   'Degree',
  cardTitle:   (i) => `${i.degree ?? ''} (${i.year ?? ''})`,
  defaultItem: () => ({ degree: '', school: '', year: '' }),
  fields: [
    { key: 'degree', label: 'Degree', type: 'text', required: true },
    { key: 'school', label: 'School', type: 'text', required: true },
    { key: 'year',   label: 'Year',   type: 'text', half: true, placeholder: '2023' },
  ],
};

/* ---------- Certifications ---------- */

const CERTIFICATIONS: SectionSchema = {
  itemLabel:   'Certification',
  cardTitle:   (i) => `${i.name ?? ''} (${i.year ?? ''})`,
  defaultItem: () => ({ name: '', year: '' }),
  fields: [
    { key: 'name', label: 'Name', type: 'text', required: true },
    { key: 'year', label: 'Year', type: 'text', half: true, placeholder: '2026' },
  ],
};

export const sectionSchemas: Record<string, SectionSchema> = {
  stats:          STATS,
  services:       SERVICES,
  projects:       PROJECTS,
  testimonials:   TESTIMONIALS,
  timeline:       TIMELINE,
  education:      EDUCATION,
  certifications: CERTIFICATIONS,
};
