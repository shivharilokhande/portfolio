/**
 * HeroEditor — structured editor for the single `hero` document.
 *
 *   { headline: string[], badge: string, primaryCta: {label,href}, secondaryCta: {label,href} }
 *
 *   Headline is editable as an ordered list of words (each one is a chip
 *   with delete) — preserves the staggered word-reveal animation on the
 *   public Hero.
 */
import { useEffect, useState } from 'react';
import { Reorder, motion, AnimatePresence } from 'framer-motion';
import {
  Save, Loader2, Plus, X, CheckCircle2, AlertCircle, RotateCcw, GripVertical,
} from 'lucide-react';
import { adminApi } from './adminApi';

type HeroDoc = {
  headline:     string[];
  badge:        string;
  primaryCta:   { label: string; href: string };
  secondaryCta: { label: string; href: string };
};

const DEFAULT: HeroDoc = {
  headline:     'Forward Deployed Engineer, Scrum Master & Workiva delivery lead.'.split(' '),
  badge:        'Available for forward-deployed & Workiva engagements',
  primaryCta:   { label: 'Book a free 30-min discovery call', href: '/#contact' },
  secondaryCta: { label: 'See the work',                      href: '/portfolio/' },
};

const easeOut = [0.16, 1, 0.3, 1] as const;

export default function HeroEditor({
  sectionKey, label, body, onSaved,
}: {
  sectionKey: string;
  label:      string;
  body:       unknown;
  onSaved:    () => void;
}) {
  const initial = mergeDefaults(body);
  const [doc,   setDoc]   = useState<HeroDoc>(initial);
  const [dirty, setDirty] = useState(false);
  const [busy,  setBusy]  = useState(false);
  const [msg,   setMsg]   = useState<string | null>(null);
  const [err,   setErr]   = useState<string | null>(null);
  const [newWord, setNewWord] = useState('');

  // Re-sync if API refresh swaps body — but never over in-progress edits.
  const bodyKey = JSON.stringify(body ?? null);
  useEffect(() => {
    if (dirty) return;
    setDoc(mergeDefaults(body)); setDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodyKey]);

  function mutate(next: HeroDoc) { setDoc(next); setDirty(true); }
  function setField<K extends keyof HeroDoc>(k: K, v: HeroDoc[K]) { mutate({ ...doc, [k]: v }); }
  function setCta(which: 'primaryCta' | 'secondaryCta', patch: Partial<HeroDoc['primaryCta']>) {
    mutate({ ...doc, [which]: { ...doc[which], ...patch } });
  }

  function addWord(e?: React.FormEvent) {
    e?.preventDefault();
    const w = newWord.trim();
    if (!w) return;
    mutate({ ...doc, headline: [...doc.headline, w] });
    setNewWord('');
  }
  function removeWord(idx: number) {
    mutate({ ...doc, headline: doc.headline.filter((_, i) => i !== idx) });
  }

  async function save() {
    setBusy(true); setErr(null); setMsg(null);
    try {
      await adminApi.updateSection(sectionKey, doc, label);
      setMsg('Saved · live on site.');
      setDirty(false);
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setBusy(false);
    }
  }

  function revert() {
    setDoc(mergeDefaults(body));
    setDirty(false); setMsg(null); setErr(null);
  }

  return (
    <section className="tier-3 ambient-float p-6 sm:p-7">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="font-display text-lg tracking-tight">{label}</h2>
          <p className="text-[11px] text-muted font-num">key: {sectionKey}</p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <button onClick={revert} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg surface-low ghost-line text-xs text-ink-soft hover:text-ink hover:bg-surface-container transition">
              <RotateCcw size={12} /> Revert
            </button>
          )}
          <button onClick={save} disabled={busy || !dirty} className="btn-primary text-sm disabled:opacity-60">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
          </button>
        </div>
      </header>

      <Banner ok={msg} err={err} />

      {/* Headline words */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-ink">Headline words</h3>
        <p className="text-[11px] text-ink-soft">Each word animates in separately. Drag to reorder, click × to remove.</p>

        <Reorder.Group
          axis="x"
          values={doc.headline}
          onReorder={(next) => setField('headline', next)}
          className="mt-3 flex flex-wrap gap-2"
        >
          {doc.headline.map((word, i) => (
            <Reorder.Item
              // Framer Motion's Reorder uses `value` as identity; keying by
              // the same value keeps drag animations stable across
              // reorders. Previously `${word}-${i}` changed on every
              // reorder, defeating the identity tracking and causing
              // flicker / dropped drags. If a user genuinely wants two of
              // the same word we append the index for uniqueness — that
              // small collision is preferable to the whole component
              // remounting on every drag.
              key={doc.headline.indexOf(word) === i ? word : `${word}-${i}`}
              value={word}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full surface-lowest ghost-line cursor-grab active:cursor-grabbing text-sm text-ink"
              whileDrag={{ scale: 1.05 }}
              transition={{ duration: 0.2, ease: easeOut }}
            >
              <GripVertical size={11} className="text-ink-soft" />
              {word}
              <button
                type="button"
                onClick={() => removeWord(i)}
                className="text-ink-soft hover:text-red-700 transition"
                aria-label={`Remove word ${word}`}
              >
                <X size={11} />
              </button>
            </Reorder.Item>
          ))}
        </Reorder.Group>

        <form onSubmit={addWord} className="mt-3 flex items-center gap-2">
          <input
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            placeholder="Add a word…"
            className="input-clean py-2 text-sm w-48"
          />
          <button type="submit" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg surface-low ghost-line text-primary hover:bg-green-50 transition text-xs font-semibold">
            <Plus size={12} /> Add word
          </button>
        </form>
      </div>

      {/* Badge */}
      <div className="mt-7">
        <label className="block">
          <span className="text-sm font-semibold text-ink">Top badge text</span>
          <input
            value={doc.badge}
            onChange={(e) => setField('badge', e.target.value)}
            className="input-clean mt-2"
          />
        </label>
      </div>

      {/* CTAs */}
      <div className="mt-7 grid sm:grid-cols-2 gap-5">
        <CtaBlock title="Primary CTA"   cta={doc.primaryCta}   onChange={(p) => setCta('primaryCta', p)} />
        <CtaBlock title="Secondary CTA" cta={doc.secondaryCta} onChange={(p) => setCta('secondaryCta', p)} />
      </div>
    </section>
  );
}

