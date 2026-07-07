/**
 * AdminSettingsPage — key/value admin settings grouped by category.
 *
 *   Categories rendered:
 *     · notifications   — inbox email, from address, auto-reply toggle
 *     · payment         — Razorpay + Stripe keys, currency, test mode
 *     · site            — title, description, OG image, analytics
 *     · features        — store enabled, honeypot
 *     · rateLimit       — per-hour and per-minute caps
 *
 *   Secret values (payment keys) come back from the server masked as
 *   "••••••••1234" — the field is empty when the admin starts editing so
 *   they can paste a fresh key without seeing the current secret.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Save, Loader2, AlertCircle, CheckCircle2, Bell, CreditCard, Globe, ToggleLeft, Gauge, Eye, EyeOff,
} from 'lucide-react';
import { adminApi, type AdminSettingRow } from './adminApi';

const CATEGORY_META: Record<string, { label: string; icon: React.ReactNode; blurb: string }> = {
  notifications: {
    label: 'Notifications',
    icon:  <Bell size={14} />,
    blurb: 'Where inquiries land and the address you send from.',
  },
  payment: {
    label: 'Payment gateways',
    icon:  <CreditCard size={14} />,
    blurb: 'Razorpay + Stripe keys. Leave blank to keep the mock provider active.',
  },
  site: {
    label: 'Site metadata',
    icon:  <Globe size={14} />,
    blurb: 'Title, description, OG image and analytics ID.',
  },
  features: {
    label: 'Feature toggles',
    icon:  <ToggleLeft size={14} />,
    blurb: 'Master switches for optional site features.',
  },
  rateLimit: {
    label: 'Rate limits',
    icon:  <Gauge size={14} />,
    blurb: 'Per-IP caps for the public API and admin login.',
  },
};

const CATEGORY_ORDER = ['notifications', 'payment', 'site', 'features', 'rateLimit'];

export default function AdminSettingsPage() {
  const [rows, setRows] = useState<AdminSettingRow[] | null>(null);
  const [err, setErr]   = useState<string | null>(null);
  const [msg, setMsg]   = useState<string | null>(null);

  async function load() {
    try {
      const r = await adminApi.listSettings();
      setRows(r);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to load settings.');
    }
  }
  useEffect(() => { load(); }, []);

  const grouped = useMemo(() => {
    const g: Record<string, AdminSettingRow[]> = {};
    for (const r of rows ?? []) {
      (g[r.category] ??= []).push(r);
    }
    return g;
  }, [rows]);

  return (
    <div>
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-label-md text-primary">config</p>
          <h1 className="mt-3 font-display text-3xl tracking-tight">Settings</h1>
          <p className="mt-1 text-ink-soft text-sm">
            Runtime configuration for the site — no redeploy needed. Payment keys are stored server-side and never returned to the browser in full.
          </p>
        </div>
      </header>

      {err && (
        <p className="mt-6 inline-flex items-center gap-1.5 text-sm text-red-700">
          <AlertCircle size={14} /> {err}
        </p>
      )}
      {msg && (
        <p className="mt-6 inline-flex items-center gap-1.5 text-sm text-green-700">
          <CheckCircle2 size={14} /> {msg}
        </p>
      )}

      {!rows && !err && (
        <div className="mt-6 tier-3 ambient-float p-12 grid place-items-center text-ink-soft">
          <Loader2 size={20} className="animate-spin" />
        </div>
      )}

      {rows && (
        <div className="mt-8 grid gap-6">
          {CATEGORY_ORDER.filter((c) => grouped[c]?.length).map((cat) => (
            <CategoryCard
              key={cat}
              category={cat}
              rows={grouped[cat]}
              onSaved={(m) => { setMsg(m); setTimeout(() => setMsg(null), 2400); load(); }}
              onError={setErr}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────  Category card  ───────────────────────── */

