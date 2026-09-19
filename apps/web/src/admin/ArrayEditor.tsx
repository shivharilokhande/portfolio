/**
 * ArrayEditor — generic drag-reorder card list for portfolio array sections.
 *
 *   - Renders each item as a glass card with structured form fields
 *   - Add / Remove / Move-up / Move-down buttons
 *   - Drag handle reorders via framer-motion <Reorder.*>
 *   - Save button writes the whole array back to /api/admin/portfolio/{key}
 *
 *   Field types supported (declared per-section in sectionSchemas.ts):
 *     text, textarea, number, select, color, csv-tags, pipe-list, boolean, url
 *
 *   csv-tags     → comma-separated, stored as string[]
 *   pipe-list    → pipe-separated, stored as string[]
 *
 *   The schema's `cardTitle(item)` controls the collapsed card heading so the
 *   user can scan a long list quickly.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { Reorder, motion, AnimatePresence } from 'framer-motion';
import {
  Save, Loader2, Plus, Trash2, ChevronDown, GripVertical,
  CheckCircle2, AlertCircle, Copy, RotateCcw,
} from 'lucide-react';
import { adminApi } from './adminApi';
import { sectionSchemas, type FieldSchema, type SectionSchema } from './sectionSchemas';

type Item = Record<string, unknown> & { __id: string };

const easeOut = [0.16, 1, 0.3, 1] as const;

export default function ArrayEditor({
  sectionKey, label, body, onSaved,
}: {
  sectionKey: string;
  label:      string;
  body:       unknown;
  onSaved:    () => void;
}) {
  const schema: SectionSchema | undefined = sectionSchemas[sectionKey];
  const [items, setItems] = useState<Item[]>(() => withIds(Array.isArray(body) ? (body as Record<string, unknown>[]) : []));
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg]   = useState<string | null>(null);
  const [err, setErr]   = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  // Resync from the server body only when the content actually changed and
  // there are no in-progress edits — a parent reload must not wipe them.
  const bodyKey = JSON.stringify(body ?? null);
  useEffect(() => {
    if (dirty) return;
    setItems(withIds(Array.isArray(body) ? (body as Record<string, unknown>[]) : []));
    setDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodyKey]);

  if (!schema) return null;

  function mutate(next: Item[]) {
    setItems(next);
    setDirty(true);
  }

  function addItem() {
    const fresh = { ...schema!.defaultItem(), __id: rid() } as Item;
    mutate([...items, fresh]);
    setOpenIds((s) => new Set(s).add(fresh.__id));
  }

  function duplicateItem(item: Item) {
    const copy = { ...item, __id: rid() };
    const idx = items.findIndex((i) => i.__id === item.__id);
    const next = [...items.slice(0, idx + 1), copy, ...items.slice(idx + 1)];
    mutate(next);
  }

  function removeItem(id: string) {
    if (!confirm('Delete this item?')) return;
    mutate(items.filter((i) => i.__id !== id));
  }

  function updateItem(id: string, patch: Partial<Item>) {
    mutate(items.map((i) => i.__id === id ? { ...i, ...patch } : i));
  }

  function toggleOpen(id: string) {
    setOpenIds((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  async function save() {
    setBusy(true); setErr(null); setMsg(null);
    try {
      // strip __id before saving
      const clean = items.map(({ __id, ...rest }) => rest);
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
    setItems(withIds(Array.isArray(body) ? (body as Record<string, unknown>[]) : []));
    setDirty(false);
    setMsg(null); setErr(null);
  }

  return (
    <section className="tier-3 ambient-float p-6 sm:p-7">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="font-display text-lg tracking-tight">{label}</h2>
          <p className="text-[11px] text-muted font-num">
            key: {sectionKey} · {items.length} {pluralize(schema.itemLabel, items.length)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && (
            <button
              type="button"
              onClick={revert}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg surface-low ghost-line text-xs text-ink-soft hover:text-ink hover:bg-surface-container transition"
            ><RotateCcw size={12} /> Revert</button>
          )}
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg surface-low ghost-line text-primary hover:bg-green-50 transition text-xs font-semibold"
          ><Plus size={13} /> Add {schema.itemLabel.toLowerCase()}</button>
          <button
            onClick={save}
            disabled={busy || !dirty}
            className="btn-primary text-sm disabled:opacity-60"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
          </button>
        </div>
      </header>

      <Banner ok={msg} err={err} />

      {items.length === 0 ? (
        <EmptyState label={schema.itemLabel.toLowerCase()} onAdd={addItem} />
      ) : (
        <Reorder.Group
          axis="y"
          values={items}
          onReorder={(next) => mutate(next as Item[])}
          className="mt-5 space-y-3"
        >
          {items.map((item, idx) => (
            <Reorder.Item
              key={item.__id}
              value={item}
              className="relative tier-1 rounded-xl overflow-hidden ambient-float"
              whileDrag={{ scale: 1.01, boxShadow: '0 20px 50px -10px rgba(11,28,48,0.18)' }}
              transition={{ duration: 0.25, ease: easeOut }}
            >
              <CardRow
                idx={idx}
                schema={schema}
                item={item}
                open={openIds.has(item.__id)}
                onToggle={() => toggleOpen(item.__id)}
                onPatch={(p) => updateItem(item.__id, p)}
                onRemove={() => removeItem(item.__id)}
                onDuplicate={() => duplicateItem(item)}
              />
            </Reorder.Item>
          ))}
        </Reorder.Group>
      )}
    </section>
  );
}

/* ---------- One card ---------- */

