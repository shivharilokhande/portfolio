/**
 * copySlices — small structured-form cards that each edit ONE slice of the
 * `copy` CMS section.
 *
 *   Each slice is a self-contained card: it holds its own dirty state and
 *   has its own Save button. On save it merges the slice's local edits into
 *   the latest `section.body` prop (which the parent AdminPortfolioPage
 *   refreshes after any sibling save), then PUTs the whole `copy` doc back.
 *   That way two slices on the same tab don't clobber each other.
 *
 *   Consumed by AdminPortfolioPage so each site section (Hero, About,
 *   Skills, Timeline, Projects, Services, Testimonials, Contact, Footer)
 *   can compose exactly the slices it owns — nothing more, nothing less.
 */
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save, Loader2, CheckCircle2, AlertCircle, RotateCcw, Plus, Trash2,
} from 'lucide-react';
import { adminApi } from './adminApi';
import { copyDefaults, mergeCopy, type CopyDoc } from '../lib/copyDefaults';

type Section = { key: string; label: string; body: unknown; updatedAt: string };

const PILLAR_ICONS = ['code', 'briefcase', 'graduation', 'shield', 'award'] as const;
const BULLET_ICONS = ['clock', 'shield', 'check', 'sparkles', 'lock'] as const;

/* =========================================================================
 * Base slice hook — used by every slice below.
 *
 *   Owns local dirty state for one field of the copy doc. On save merges its
 *   local edits into the freshest `section.body` and PUTs. Reset from remote
 *   body is skipped while local edits are dirty so a sibling slice's save
 *   doesn't wipe pending changes.
 * ========================================================================= */
function useCopySlice<T>(
  section: Section,
  select: (doc: CopyDoc) => T,
  assemble: (doc: CopyDoc, local: T) => CopyDoc,
) {
  const [local, setLocal] = useState<T>(() => select(mergeCopy(section.body)));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg]   = useState<string | null>(null);
  const [err, setErr]   = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const initialRef = useRef<string>(JSON.stringify(select(mergeCopy(section.body))));

  useEffect(() => {
    // Sync only when NOT dirty — otherwise a sibling slice's save would
    // clobber this slice's in-progress edits.
    if (!dirty) {
      const next = select(mergeCopy(section.body));
      setLocal(next);
      initialRef.current = JSON.stringify(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section.body]);

  function update(next: T) {
    setLocal(next);
    setDirty(JSON.stringify(next) !== initialRef.current);
    setMsg(null); setErr(null);
  }

  function revert() {
    const original = JSON.parse(initialRef.current) as T;
    setLocal(original);
    setDirty(false);
    setMsg(null); setErr(null);
  }

  async function save() {
    setBusy(true); setErr(null); setMsg(null);
    try {
      // Merge against the FRESHEST body prop, not our closed-over initial.
      const merged = assemble(mergeCopy(section.body), local);
      await adminApi.updateSection('copy', merged, section.label);
      initialRef.current = JSON.stringify(local);
      setDirty(false);
      setMsg('Saved · live on site.');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setBusy(false);
    }
  }

  return { local, update, revert, save, dirty, busy, msg, err };
}

/* =========================================================================
 *  Reusable card scaffold
 * ========================================================================= */
function SliceCard({
  title, description, dirty, busy, msg, err, onSave, onRevert, children,
}: {
  title: string;
  description?: string;
  dirty: boolean;
  busy: boolean;
  msg: string | null;
  err: string | null;
  onSave: () => void;
  onRevert: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="tier-3 ambient-float p-6 sm:p-7">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h3 className="font-display text-base tracking-tight">{title}</h3>
          {description && <p className="text-[11px] text-muted mt-1">{description}</p>}
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <button
              type="button"
              onClick={onRevert}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg surface-low ghost-line text-xs text-ink-soft hover:text-ink hover:bg-surface-container transition"
            ><RotateCcw size={12} /> Revert</button>
          )}
          <button
            onClick={onSave}
            disabled={busy || !dirty}
            className="btn-primary text-sm disabled:opacity-60"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
          </button>
        </div>
      </header>
      <div className="mt-4">{children}</div>
      <Banner ok={msg} err={err} />
    </section>
  );
}

