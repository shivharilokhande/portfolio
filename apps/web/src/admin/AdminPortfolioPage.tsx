/**
 * AdminPortfolioPage — Site settings.
 *
 *   Each tab represents one public-site section (Profile, Hero, About,
 *   Skills, Journey, Projects, Services, Testimonials, Contact, Footer)
 *   and shows EVERY editable thing for that section on one screen:
 *   the header (eyebrow / title / description), the array content, and
 *   any extras (Hero card, About pillars, Contact quote + form labels,
 *   etc.). No more hunting across two tabs to edit one section.
 *
 *   Under the hood the API model is unchanged: each array-section still
 *   lives at /api/admin/portfolio/{key}, and the shared "copy" section
 *   holds every header / hero-card / footer / contact-extras string.
 *   The `copySlices` file exposes small card editors — one per slice of
 *   the copy doc — that each save independently against the latest body.
 */
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save, Loader2, CheckCircle2, Code2, AlertCircle, FileText as FileTextIcon, Upload, Trash2,
  User, Sparkles, BarChart3, Layers, Briefcase, MessageSquare,
  Award, GraduationCap, Hammer, Compass, Plus, Info, Mail, PanelBottom, Scale,
} from 'lucide-react';
import { adminApi } from './adminApi';
import ArrayEditor   from './ArrayEditor';
import HeroEditor    from './HeroEditor';
import SkillsEditor  from './SkillsEditor';
import {
  SectionHeaderSlice, HeroCardSlice, AboutPillarsSlice,
  ContactBlockSlice, FooterSlice,
} from './copySlices';
import { sectionSchemas } from './sectionSchemas';

/**
 * Keys the app cannot function without — these render as expected shapes in
 * every consumer (Hero, About, Skills, etc.). Delete on these is disabled so
 * an accidental click doesn't leave the public site with fallback data only.
 * The row can still be edited and its content wiped; only removing the row
 * itself is blocked.
 */
const CORE_KEYS = new Set([
  'profile', 'hero', 'copy', 'stats', 'skills', 'projects', 'services',
  'testimonials', 'timeline', 'education', 'certifications', 'siteMeta',
  'legal.terms', 'legal.privacy', 'legal.refund',
]);

type Section = { key: string; label: string; body: unknown; updatedAt: string };

const easeOut = [0.16, 1, 0.3, 1] as const;

/**
 * Ordered list of unified tabs shown in the sidebar. Each tab composes
 * whatever cards (array editors + copy slices) belong to that public-site
 * section, so admins never have to jump around to edit one section.
 *
 * Order matches the visual order on the public site (top-to-bottom scroll).
 * The `key` is a UI-only identifier — the underlying DB rows are still keyed
 * separately (see the `find(sections, ...)` calls in `renderTab`).
 */
const TAB_ORDER: Array<{ key: string; label: string; icon: React.ReactNode }> = [
  { key: 'profile',      label: 'Profile & identity',       icon: <User size={14} /> },
  { key: 'hero',         label: 'Hero (top of page)',       icon: <Sparkles size={14} /> },
  { key: 'about',        label: 'About',                    icon: <Info size={14} /> },
  { key: 'skills',       label: 'Skills',                   icon: <Layers size={14} /> },
  { key: 'timeline',     label: 'Journey (timeline)',       icon: <Compass size={14} /> },
  { key: 'projects',     label: 'Projects',                 icon: <Hammer size={14} /> },
  { key: 'services',     label: 'Services',                 icon: <Briefcase size={14} /> },
  { key: 'testimonials', label: 'Testimonials',             icon: <MessageSquare size={14} /> },
  { key: 'contact',      label: 'Contact',                  icon: <Mail size={14} /> },
  { key: 'footer',       label: 'Footer',                   icon: <PanelBottom size={14} /> },
  { key: 'legal',        label: 'Legal (ToS · Privacy · Refund)', icon: <Scale size={14} /> },
];