function CardRow({
  idx, schema, item, open, onToggle, onPatch, onRemove, onDuplicate,
}: {
  idx: number;
  schema: SectionSchema;
  item: Item;
  open: boolean;
  onToggle: () => void;
  onPatch: (p: Partial<Item>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  return (
    <>
      {/* Collapsed row */}
      <div className="flex items-center gap-2 px-3 py-2.5 select-none">
        <span
          aria-hidden
          className="grid place-items-center text-ink-soft hover:text-ink cursor-grab active:cursor-grabbing pl-1"
          title="Drag to reorder"
        >
          <GripVertical size={15} />
        </span>
        <button
          type="button"
          aria-expanded={open}
          onClick={onToggle}
          className="flex-1 min-w-0 flex items-center gap-2 text-left bg-transparent cursor-pointer"
        >
          <span className="text-[10.5px] font-num text-muted w-6 tabular-nums">{String(idx + 1).padStart(2, '0')}</span>
          <span className="flex-1 truncate text-sm font-medium text-ink">{schema.cardTitle(item) || `Untitled ${schema.itemLabel.toLowerCase()}`}</span>
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
          className="p-1.5 rounded-md text-ink-soft hover:text-ink hover:bg-surface-container transition"
          title="Duplicate"
          aria-label="Duplicate"
        ><Copy size={13} /></button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="p-1.5 rounded-md text-ink-soft hover:text-red-700 hover:bg-red-50 transition"
          title="Delete"
          aria-label="Delete"
        ><Trash2 size={13} /></button>
        <motion.span aria-hidden animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={14} className="text-ink-soft" />
        </motion.span>
      </div>

      {/* Expanded fields */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={false}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: easeOut }}
            className="overflow-hidden surface-low"
          >
            <div className="p-4 sm:p-5 grid sm:grid-cols-2 gap-4">
              {schema.fields.map((f) => (
                <Field
                  key={f.key}
                  schema={f}
                  value={(item as Record<string, unknown>)[f.key]}
                  onChange={(v) => onPatch({ [f.key]: v } as Partial<Item>)}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ---------- One field ---------- */

function Field({ schema, value, onChange }: {
  schema: FieldSchema;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const colSpan = schema.half ? 'sm:col-span-1' : 'sm:col-span-2';
  const inputCls = 'input-clean py-2 text-sm';

  let control: ReactNode = null;
  switch (schema.type) {
    case 'textarea':
      control = (
        <textarea
          rows={schema.rows ?? 3}
          value={String(value ?? '')}
          placeholder={schema.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
        />
      ); break;
    case 'number':
      control = (
        <input
          type="number"
          value={value as number ?? ''}
          placeholder={schema.placeholder}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
          className={inputCls}
        />
      ); break;
    case 'select':
      control = (
        <select
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
        >
          {schema.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ); break;
    case 'color':
      control = (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={String(value ?? '#00d166')}
            onChange={(e) => onChange(e.target.value)}
            className="w-12 h-10 rounded-lg ghost-line bg-transparent cursor-pointer shrink-0"
          />
          <input
            value={String(value ?? '')}
            placeholder="#00d166"
            onChange={(e) => onChange(e.target.value)}
            className={inputCls}
          />
        </div>
      ); break;
    case 'csv-tags': {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      control = (
        <DelimitedInput
          values={arr}
          delimiter=","
          joiner=", "
          placeholder={schema.placeholder}
          onChange={onChange}
          className={inputCls}
        />
      ); break;
    }
    case 'pipe-list': {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      control = (
        <DelimitedInput
          multiline
          rows={schema.rows ?? 3}
          values={arr}
          delimiter="|"
          joiner=" | "
          placeholder={schema.placeholder}
          onChange={onChange}
          className={inputCls}
        />
      ); break;
    }
    case 'boolean':
      control = (
        <button
          type="button"
          role="switch"
          aria-checked={Boolean(value)}
          onClick={() => onChange(!value)}
          className={`w-full inline-flex items-center gap-3 px-3 py-2 rounded-xl transition ${
            value ? 'bg-green-50 ring-1 ring-primary/40' : 'surface-low ghost-line hover:bg-surface-container'
          }`}
        >
          <span className={`w-9 h-5 rounded-full p-0.5 transition ${value ? 'bg-gradient-to-r from-primary to-primary-soft' : 'bg-outline-variant/40'}`}>
            <motion.span layout transition={{ type: 'spring', stiffness: 600, damping: 30 }}
              className={`block w-4 h-4 rounded-full bg-white ${value ? 'ml-4' : ''}`} />
          </span>
          <span className="text-sm text-ink">{value ? 'On' : 'Off'}</span>
        </button>
      ); break;
    case 'url':
    case 'text':
    default:
      control = (
        <input
          type={schema.type === 'url' ? 'url' : 'text'}
          value={String(value ?? '')}
          placeholder={schema.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
        />
      );
  }

  return (
    <label className={`block ${colSpan}`}>
      <span className="text-sm font-medium text-ink">
        {schema.label}{schema.required && <span className="ml-1 text-primary">*</span>}
      </span>
      <div className="mt-2">{control}</div>
      {schema.hint && <p className="mt-1 text-[11px] text-muted">{schema.hint}</p>}
    </label>
  );
}

/* ---------- Delimited list input ----------
 * Keeps a local string while typing so separators don't vanish on every
 * keystroke; parses into string[] on blur; resyncs from the incoming array
 * when it changes and the control is not focused. */

function DelimitedInput({
  values, delimiter, joiner, onChange, placeholder, className, multiline = false, rows,
}: {
  values: string[];
  delimiter: string;
  joiner: string;
  onChange: (v: string[]) => void;
  placeholder?: string;
  className?: string;
  multiline?: boolean;
  rows?: number;
}) {
  const joined = values.join(joiner);
  const [text, setText] = useState(joined);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(joined);
  }, [joined, focused]);

  function commit() {
    setFocused(false);
    const parsed = text.split(delimiter).map((s) => s.trim()).filter(Boolean);
    if (parsed.join(joiner) !== joined) onChange(parsed);
    setText(parsed.join(joiner));
  }

  const common = {
    value: text,
    placeholder,
    className,
    onFocus: () => setFocused(true),
    onBlur: commit,
  };
  return multiline
    ? <textarea rows={rows} {...common} onChange={(e) => setText(e.target.value)} />
    : <input {...common} onChange={(e) => setText(e.target.value)} />;
}

/* ---------- Helpers ---------- */

function withIds(arr: Record<string, unknown>[]): Item[] {
  return arr.map((x) => ({ ...x, __id: (x.__id as string) ?? rid() } as Item));
}
function rid() { return Math.random().toString(36).slice(2, 10); }
function pluralize(word: string, n: number) { return n === 1 ? word.toLowerCase() : word.toLowerCase() + 's'; }

function EmptyState({ label, onAdd }: { label: string; onAdd: () => void }) {
  return (
    <div className="mt-5 tier-1 p-10 text-center">
      <p className="text-sm text-ink-soft">No {label}s yet.</p>
      <button
        onClick={onAdd}
        className="btn-primary mt-4 mx-auto text-sm"
      >
        <Plus size={13} /> Add the first {label}
      </button>
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