/* =========================================================================
 *  Section-header slice — edits copy.sectionHeaders[key]
 * ========================================================================= */
export function SectionHeaderSlice({
  section, headerKey, title, description,
}: {
  section: Section;
  headerKey: keyof CopyDoc['sectionHeaders'];
  title: string;
  description?: string;
}) {
  const slice = useCopySlice(
    section,
    (d) => d.sectionHeaders[headerKey],
    (d, local) => ({ ...d, sectionHeaders: { ...d.sectionHeaders, [headerKey]: local } }),
  );
  const v = slice.local;
  return (
    <SliceCard title={title} description={description}
               dirty={slice.dirty} busy={slice.busy} msg={slice.msg} err={slice.err}
               onSave={slice.save} onRevert={slice.revert}>
      <div className="grid sm:grid-cols-2 gap-3">
        <TextField label="Eyebrow (small tag above)" value={v.eyebrow} onChange={(x) => slice.update({ ...v, eyebrow: x })} />
        <TextField label="Title (big display)"       value={v.title}   onChange={(x) => slice.update({ ...v, title: x })} />
      </div>
      <TextAreaField className="mt-3" label="Description (body sentence)" rows={3}
                     value={v.description} onChange={(x) => slice.update({ ...v, description: x })} />
    </SliceCard>
  );
}

/* =========================================================================
 *  Hero right-side card slice — copy.heroCard
 * ========================================================================= */
export function HeroCardSlice({ section }: { section: Section }) {
  const slice = useCopySlice(
    section,
    (d) => d.heroCard,
    (d, local) => ({ ...d, heroCard: local }),
  );
  const v = slice.local;
  return (
    <SliceCard
      title="Right-side card (SHIPPING · NOW)"
      description="The floating info card on the top-right of the Hero — eyebrow tag, live badge, title, body, stats, and chip strip."
      dirty={slice.dirty} busy={slice.busy} msg={slice.msg} err={slice.err}
      onSave={slice.save} onRevert={slice.revert}
    >
      <div className="grid sm:grid-cols-2 gap-3">
        <TextField label="Eyebrow (small tag)"  value={v.eyebrow}   onChange={(x) => slice.update({ ...v, eyebrow: x })} />
        <TextField label="Live badge text"      value={v.liveBadge} onChange={(x) => slice.update({ ...v, liveBadge: x })} />
        <TextField label="Card title"           value={v.title}     onChange={(x) => slice.update({ ...v, title: x })} />
      </div>
      <TextAreaField className="mt-3" label="Card body sentence" rows={2}
                     value={v.body} onChange={(x) => slice.update({ ...v, body: x })} />
      <div className="mt-4">
        <p className="text-xs font-semibold text-ink mb-2">Stats (first 3 render on the card)</p>
        <StatList
          items={v.stats}
          onChange={(next) => slice.update({ ...v, stats: next })}
        />
      </div>
      <div className="mt-4">
        <p className="text-xs font-semibold text-ink mb-2">Chip strip (tech / roles)</p>
        <TagList
          values={v.chips}
          onChange={(next) => slice.update({ ...v, chips: next })}
          placeholder="Add a chip (e.g. Java)"
        />
      </div>
    </SliceCard>
  );
}

/* =========================================================================
 *  About pillars slice — copy.aboutPillars
 * ========================================================================= */