/** Look up a section by DB key from the loaded list, or null if missing. */
function find(sections: Section[] | null, key: string): Section | null {
  if (!sections) return null;
  return sections.find((s) => s.key === key) ?? null;
}

/** Small placeholder shown when the DB row a tab depends on hasn't been seeded yet. */
function MissingRow({ name }: { name: string }) {
  return (
    <div className="tier-3 ambient-float p-6 text-sm text-ink-soft">
      The <code>{name}</code> CMS row hasn&apos;t been seeded yet. Run the latest Flyway migration
      (or reset the DB) and refresh.
    </div>
  );
}

export default function AdminPortfolioPage() {
  const [sections, setSections] = useState<Section[] | null>(null);
  const [activeKey, setActiveKey] = useState<string>('profile');
  const [err, setErr] = useState<string | null>(null);
  const [showNewSection, setShowNewSection] = useState(false);
  const [customTab, setCustomTab] = useState<string | null>(null); // user-created custom section

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);
  async function load() {
    try {
      const r = await adminApi.listSections();
      setSections(r as Section[]);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load sections.');
    }
  }

  async function handleDelete(key: string, label: string) {
    if (CORE_KEYS.has(key)) {
      setErr(`"${label}" is a core section — clear its content instead of deleting the row.`);
      return;
    }
    if (!confirm(`Delete section "${label}"? This can't be undone.`)) return;
    try {
      await adminApi.deleteSection(key);
      setErr(null);
      setCustomTab(null);
      setActiveKey('profile');
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Delete failed.');
    }
  }

  // Custom (non-core) sections created via "New section" show up as extra
  // tabs after the built-in ten.
  const customSections = (sections ?? []).filter((s) => !CORE_KEYS.has(s.key));

  return (
    <div>
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-label-md text-primary">cms</p>
          <h1 className="mt-3 font-display text-3xl tracking-tight">Site settings</h1>
          <p className="mt-1 text-ink-soft text-sm">
            Every section on the public site — headers, sentences, chips, stats, arrays. Edit it here, changes go live immediately.
          </p>
        </div>
        <button
          onClick={() => setShowNewSection(true)}
          className="btn-primary text-sm"
        >
          <Plus size={14} /> New section
        </button>
      </header>

      {err && (
        <div className="mt-6 px-4 py-3 rounded-xl bg-rose-50 text-rose-700 text-sm inline-flex items-center gap-2">
          <AlertCircle size={14} /> {err}
        </div>
      )}

      {!sections && !err && (
        <div className="mt-6 tier-3 ambient-float p-12 grid place-items-center text-ink-soft">
          <Loader2 size={20} className="animate-spin" />
        </div>
      )}

      {sections && (
        <div className="mt-7 grid lg:grid-cols-12 gap-6">
          {/* Sidebar tabs — one entry per public-site section */}
          <aside className="lg:col-span-3">
            <ul className="tier-3 ambient-float p-2 sticky top-24 flex flex-row lg:flex-col overflow-x-auto lg:overflow-visible">
              {TAB_ORDER.map((t) => (
                <li key={t.key} className="shrink-0">
                  <button
                    onClick={() => { setActiveKey(t.key); setCustomTab(null); }}
                    className={`w-full inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                      activeKey === t.key && customTab === null
                        ? 'bg-gradient-to-br from-primary to-primary-soft text-on-primary ambient-float'
                        : 'text-ink-soft hover:text-ink hover:bg-surface-low'
                    }`}
                  >
                    {t.icon}<span>{t.label}</span>
                  </button>
                </li>
              ))}
              {customSections.length > 0 && (
                <>
                  <li className="mt-2 px-3 py-1 text-[10.5px] font-num text-muted tracking-wider uppercase">Custom sections</li>
                  {customSections.map((s) => (
                    <li key={s.key} className="shrink-0">
                      <button
                        onClick={() => { setCustomTab(s.key); setActiveKey('__custom__'); }}
                        className={`w-full inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                          customTab === s.key
                            ? 'bg-gradient-to-br from-primary to-primary-soft text-on-primary ambient-float'
                            : 'text-ink-soft hover:text-ink hover:bg-surface-low'
                        }`}
                      >
                        <Code2 size={14} /><span>{s.label}</span>
                      </button>
                    </li>
                  ))}
                </>
              )}
            </ul>
          </aside>

          {/* Editor — one tab worth of cards. Keyed so switching tabs
              unmounts / remounts cleanly. */}
          <div className="lg:col-span-9 space-y-4">
            <motion.div
              key={customTab ?? activeKey}
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, ease: easeOut }}
              className="space-y-4"
            >
              {customTab !== null
                ? renderCustomTab(customTab, sections, load, () => {
                    const cs = sections.find((s) => s.key === customTab);
                    if (cs) handleDelete(cs.key, cs.label);
                  })
                : renderTab(activeKey, sections, load)}
            </motion.div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showNewSection && (
          <NewSectionDialog
            onClose={() => setShowNewSection(false)}
            onCreated={async (key) => {
              setShowNewSection(false);
              await load();
              setCustomTab(key);
              setActiveKey('__custom__');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------- Tab renderers ---------- */

function renderTab(tabKey: string, sections: Section[], reload: () => void): React.ReactNode {
  switch (tabKey) {
    case 'profile': {
      const s = find(sections, 'profile');
      return s ? <ProfileEditor section={s} onSaved={reload} /> : <MissingRow name="profile" />;
    }
    case 'hero': {
      const hero = find(sections, 'hero');
      const copy = find(sections, 'copy');
      return (
        <>
          {hero
            ? <HeroEditor sectionKey="hero" label={hero.label} body={hero.body} onSaved={reload} />
            : <MissingRow name="hero" />}
          {copy && <HeroCardSlice section={copy} />}
        </>
      );
    }
    case 'about': {
      const copy = find(sections, 'copy');
      const stats = find(sections, 'stats');
      const education = find(sections, 'education');
      const certifications = find(sections, 'certifications');
      return (
        <>
          {copy
            ? <SectionHeaderSlice section={copy} headerKey="about"
                                  title="About — section header"
                                  description="Eyebrow, title, description. Leave description empty to fall back to your profile one-liner." />
            : <MissingRow name="copy" />}
          {copy && <AboutPillarsSlice section={copy} />}
          {stats && <ArrayEditor sectionKey="stats" label="Headline stats (the 4 tiles)" body={stats.body} onSaved={reload} />}
          {education && <ArrayEditor sectionKey="education" label="Education" body={education.body} onSaved={reload} />}
          {certifications && <ArrayEditor sectionKey="certifications" label="Certifications" body={certifications.body} onSaved={reload} />}
        </>
      );
    }
    case 'skills': {
      const copy = find(sections, 'copy');
      const skills = find(sections, 'skills');
      return (
        <>
          {copy && <SectionHeaderSlice section={copy} headerKey="skills"
                                       title="Skills — section header" />}
          {skills
            ? <SkillsEditor sectionKey="skills" label="Skills pillars" body={skills.body} onSaved={reload} />
            : <MissingRow name="skills" />}
        </>
      );
    }
    case 'timeline': {
      const copy = find(sections, 'copy');
      const timeline = find(sections, 'timeline');
      return (
        <>
          {copy && <SectionHeaderSlice section={copy} headerKey="timeline"
                                       title="Journey — section header" />}
          {timeline
            ? <ArrayEditor sectionKey="timeline" label="Career chapters" body={timeline.body} onSaved={reload} />
            : <MissingRow name="timeline" />}
        </>
      );
    }
    case 'projects': {
      const copy = find(sections, 'copy');
      const projects = find(sections, 'projects');
      return (
        <>
          {copy && <SectionHeaderSlice section={copy} headerKey="projects"
                                       title="Projects — section header" />}
          {projects
            ? <ArrayEditor sectionKey="projects" label="Project tiles" body={projects.body} onSaved={reload} />
            : <MissingRow name="projects" />}
        </>
      );
    }
    case 'services': {
      const copy = find(sections, 'copy');
      const services = find(sections, 'services');
      return (
        <>
          {copy && <SectionHeaderSlice section={copy} headerKey="services"
                                       title="Services — section header" />}
          {services
            ? <ArrayEditor sectionKey="services" label="Service cards" body={services.body} onSaved={reload} />
            : <MissingRow name="services" />}
        </>
      );
    }
    case 'testimonials': {
      const copy = find(sections, 'copy');
      const testimonials = find(sections, 'testimonials');
      return (
        <>
          {copy && <SectionHeaderSlice section={copy} headerKey="testimonials"
                                       title="Testimonials — section header" />}
          {testimonials
            ? <ArrayEditor sectionKey="testimonials" label="Reviews" body={testimonials.body} onSaved={reload} />
            : <MissingRow name="testimonials" />}
        </>
      );
    }
    case 'contact': {
      const copy = find(sections, 'copy');
      return (
        <>
          {copy
            ? <>
                <SectionHeaderSlice section={copy} headerKey="contact"
                                    title="Contact — section header" />
                <ContactBlockSlice section={copy} />
              </>
            : <MissingRow name="copy" />}
        </>
      );
    }
    case 'footer': {
      const copy = find(sections, 'copy');
      return copy ? <FooterSlice section={copy} /> : <MissingRow name="copy" />;
    }
    case 'legal': {
      const terms   = find(sections, 'legal.terms');
      const privacy = find(sections, 'legal.privacy');
      const refund  = find(sections, 'legal.refund');
      return (
        <>
          <div className="tier-1 p-4 text-xs text-ink-soft">
            <b>These are template documents.</b> Replace every <code>[YOUR …]</code> placeholder with
            your real name, domain, jurisdiction and support email BEFORE going live. Have a lawyer
            familiar with your jurisdiction review them, especially the Refund Policy which every
            payment gateway audits before approving live-mode. The markdown-ish body supports
            <code>## Heading</code>, <code>### Sub-heading</code>, <code>**bold**</code>, <code>- list item</code>,
            and <code>[link text](/url)</code>.
          </div>
          {terms   ? <RawJsonEditor sectionKey="legal.terms"   label="Terms of Service" body={terms.body}   onSaved={reload} /> : <MissingRow name="legal.terms" />}
          {privacy ? <RawJsonEditor sectionKey="legal.privacy" label="Privacy Policy"   body={privacy.body} onSaved={reload} /> : <MissingRow name="legal.privacy" />}
          {refund  ? <RawJsonEditor sectionKey="legal.refund"  label="Refund Policy"    body={refund.body}  onSaved={reload} /> : <MissingRow name="legal.refund" />}
        </>
      );
    }
    default:
      return <MissingRow name={tabKey} />;
  }
}

/** Custom user-created section — falls back to the schema-based ArrayEditor
 *  or the RawJsonEditor for unknown shapes. */
function renderCustomTab(
  key: string,
  sections: Section[],
  reload: () => void,
  onDelete: () => void,
): React.ReactNode {
  const s = sections.find((x) => x.key === key);
  if (!s) return <MissingRow name={key} />;
  const editor = sectionSchemas[s.key]
    ? <ArrayEditor sectionKey={s.key} label={s.label} body={s.body} onSaved={reload} />
    : <RawJsonEditor sectionKey={s.key} label={s.label} body={s.body} onSaved={reload} />;
  return (
    <>
      {editor}
      <SectionAdminCard
        section={s}
        onRenamed={reload}
        onDelete={onDelete}
        deletable={true}
      />
    </>
  );
}

/* ---------- Section admin card (rename + delete) ---------- */

function SectionAdminCard({
  section, onRenamed, onDelete, deletable,
}: {
  section: Section;
  onRenamed: () => void;
  onDelete: () => void;
  deletable: boolean;
}) {
  const [label, setLabel] = useState(section.label);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const dirty = label.trim() !== section.label && label.trim().length > 0;

  // Keep the input in sync when the parent swaps sections.
  useEffect(() => { setLabel(section.label); }, [section.key, section.label]);

  async function rename() {
    setBusy(true); setErr(null);
    try {
      await adminApi.updateSection(section.key, section.body, label.trim());
      onRenamed();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Rename failed.');
    } finally { setBusy(false); }
  }

  return (
    <div className="mt-4 tier-1 p-4 grid sm:grid-cols-2 gap-4">
      <div>
        <p className="text-sm font-medium text-ink">Display label</p>
        <p className="text-[11px] text-muted">
          This is the name shown on the sidebar. The <code>key</code> ({section.key}) is
          fixed — only the label is editable.
        </p>
        <div className="mt-2 flex items-center gap-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="input-clean py-2 text-sm flex-1"
          />
          <button
            onClick={rename}
            disabled={!dirty || busy}
            className="btn-primary text-sm disabled:opacity-60"
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Rename
          </button>
        </div>
        {err && (
          <p className="mt-2 text-xs text-rose-700 inline-flex items-center gap-1.5">
            <AlertCircle size={12} /> {err}
          </p>
        )}
      </div>

      <div>
        <p className="text-sm font-medium text-ink">Danger zone</p>
        <p className="text-[11px] text-muted">
          {deletable
            ? 'Delete removes this custom section entirely. The site keeps working.'
            : 'This is a core section — clear its content instead of deleting the row.'}
        </p>
        <button
          onClick={onDelete}
          disabled={!deletable}
          className="mt-2 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-red-700 hover:bg-red-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Trash2 size={13} /> Delete section
        </button>
      </div>
    </div>
  );
}

/* ---------- New-section dialog ---------- */

function NewSectionDialog({
  onClose, onCreated,
}: { onClose: () => void; onCreated: (key: string) => void }) {
  const [key, setKey] = useState('');
  const [label, setLabel] = useState('');
  const [shape, setShape] = useState<'array' | 'object'>('array');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!/^[a-zA-Z0-9._-]+$/.test(key)) {
      setErr('Key must be alphanumeric (with . _ -). No spaces.'); return;
    }
    if (!label.trim()) {
      setErr('Label is required — this is what shows on the sidebar.'); return;
    }
    setBusy(true); setErr(null);
    try {
      await adminApi.createSection(key.trim(), label.trim(), shape === 'array' ? [] : {});
      onCreated(key.trim());
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Create failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-md tier-3 ambient-float-lg p-6"
        initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 16, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-lg tracking-tight">New CMS section</h2>
        <p className="mt-1 text-[11px] text-muted">
          The frontend reads this at <code>/api/portfolio/{'{key}'}</code>. Point a
          new <code>useSection</code> hook at the same key to render it.
        </p>

        <label className="block mt-5">
          <span className="text-sm font-medium text-ink">Key</span>
          <input
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="e.g. awards, speaking, press-kit"
            className="input-clean mt-2"
            autoFocus
          />
          <p className="mt-1 text-[11px] text-muted">Alphanumeric, dot, dash, or underscore. Max 64.</p>
        </label>

        <label className="block mt-4">
          <span className="text-sm font-medium text-ink">Label</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Human-readable name for the sidebar"
            className="input-clean mt-2"
          />
        </label>

        <fieldset className="mt-4">
          <legend className="text-sm font-medium text-ink">Shape</legend>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {(['array', 'object'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setShape(s)}
                className={`px-3 py-2 rounded-lg text-sm transition ${
                  shape === s
                    ? 'bg-gradient-to-br from-primary to-primary-soft text-on-primary ambient-float'
                    : 'surface-low ghost-line text-ink-soft hover:bg-surface-container'
                }`}
              >
                {s === 'array' ? '[ ] list of items' : '{ } single object'}
              </button>
            ))}
          </div>
        </fieldset>

        {err && (
          <p className="mt-4 text-sm text-rose-700 inline-flex items-center gap-1.5">
            <AlertCircle size={13} /> {err}
          </p>
        )}

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-lg text-sm text-ink-soft hover:text-ink hover:bg-surface-container transition"
          >Cancel</button>
          <button onClick={submit} disabled={busy} className="btn-primary text-sm disabled:opacity-60">
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Create
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ---------- Profile structured form ---------- */

function ProfileEditor({ section, onSaved }: { section: Section; onSaved: () => void }) {
  type ProfileShape = Record<string, string>;
  // Flatten any pre-existing nested `socials` blob so the form fields hydrate.
  // We re-nest on save so the consumers (Contact, Footer) can read
  // `profile.socials.linkedin` reliably.
  const raw = (section.body as unknown as (ProfileShape & { socials?: ProfileShape })) ?? {};
  // Strip nested `socials` out of the flat map before spread so the resulting
  // shape stays a Record<string, string>.
  const { socials: nested, ...flat } = raw;
  const initial: ProfileShape = {
    ...(flat as ProfileShape),
    linkedin: (flat.linkedin as string | undefined) ?? nested?.linkedin ?? '',
    github:   (flat.github   as string | undefined) ?? nested?.github   ?? '',
    twitter:  (flat.twitter  as string | undefined) ?? nested?.twitter  ?? '',
  };
  const [data, setData] = useState<ProfileShape>(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg]   = useState<string | null>(null);
  const [err, setErr]   = useState<string | null>(null);

  function set(k: string, v: string) { setData((d) => ({ ...d, [k]: v })); }

  async function save() {
    setBusy(true); setErr(null); setMsg(null);
    try {
      // Emit BOTH the nested `socials` object (canonical shape read by the site)
      // and the flat keys (so /admin can round-trip its form). Callers merge
      // shallowly, so both survive.
      const payload = {
        ...data,
        socials: {
          linkedin: data.linkedin ?? '',
          github:   data.github   ?? '',
          twitter:  data.twitter  ?? '',
        },
      };
      await adminApi.updateSection(section.key, payload, section.label);
      setMsg('Saved.');
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setBusy(false);
    }
  }

  // NOTE: `cvUrl` is deliberately NOT surfaced as an editable text field.
  // The `<CvUploader />` card below owns it end-to-end: upload writes
  // `/api/profile/cv?v=<timestamp>` into cvUrl on save, delete clears it.
  // Buyers of the template only interact with the file — no URL editing.
  const fields: { key: string; label: string; long?: boolean }[] = [
    { key: 'fullName',    label: 'Full name' },
    { key: 'name',        label: 'Display name' },
    { key: 'shortName',   label: 'Short name (used in dashboard greeting)' },
    { key: 'title',       label: 'Title' },
    { key: 'tagline',     label: 'Tagline (short)' },
    { key: 'oneLiner',    label: 'One-liner (paragraph)', long: true },
    { key: 'location',    label: 'Location' },
    { key: 'email',       label: 'Email' },
    { key: 'phone',       label: 'Phone' },
    // Brand identity — drives the two-tone logo in the header, store,
    // admin, and login. Leave any of them blank and the site derives a
    // default from shortName.
    { key: 'brandPrefix', label: 'Brand — coloured half (e.g. shivhari)' },
    { key: 'brandSuffix', label: 'Brand — muted half (e.g. .tech, .dev, .com)' },
    { key: 'logoInitial', label: 'Brand — square badge letter (e.g. S)' },
    { key: 'linkedin',    label: 'LinkedIn URL' },
    { key: 'github',      label: 'GitHub URL' },
    { key: 'twitter',     label: 'Twitter / X URL' },
  ];

  return (
    <section className="tier-3 ambient-float p-6 sm:p-7">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg tracking-tight">{section.label}</h2>
          <p className="text-[11px] text-muted font-num">key: {section.key}</p>
        </div>
        <button
          onClick={save}
          disabled={busy}
          className="btn-primary text-sm disabled:opacity-60"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
        </button>
      </header>

      <div className="mt-5 grid sm:grid-cols-2 gap-4">
        {fields.map((f) => (
          <label key={f.key} className={f.long ? 'sm:col-span-2 block' : 'block'}>
            <span className="text-sm font-medium text-ink">{f.label}</span>
            {f.long ? (
              <textarea
                rows={4}
                value={data[f.key] ?? ''}
                onChange={(e) => set(f.key, e.target.value)}
                className="input-clean mt-2 resize-y"
              />
            ) : (
              <input
                value={data[f.key] ?? ''}
                onChange={(e) => set(f.key, e.target.value)}
                className="input-clean mt-2"
              />
            )}
          </label>
        ))}
      </div>

      {/* CV file uploader — separate from the URL field, so admins can drop a
          PDF instead of hosting one elsewhere. On upload/delete the backend
          patches profile.cvUrl automatically. */}
      <CvUploader currentUrl={data.cvUrl ?? ''} onChange={(url) => set('cvUrl', url)} />

      <Banner ok={msg} err={err} />
    </section>
  );
}

/**
 * PDF-only CV upload card. Overwrites the single CV on the server and
 * writes the served URL into the profile section's cvUrl field so the
 * public Hero button picks it up immediately via CMS live sync.
 */
function CvUploader({ currentUrl, onChange }: { currentUrl: string; onChange: (url: string) => void }) {
  const [status, setStatus] = useState<{ exists: boolean; sizeBytes?: number; updatedAt?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [pct, setPct]   = useState<number | null>(null);
  const [err, setErr]   = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try { const s = await adminApi.cvStatus(); if (!cancelled) setStatus(s); }
      catch { /* ignore — treat as no CV */ }
    })();
    return () => { cancelled = true; };
  }, []);

  async function onFile(file: File) {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setErr('CV must be a PDF file.'); return;
    }
    if (file.size > 10 * 1024 * 1024) { setErr('PDF must be ≤ 10 MB.'); return; }
    setBusy(true); setErr(null); setPct(0);
    try {
      const r = await adminApi.uploadCv(file, (p) => setPct(p));
      onChange(r.url);
      setStatus({ exists: true, sizeBytes: r.sizeBytes, updatedAt: new Date().toISOString() });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setBusy(false); setPct(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  async function onRemove() {
    if (!confirm('Remove the uploaded CV?')) return;
    setBusy(true); setErr(null);
    try {
      await adminApi.removeCv();
      setStatus({ exists: false });
      onChange('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Delete failed.');
    } finally { setBusy(false); }
  }

  const uploaded = status?.exists ?? false;

  return (
    <section className="mt-6 tier-1 p-5">
      <div className="flex items-center gap-3">
        <span className="w-9 h-9 rounded-xl surface-lowest grid place-items-center text-primary ambient-float">
          <FileTextIcon size={16} />
        </span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-ink">CV / résumé (PDF)</p>
          <p className="text-[11px] text-muted">
            {uploaded
              ? `On server${status?.sizeBytes ? ` · ${(status.sizeBytes / 1024).toFixed(0)} KB` : ''} · public download link is live`
              : 'No CV uploaded yet. The Download CV button on the site stays hidden until you upload one.'}
          </p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,.pdf"
          onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
          className="sr-only"
          id="cv-file-input"
        />
        <label
          htmlFor="cv-file-input"
          className={`btn-tertiary text-sm cursor-pointer ${busy ? 'opacity-60 pointer-events-none' : ''}`}
        >
          {busy && pct !== null
            ? <><Loader2 size={13} className="animate-spin" /> {pct}%</>
            : <><Upload size={13} /> {uploaded ? 'Replace' : 'Upload PDF'}</>}
        </label>
        {uploaded && (
          <button
            onClick={onRemove}
            disabled={busy}
            className="p-2 rounded-lg text-ink-soft hover:text-red-700 hover:bg-red-50 transition disabled:opacity-50"
            aria-label="Remove CV"
          ><Trash2 size={13} /></button>
        )}
      </div>
      {err && (
        <p className="mt-2 text-xs text-rose-700 inline-flex items-center gap-1.5">
          <AlertCircle size={12} /> {err}
        </p>
      )}
    </section>
  );
}

/* dispatchEditor removed — tab rendering is handled by renderTab / renderCustomTab above. */

/**
 * RawJsonEditor — universal fallback for any CMS section that doesn't have
 * a structured schema. Presents the JSON body in a monospace textarea,
 * validates on save, and offers Format + Revert affordances.
 */
function RawJsonEditor({
  sectionKey, label, body, onSaved,
}: {
  sectionKey: string;
  label: string;
  body: unknown;
  onSaved: () => void;
}) {
  const initial = JSON.stringify(body ?? {}, null, 2);
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg]   = useState<string | null>(null);
  const [err, setErr]   = useState<string | null>(null);
  const dirty = text !== initial;

  async function save() {
    setBusy(true); setErr(null); setMsg(null);
    try {
      const parsed = JSON.parse(text);
      await adminApi.updateSection(sectionKey, parsed, label);
      setMsg('Saved.');
      onSaved();
    } catch (e) {
      if (e instanceof SyntaxError) setErr('Invalid JSON: ' + e.message);
      else setErr(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setBusy(false);
    }
  }

  function format() {
    try {
      setText(JSON.stringify(JSON.parse(text), null, 2));
      setErr(null);
    } catch (e) {
      setErr('Invalid JSON: ' + (e as Error).message);
    }
  }

  return (
    <section className="tier-3 ambient-float p-6 sm:p-7">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="font-display text-lg tracking-tight">{label}</h2>
          <p className="text-[11px] text-muted font-num">
            key: {sectionKey} · raw JSON editor
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={format}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg surface-low ghost-line text-xs text-ink-soft hover:text-ink hover:bg-surface-container transition"
          >
            <Code2 size={12} /> Format
          </button>
          <button
            onClick={save}
            disabled={busy || !dirty}
            className="btn-primary text-sm disabled:opacity-60"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
          </button>
        </div>
      </header>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={22}
        spellCheck={false}
        className="input-clean mt-5 font-mono text-[12.5px] leading-relaxed"
      />

      <p className="mt-2 text-[11px] text-muted">
        Editing this JSON directly. Any shape is allowed — the frontend
        <code> useSection(&apos;{sectionKey}&apos;, fallback)</code> hook reads it as-is.
      </p>

      <Banner ok={msg} err={err} />
    </section>
  );
}

function Banner({ ok, err }: { ok: string | null; err: string | null }) {
  return (
    <AnimatePresence>
      {err && (
        <motion.div
          key="err"
          initial={false} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className="mt-4 px-4 py-3 rounded-xl bg-rose-50 text-rose-700 text-sm inline-flex items-center gap-2"
        ><AlertCircle size={14} /> {err}</motion.div>
      )}
      {ok && (
        <motion.div
          key="ok"
          initial={false} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className="mt-4 px-4 py-3 rounded-xl bg-green-50 text-green-700 text-sm inline-flex items-center gap-2"
        ><CheckCircle2 size={14} /> {ok}</motion.div>
      )}
    </AnimatePresence>
  );
}