function CtaBlock({
  title, cta, onChange,
}: {
  title: string;
  cta:   { label: string; href: string };
  onChange: (p: Partial<{ label: string; href: string }>) => void;
}) {
  return (
    <div className="tier-1 p-4 space-y-3">
      <h4 className="text-sm font-semibold text-ink">{title}</h4>
      <label className="block text-xs">
        <span className="text-ink-soft">Label</span>
        <input value={cta.label} onChange={(e) => onChange({ label: e.target.value })}
               className="input-clean mt-1.5 py-2 text-sm" />
      </label>
      <label className="block text-xs">
        <span className="text-ink-soft">Link (href)</span>
        <input value={cta.href} onChange={(e) => onChange({ href: e.target.value })}
               placeholder="#contact or https://…"
               className="input-clean mt-1.5 py-2 text-sm" />
      </label>
    </div>
  );
}

function mergeDefaults(raw: unknown): HeroDoc {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const r = raw as Partial<HeroDoc>;
    return {
      headline:     Array.isArray(r.headline) && r.headline.length ? r.headline : DEFAULT.headline,
      badge:        typeof r.badge === 'string' ? r.badge : DEFAULT.badge,
      primaryCta:   { ...DEFAULT.primaryCta,   ...(r.primaryCta   ?? {}) },
      secondaryCta: { ...DEFAULT.secondaryCta, ...(r.secondaryCta ?? {}) },
    };
  }
  return DEFAULT;
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