export function AboutPillarsSlice({ section }: { section: Section }) {
  const slice = useCopySlice(
    section,
    (d) => d.aboutPillars,
    (d, local) => ({ ...d, aboutPillars: local }),
  );
  return (
    <SliceCard
      title="About pillars"
      description="Icon cards next to the About stats — icon dropdown, title, body. Add / remove as many as you want."
      dirty={slice.dirty} busy={slice.busy} msg={slice.msg} err={slice.err}
      onSave={slice.save} onRevert={slice.revert}
    >
      <ul className="space-y-2">
        {slice.local.map((p, i) => (
          <li key={i} className="tier-1 p-3 grid sm:grid-cols-[120px_140px_1fr_auto] gap-2 items-center">
            <select
              value={p.icon}
              onChange={(e) => {
                const next = slice.local.slice();
                next[i] = { ...next[i], icon: e.target.value as CopyDoc['aboutPillars'][number]['icon'] };
                slice.update(next);
              }}
              className="input-clean py-1.5 text-xs"
            >
              {PILLAR_ICONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
            </select>
            <input
              value={p.title}
              placeholder="Pillar title"
              onChange={(e) => {
                const next = slice.local.slice();
                next[i] = { ...next[i], title: e.target.value };
                slice.update(next);
              }}
              className="input-clean py-1.5 text-sm"
            />
            <input
              value={p.text}
              placeholder="Pillar body"
              onChange={(e) => {
                const next = slice.local.slice();
                next[i] = { ...next[i], text: e.target.value };
                slice.update(next);
              }}
              className="input-clean py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={() => slice.update(slice.local.filter((_, j) => j !== i))}
              className="p-1.5 rounded-md text-ink-soft hover:text-red-700 hover:bg-red-50 transition"
              aria-label="Remove pillar"
            ><Trash2 size={13} /></button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => slice.update([...slice.local, { icon: 'code', title: '', text: '' }])}
        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg surface-low ghost-line text-primary text-xs font-semibold hover:bg-green-50 transition"
      ><Plus size={12} /> Add pillar</button>
    </SliceCard>
  );
}

/* =========================================================================
 *  Contact block slice — copy.contact (trust chips, quote, fields, buttons)
 * ========================================================================= */
export function ContactBlockSlice({ section }: { section: Section }) {
  const slice = useCopySlice(
    section,
    (d) => d.contact,
    (d, local) => ({ ...d, contact: local }),
  );
  const v = slice.local;
  function setField<K extends keyof typeof v>(field: K, val: typeof v[K]) {
    slice.update({ ...v, [field]: val });
  }
  function setFormField<K extends keyof typeof v.fields>(field: K, val: string) {
    slice.update({ ...v, fields: { ...v.fields, [field]: val } });
  }
  return (
    <SliceCard
      title="Contact extras (chips, quote, form labels)"
      description="Everything on the left side of the Contact panel plus every form field label & button."
      dirty={slice.dirty} busy={slice.busy} msg={slice.msg} err={slice.err}
      onSave={slice.save} onRevert={slice.revert}
    >
      <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Trust chips</p>
      <p className="text-[11px] text-muted mb-2">Small icon-and-text badges above the contact list.</p>
      <BulletList
        items={v.trustBullets}
        onChange={(next) => setField('trustBullets', next)}
      />

      <p className="text-xs font-semibold text-primary uppercase tracking-wider mt-6 mb-2">Testimonial quote</p>
      <p className="text-[11px] text-muted mb-2">Blockquote under the contact list. Leave both fields empty to hide it entirely.</p>
      <TextAreaField label="Quote text" rows={2}
                     value={v.quote.text}
                     onChange={(x) => setField('quote', { ...v.quote, text: x })} />
      <TextField label="Attribution" value={v.quote.attribution}
                     onChange={(x) => setField('quote', { ...v.quote, attribution: x })} />

      <p className="text-xs font-semibold text-primary uppercase tracking-wider mt-6 mb-2">Form field labels & placeholders</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <TextField label="Name label"                  value={v.fields.nameLabel}               onChange={(x) => setFormField('nameLabel', x)} />
        <TextField label="Name placeholder"            value={v.fields.namePlaceholder}         onChange={(x) => setFormField('namePlaceholder', x)} />
        <TextField label="Email label"                 value={v.fields.emailLabel}              onChange={(x) => setFormField('emailLabel', x)} />
        <TextField label="Email placeholder"           value={v.fields.emailPlaceholder}        onChange={(x) => setFormField('emailPlaceholder', x)} />
        <TextField label="Company label"               value={v.fields.companyLabel}            onChange={(x) => setFormField('companyLabel', x)} />
        <TextField label="Company placeholder"         value={v.fields.companyPlaceholder}      onChange={(x) => setFormField('companyPlaceholder', x)} />
        <TextField label="Project-type label"          value={v.fields.projectTypeLabel}        onChange={(x) => setFormField('projectTypeLabel', x)} />
        <TextField label="Project-type placeholder"    value={v.fields.projectTypePlaceholder}  onChange={(x) => setFormField('projectTypePlaceholder', x)} />
        <TextField label="Message label"               value={v.fields.messageLabel}            onChange={(x) => setFormField('messageLabel', x)} />
        <TextField label="Message placeholder"         value={v.fields.messagePlaceholder}      onChange={(x) => setFormField('messagePlaceholder', x)} />
      </div>

      <p className="text-xs font-semibold text-primary uppercase tracking-wider mt-6 mb-2">Buttons &amp; messages</p>
      <div className="grid sm:grid-cols-2 gap-3">
        <TextField label="Submit button (idle)"     value={v.submitLabel}     onChange={(x) => setField('submitLabel', x)} />
        <TextField label="Submit button (busy)"     value={v.submittingLabel} onChange={(x) => setField('submittingLabel', x)} />
      </div>
      <TextAreaField className="mt-3" label="Privacy note (under form)" rows={2}
                     value={v.privacyNote}    onChange={(x) => setField('privacyNote', x)} />
      <TextAreaField className="mt-3" label="Success message" rows={2}
                     value={v.successMessage} onChange={(x) => setField('successMessage', x)} />
    </SliceCard>
  );
}

/* =========================================================================
 *  Footer slice — copy.footer
 * ========================================================================= */
export function FooterSlice({ section }: { section: Section }) {
  const slice = useCopySlice(
    section,
    (d) => d.footer,
    (d, local) => ({ ...d, footer: local }),
  );
  const v = slice.local;
  function setField<K extends keyof typeof v>(field: K, val: string) {
    slice.update({ ...v, [field]: val });
  }
  return (
    <SliceCard
      title="Footer"
      description="Everything shown in the footer. Use {name} and {year} as placeholders — they get replaced at render time."
      dirty={slice.dirty} busy={slice.busy} msg={slice.msg} err={slice.err}
      onSave={slice.save} onRevert={slice.revert}
    >
      <div className="grid sm:grid-cols-2 gap-3">
        <TextField label="Credits eyebrow"           value={v.creditsEyebrow}     onChange={(x) => setField('creditsEyebrow', x)} />
        <TextField label="Credits title"             value={v.creditsTitle}       onChange={(x) => setField('creditsTitle', x)} />
      </div>
      <TextAreaField className="mt-3" label="Credits body" rows={3}
                     value={v.creditsBody} onChange={(x) => setField('creditsBody', x)} />
      <div className="mt-3 grid sm:grid-cols-2 gap-3">
        <TextField label="Contact card eyebrow"      value={v.contactCardEyebrow} onChange={(x) => setField('contactCardEyebrow', x)} />
        <TextField label="Contact card title"        value={v.contactCardTitle}   onChange={(x) => setField('contactCardTitle', x)} />
      </div>
      <TextAreaField className="mt-3" label="Contact card body" rows={2}
                     value={v.contactCardBody} onChange={(x) => setField('contactCardBody', x)} />
      <div className="mt-3 grid sm:grid-cols-3 gap-3">
        <TextField label="CTA label"                 value={v.contactCtaLabel}    onChange={(x) => setField('contactCtaLabel', x)} />
        <TextField label="Copyright line"            value={v.copyright}          onChange={(x) => setField('copyright', x)} />
        <TextField label="Version tag"               value={v.versionTag}         onChange={(x) => setField('versionTag', x)} />
      </div>
    </SliceCard>
  );
}

/* =========================================================================
 *  Small building blocks
 * ========================================================================= */
function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-ink-soft">{label}</span>
      <input value={value ?? ''} onChange={(e) => onChange(e.target.value)} className="input-clean mt-1 py-2 text-sm" />
    </label>
  );
}

function TextAreaField({
  label, value, onChange, rows = 3, className = '',
}: { label: string; value: string; onChange: (v: string) => void; rows?: number; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-xs font-medium text-ink-soft">{label}</span>
      <textarea
        rows={rows} value={value ?? ''} onChange={(e) => onChange(e.target.value)}
        className="input-clean mt-1 text-sm resize-y"
      />
    </label>
  );
}

function StatList({
  items, onChange,
}: { items: CopyDoc['heroCard']['stats']; onChange: (next: CopyDoc['heroCard']['stats']) => void }) {
  return (
    <div>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-2">
            <input
              value={it.n}
              placeholder="Value (e.g. 6+)"
              onChange={(e) => {
                const next = items.slice();
                next[i] = { ...next[i], n: e.target.value };
                onChange(next);
              }}
              className="input-clean py-1.5 text-sm flex-1"
            />
            <input
              value={it.l}
              placeholder="Label (e.g. years)"
              onChange={(e) => {
                const next = items.slice();
                next[i] = { ...next[i], l: e.target.value };
                onChange(next);
              }}
              className="input-clean py-1.5 text-sm flex-1"
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="p-1.5 rounded-md text-ink-soft hover:text-red-700 hover:bg-red-50 transition"
              aria-label="Remove"
            ><Trash2 size={13} /></button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => onChange([...items, { n: '', l: '' }])}
        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg surface-low ghost-line text-primary text-xs font-semibold hover:bg-green-50 transition"
      ><Plus size={12} /> Add row</button>
    </div>
  );
}