function CategoryCard({
  category, rows, onSaved, onError,
}: {
  category: string;
  rows: AdminSettingRow[];
  onSaved: (msg: string) => void;
  onError: (err: string) => void;
}) {
  const meta = CATEGORY_META[category] ?? { label: category, icon: null, blurb: '' };
  return (
    <section className="tier-3 ambient-float p-6 sm:p-7">
      <header className="flex items-center gap-3">
        <span className="w-9 h-9 grid place-items-center rounded-xl surface-lowest text-primary ambient-float">
          {meta.icon}
        </span>
        <div>
          <h2 className="font-display text-lg tracking-tight">{meta.label}</h2>
          <p className="text-[11px] text-muted">{meta.blurb}</p>
        </div>
      </header>

      <div className="mt-6 grid sm:grid-cols-2 gap-4">
        {rows.map((r) => (
          <SettingField key={r.key} row={r} onSaved={onSaved} onError={onError} />
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────  Single field  ───────────────────────── */

function SettingField({
  row, onSaved, onError,
}: {
  row: AdminSettingRow;
  onSaved: (msg: string) => void;
  onError: (err: string) => void;
}) {
  const isBool = row.value === 'true' || row.value === 'false' || (row.hasValue === false && ['features.', 'notifications.autoReply', 'payment.testMode'].some((p) => row.key.startsWith(p) || row.key === p));
  const isNum  = row.key.startsWith('rateLimit.');
  const isEnum = row.key === 'payment.defaultCurrency';
  const isSecret = row.isSecret;

  const [value, setValue] = useState<string>(() => {
    if (isSecret) return ''; // never prefill secrets
    return row.value ?? '';
  });
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);

  const dirty = isSecret ? value.length > 0 : value !== (row.value ?? '');

  async function save() {
    if (!dirty) return;
    setBusy(true);
    try {
      await adminApi.updateSetting(row.key, value);
      onSaved(`${row.label} saved.`);
      if (isSecret) setValue(''); // clear the field so the mask reappears on reload
    } catch (e) {
      onError(e instanceof Error ? e.message : `Couldn't save ${row.label}.`);
    } finally {
      setBusy(false);
    }
  }

  const spanClass = row.key === 'site.description' || row.description?.length && row.description.length > 200
    ? 'sm:col-span-2'
    : '';

  // NOTE: outer element is a <div>, not a <label>. A wrapping <label> would
  // include the Save button below, so clicking Save also fires the label's
  // implicit click on the field (toggles booleans, focus jumps on inputs).
  return (
    <div className={`block ${spanClass}`}>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-ink">{row.label}</span>
        {row.hasValue && !isSecret && (
          <span className="text-[10px] text-muted font-num">saved</span>
        )}
        {isSecret && row.hasValue && (
          <span className="text-[10px] text-primary font-num inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" /> set · {row.value}
          </span>
        )}
      </div>

      {isBool ? (
        <div className="mt-2 inline-flex items-center gap-3">
          <button
            type="button"
            role="switch"
            aria-checked={value === 'true'}
            onClick={() => { setValue(value === 'true' ? 'false' : 'true'); }}
            className={`relative w-11 h-6 rounded-full transition ${value === 'true' ? 'bg-primary' : 'bg-black/15'}`}
          >
            <span
              className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
              style={{ transform: value === 'true' ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </button>
          <span className="text-xs text-ink-soft">{value === 'true' ? 'On' : 'Off'}</span>
        </div>
      ) : isEnum ? (
        <select
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="input-clean mt-2"
        >
          <option value="INR">INR — ₹ (India)</option>
          <option value="USD">USD — $ (Global)</option>
        </select>
      ) : (
        <div className="relative mt-2">
          <input
            type={isSecret && !reveal ? 'password' : (isNum ? 'number' : 'text')}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={isSecret ? (row.hasValue ? '•••• leave blank to keep current' : 'Paste the key here') : ''}
            className="input-clean pr-10"
            autoComplete={isSecret ? 'new-password' : 'off'}
          />
          {isSecret && (
            <button
              type="button"
              onClick={() => setReveal((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-ink-soft hover:text-ink"
              aria-label={reveal ? 'Hide' : 'Reveal what you typed'}
            >
              {reveal ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          )}
        </div>
      )}

      {row.description && (
        <p className="mt-1.5 text-[11px] text-muted">{row.description}</p>
      )}

      {dirty && (
        <div className="mt-2">
          <button
            onClick={save}
            disabled={busy}
            className="btn-primary text-xs disabled:opacity-60"
          >
            {busy ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
          </button>
        </div>
      )}
    </div>
  );
}
