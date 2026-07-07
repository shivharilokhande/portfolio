/**
 * SkillsEditor — nested editor for the `skills` section.
 *
 *   shape: Array<{ id, label, color, skills: Array<{ name, level: 0..100 }> }>
 *
 *   - Drag-reorder categories
 *   - Per-category: name + colour + drag-reorder inner skills
 *   - Inner skill: name + 0..100 slider with a live filled track
 */
import { useEffect, useState } from 'react';
import { Reorder, motion, AnimatePresence } from 'framer-motion';
import {
  Save, Loader2, Plus, Trash2, ChevronDown, GripVertical, RotateCcw,
  CheckCircle2, AlertCircle,
} from 'lucide-react';
import { adminApi } from './adminApi';

type Skill    = { __id: string; name: string; level: number };
type Category = { __id: string; id: string; label: string; color: string; skills: Skill[] };

const easeOut = [0.16, 1, 0.3, 1] as const;
const PALETTE = ['#006d32', '#00d166', '#0a5ccf', '#5692f0', '#fbbf24', '#ec4899'];

export default function SkillsEditor({
  sectionKey, label, body, onSaved,
}: {
  sectionKey: string;
  label:      string;
  body:       unknown;
  onSaved:    () => void;
}) {
  const [cats, setCats] = useState<Category[]>(() => withIds(body));
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg]   = useState<string | null>(null);
  const [err, setErr]   = useState<string | null>(null);

  useEffect(() => { setCats(withIds(body)); setDirty(false); }, [body]);

  function mutate(next: Category[]) { setCats(next); setDirty(true); }
  function patchCat(id: string, patch: Partial<Category>) {
    mutate(cats.map((c) => c.__id === id ? { ...c, ...patch } : c));
  }
  function addCategory() {
    const c: Category = {
      __id: rid(),
      id: '', label: 'New pillar',
      color: PALETTE[cats.length % PALETTE.length],
      skills: [],
    };
    mutate([...cats, c]);
    setOpen((s) => new Set(s).add(c.__id));
  }
  function removeCategory(id: string) {
    if (!confirm('Delete this pillar and all its skills?')) return;
    mutate(cats.filter((c) => c.__id !== id));
  }
  function toggleOpen(id: string) {
    setOpen((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function addSkill(catId: string) {
    const next: Skill = { __id: rid(), name: '', level: 80 };
    mutate(cats.map((c) => c.__id === catId ? { ...c, skills: [...c.skills, next] } : c));
  }
  function patchSkill(catId: string, skillId: string, patch: Partial<Skill>) {
    mutate(cats.map((c) => c.__id === catId
      ? { ...c, skills: c.skills.map((s) => s.__id === skillId ? { ...s, ...patch } : s) }
      : c));
  }
  function removeSkill(catId: string, skillId: string) {
    mutate(cats.map((c) => c.__id === catId
      ? { ...c, skills: c.skills.filter((s) => s.__id !== skillId) }
      : c));
  }
  function reorderSkills(catId: string, next: Skill[]) {
    mutate(cats.map((c) => c.__id === catId ? { ...c, skills: next } : c));
  }

  async function save() {
    setBusy(true); setErr(null); setMsg(null);
    try {
      const clean = cats.map(({ __id, skills, ...rest }) => ({
        ...rest,
        skills: skills.map(({ __id: _i, ...s }) => s),
      }));
      await adminApi.updateSection(sectionKey, clean, label);
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
    setCats(withIds(body));
    setDirty(false); setMsg(null); setErr(null);
  }

  return (
    <section className="tier-3 ambient-float p-6 sm:p-7">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="font-display text-lg tracking-tight">{label}</h2>
          <p className="text-[11px] text-muted font-num">
            key: {sectionKey} · {cats.length} pillars · {cats.reduce((n, c) => n + c.skills.length, 0)} skills
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <button onClick={revert} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg surface-low ghost-line text-xs text-ink-soft hover:text-ink hover:bg-surface-container transition">
              <RotateCcw size={12} /> Revert
            </button>
          )}
          <button onClick={addCategory} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg surface-low ghost-line text-primary hover:bg-green-50 transition text-xs font-semibold">
            <Plus size={13} /> Add pillar
          </button>
          <button onClick={save} disabled={busy || !dirty} className="btn-primary text-sm disabled:opacity-60">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
          </button>
        </div>
      </header>

      <Banner ok={msg} err={err} />

      {cats.length === 0 ? (
        <div className="mt-5 tier-1 p-10 text-center">
          <p className="text-sm text-ink-soft">No pillars yet.</p>
          <button onClick={addCategory} className="btn-primary mt-4 mx-auto text-sm">
            <Plus size={13} /> Add first pillar
          </button>
        </div>
      ) : (
        <Reorder.Group
          axis="y"
          values={cats}
          onReorder={(next) => mutate(next as Category[])}
          className="mt-5 space-y-3"
        >
          {cats.map((c, idx) => (
            <Reorder.Item
              key={c.__id}
              value={c}
              className="relative tier-1 rounded-xl overflow-hidden ambient-float"
              whileDrag={{ scale: 1.01, boxShadow: '0 20px 50px -10px rgba(11,28,48,0.18)' }}
              transition={{ duration: 0.25, ease: easeOut }}
            >
              {/* HEAD */}
              <div className="flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none" onClick={() => toggleOpen(c.__id)}>
                <span aria-hidden className="grid place-items-center text-ink-soft cursor-grab active:cursor-grabbing pl-1" title="Drag to reorder">
                  <GripVertical size={15} />
                </span>
                <span className="text-[10.5px] font-num text-muted w-6 tabular-nums">{String(idx + 1).padStart(2, '0')}</span>
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: c.color }} />
                <span className="flex-1 truncate text-sm font-medium text-ink">{c.label || '(untitled pillar)'}</span>
                <span className="text-[11px] text-ink-soft font-num">{c.skills.length} skills</span>
                <button onClick={(e) => { e.stopPropagation(); removeCategory(c.__id); }}
                  className="p-1.5 rounded-md text-ink-soft hover:text-red-700 hover:bg-red-50 transition" title="Delete pillar">
                  <Trash2 size={13} />
                </button>
                <motion.span animate={{ rotate: open.has(c.__id) ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown size={14} className="text-ink-soft" />
                </motion.span>
              </div>

              {/* BODY */}
              <AnimatePresence initial={false}>
                {open.has(c.__id) && (
                  <motion.div
                    initial={false}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: easeOut }}
                    className="overflow-hidden surface-low"
                  >
                    <div className="p-4 sm:p-5 space-y-4">
                      <div className="grid sm:grid-cols-3 gap-3">
                        <label className="block sm:col-span-1">
                          <span className="text-xs text-ink-soft">ID (slug)</span>
                          <input value={c.id} onChange={(e) => patchCat(c.__id, { id: e.target.value })}
                            placeholder="leadership"
                            className="input-clean mt-1.5 py-1.5 text-sm" />
                        </label>
                        <label className="block sm:col-span-1">
                          <span className="text-xs text-ink-soft">Label</span>
                          <input value={c.label} onChange={(e) => patchCat(c.__id, { label: e.target.value })}
                            className="input-clean mt-1.5 py-1.5 text-sm" />
                        </label>
                        <label className="block sm:col-span-1">
                          <span className="text-xs text-ink-soft">Colour</span>
                          <div className="mt-1.5 flex items-center gap-2">
                            <input type="color" value={c.color}
                              onChange={(e) => patchCat(c.__id, { color: e.target.value })}
                              className="w-10 h-9 rounded-lg ghost-line bg-transparent cursor-pointer shrink-0" />
                            <input value={c.color}
                              onChange={(e) => patchCat(c.__id, { color: e.target.value })}
                              className="input-clean py-1.5 text-sm" />
                          </div>
                        </label>
                      </div>

                      {/* SKILLS LIST */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-semibold text-ink-soft uppercase tracking-wider">Skills in this pillar</h4>
                          <button onClick={() => addSkill(c.__id)}
                            className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg surface-lowest ghost-line text-primary hover:bg-green-50 transition">
                            <Plus size={11} /> Add skill
                          </button>
                        </div>
                        {c.skills.length === 0 ? (
                          <p className="text-[11px] text-ink-soft">No skills yet. Click "Add skill" to start.</p>
                        ) : (
                          <Reorder.Group
                            axis="y"
                            values={c.skills}
                            onReorder={(next) => reorderSkills(c.__id, next as Skill[])}
                            className="space-y-2"
                          >
                            {c.skills.map((s) => (
                              <Reorder.Item key={s.__id} value={s}
                                className="surface-lowest ghost-line rounded-lg p-2.5 flex items-center gap-3"
                                whileDrag={{ scale: 1.02 }}
                              >
                                <GripVertical size={13} className="text-ink-soft shrink-0 cursor-grab active:cursor-grabbing" />
                                <input
                                  value={s.name}
                                  onChange={(e) => patchSkill(c.__id, s.__id, { name: e.target.value })}
                                  placeholder="Skill name"
                                  className="flex-1 min-w-0 input-clean px-2.5 py-1 text-sm"
                                />
                                <div className="flex items-center gap-2 shrink-0">
                                  <input
                                    type="range"
                                    min={0}
                                    max={100}
                                    value={s.level}
                                    onChange={(e) => patchSkill(c.__id, s.__id, { level: Number(e.target.value) })}
                                    className="w-28"
                                    style={{ accentColor: c.color }}
                                  />
                                  <span className="w-9 text-right text-xs font-num tabular-nums" style={{ color: c.color }}>
                                    {s.level}%
                                  </span>
                                </div>
                                <button onClick={() => removeSkill(c.__id, s.__id)}
                                  className="p-1 rounded text-ink-soft hover:text-red-700 hover:bg-red-50 transition" title="Remove skill">
                                  <Trash2 size={12} />
                                </button>
                              </Reorder.Item>
                            ))}
                          </Reorder.Group>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Reorder.Item>
          ))}
        </Reorder.Group>
      )}
    </section>
  );
}

function withIds(raw: unknown): Category[] {
  const arr = Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
  return arr.map((c) => ({
    __id:  rid(),
    id:    String(c.id ?? ''),
    label: String(c.label ?? ''),
    color: String(c.color ?? '#006d32'),
    skills: Array.isArray(c.skills)
      ? (c.skills as Record<string, unknown>[]).map((s) => ({
          __id:  rid(),
          name:  String(s.name ?? ''),
          level: Math.max(0, Math.min(100, Number(s.level ?? 0))),
        }))
      : [],
  }));
}

function rid() { return Math.random().toString(36).slice(2, 10); }

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