function TagList({ values, onChange, placeholder }: { values: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState('');
  function add() {
    const t = draft.trim();
    if (!t) return;
    onChange([...values, t]);
    setDraft('');
  }
  return (
    <div>
      <ul className="flex flex-wrap gap-1.5 mb-2">
        {values.map((v, i) => (
          <li key={`${v}-${i}`} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full surface-low ghost-line text-xs text-ink">
            {v}
            <button
              type="button"
              onClick={() => onChange(values.filter((_, j) => j !== i))}
              className="text-ink-soft hover:text-red-700 transition"
              aria-label={`Remove ${v}`}
            >×</button>
          </li>
        ))}
      </ul>
      <form onSubmit={(e) => { e.preventDefault(); add(); }} className="flex items-center gap-2">
        <input value={draft} onChange={(e) => setDraft(e.target.value)}
               placeholder={placeholder ?? 'Add a tag'}
               className="input-clean py-1.5 text-sm flex-1" />
        <button type="submit"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg surface-low ghost-line text-primary text-xs font-semibold hover:bg-green-50 transition"
        ><Plus size={12} /> Add</button>
      </form>
    </div>
  );
}

function BulletList({
  items, onChange,
}: {
  items: CopyDoc['contact']['trustBullets'];
  onChange: (next: CopyDoc['contact']['trustBullets']) => void;
}) {
  return (
    <div>
      <ul className="space-y-2">
        {items.map((b, i) => (
          <li key={i} className="grid grid-cols-[120px_1fr_auto] gap-2 items-center">
            <select
              value={b.icon}
              onChange={(e) => {
                const next = items.slice();
                next[i] = { ...next[i], icon: e.target.value as CopyDoc['contact']['trustBullets'][number]['icon'] };
                onChange(next);
              }}
              className="input-clean py-1.5 text-xs"
            >
              {BULLET_ICONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
            </select>
            <input
              value={b.text}
              placeholder="Chip text"
              onChange={(e) => {
                const next = items.slice();
                next[i] = { ...next[i], text: e.target.value };
                onChange(next);
              }}
              className="input-clean py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="p-1.5 rounded-md text-ink-soft hover:text-red-700 hover:bg-red-50 transition"
              aria-label="Remove"
            ><Trash2 size={13} /></button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => onChange([...items, { icon: 'clock', text: '' }])}
        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg surface-low ghost-line text-primary text-xs font-semibold hover:bg-green-50 transition"
      ><Plus size={12} /> Add chip</button>
    </div>
  );
}

function Banner({ ok, err }: { ok: string | null; err: string | null }) {
  return (
    <AnimatePresence>
      {err && (
        <motion.div key="err"
          initial={false} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className="mt-4 px-4 py-3 rounded-xl bg-rose-50 text-rose-700 text-sm inline-flex items-center gap-2"
        ><AlertCircle size={14} /> {err}</motion.div>
      )}
      {ok && (
        <motion.div key="ok"
          initial={false} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className="mt-4 px-4 py-3 rounded-xl bg-green-50 text-green-700 text-sm inline-flex items-center gap-2"
        ><CheckCircle2 size={14} /> {ok}</motion.div>
      )}
    </AnimatePresence>
  );
}
