/**
 * AdminProductFormPage — create OR edit a digital product, with drag-drop
 * source-archive upload + live progress bar. Luminous Engine light surfaces.
 *
 *   /admin/products/new         → create
 *   /admin/products/:id/edit    → edit existing
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Save, Loader2, Trash2, Upload, FileArchive, CheckCircle2, AlertCircle,
  Sparkles, Eye, EyeOff, ImagePlus, X,
} from 'lucide-react';
import { adminApi, type AdminProduct } from './adminApi';

type FormState = {
  slug:         string;
  title:        string;
  tagline:      string;
  description:  string;
  category:     string;
  priceInr:     number | '';
  priceUsd:     number | '';
  coverColor:   string;
  tags:         string;
  features:     string;
  whatYouGet:   string;
  techStack:    string;
  fileSizeMb:   number | '';
  version:      string;
  demoUrl:      string;
  repoUrl:      string;
  featured:     boolean;
  published:    boolean;
};

const empty: FormState = {
  slug: '', title: '', tagline: '', description: '', category: '',
  priceInr: '', priceUsd: '', coverColor: '#00d166',
  tags: '', features: '', whatYouGet: '', techStack: '',
  fileSizeMb: '', version: '1.0.0',
  demoUrl: '', repoUrl: '',
  featured: false, published: true,
};

const easeOut = [0.16, 1, 0.3, 1] as const;

export default function AdminProductFormPage() {
  const { id }     = useParams<{ id: string }>();
  const navigate   = useNavigate();
  const isEditing  = !!id;
  const [form, setForm]         = useState<FormState>(empty);
  const [busy, setBusy]         = useState(false);
  const [err, setErr]           = useState<string | null>(null);
  const [okMsg, setOkMsg]       = useState<string | null>(null);
  const [product, setProduct]   = useState<AdminProduct | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [uploadInfo, setUploadInfo] = useState<{ fileName: string; sizeMb: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Demo-image gallery state.
  const [images, setImages] = useState<string[]>([]);
  const [imgUploading, setImgUploading] = useState(false);
  const [imgPct, setImgPct] = useState<number | null>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) return;
    (async () => {
      try {
        const p = await adminApi.product(Number(id));
        setProduct(p);
        setForm({
          slug:        p.slug,
          title:       p.title,
          tagline:     p.tagline,
          description: p.description,
          category:    p.category,
          priceInr:    p.priceInr,
          priceUsd:    p.priceUsd,
          coverColor:  p.coverColor,
          tags:        p.tags.join(', '),
          features:    p.features.join(' | '),
          whatYouGet:  p.whatYouGet.join(' | '),
          techStack:   p.techStack.join(', '),
          fileSizeMb:  p.fileSizeMb,
          version:     p.version,
          demoUrl:     p.demoUrl ?? '',
          repoUrl:     p.repoUrl ?? '',
          featured:    p.featured,
          published:   p.published ?? true,
        });
        setImages(p.demoImages ?? []);
      } catch (e) {
        setErr(e instanceof Error ? e.message : 'Could not load product.');
      }
    })();
  }, [id, isEditing]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setOkMsg(null);
    if (!form.slug || !form.title || !form.tagline || !form.description) {
      setErr('Slug, title, tagline and description are required.'); return;
    }
    setBusy(true);
    try {
      const payload = {
        slug: form.slug.trim(), title: form.title.trim(),
        tagline: form.tagline.trim(), description: form.description.trim(),
        category: form.category.trim(),
        priceInr: typeof form.priceInr === 'number' ? form.priceInr : 0,
        priceUsd: typeof form.priceUsd === 'number' ? form.priceUsd : 0,
        coverColor: form.coverColor,
        tags:        form.tags,
        features:    form.features,
        whatYouGet:  form.whatYouGet,
        techStack:   form.techStack,
        fileSizeMb:  typeof form.fileSizeMb === 'number' ? form.fileSizeMb : 1,
        version:     form.version,
        demoUrl:     form.demoUrl || null,
        repoUrl:     form.repoUrl || null,
        featured:    form.featured,
        published:   form.published,
      };
      const saved = isEditing
        ? await adminApi.updateProduct(Number(id), payload)
        : await adminApi.createProduct(payload);
      setProduct(saved);
      setOkMsg(isEditing ? 'Saved.' : 'Created.');
      if (!isEditing) navigate(`/admin/products/${saved.id}/edit`, { replace: true });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Save failed.');
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!product) return;
    if (!confirm(`Delete "${product.title}" permanently?`)) return;
    try {
      await adminApi.deleteProduct(product.id);
      navigate('/admin/products');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Delete failed.');
    }
  }

  async function handleFile(file: File) {
    if (!product) {
      setErr('Save the product first, then upload its source.'); return;
    }
    setUploadPct(0); setUploadInfo(null); setErr(null);
    try {
      const r = await adminApi.uploadAsset(product.id, file, (pct) => setUploadPct(pct));
      setUploadInfo({ fileName: r.fileName, sizeMb: r.fileSizeMb });
      setOkMsg('File uploaded.');
      const fresh = await adminApi.product(product.id);
      setProduct(fresh);
      setForm((s) => ({ ...s, fileSizeMb: fresh.fileSizeMb }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Upload failed.');
    } finally {
      setUploadPct(null);
    }
  }

  function onDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }
  function onDragOver(e: React.DragEvent<HTMLLabelElement>) { e.preventDefault(); setDragging(true); }
  function onDragLeave() { setDragging(false); }

  /* ---------- Demo images ---------- */
  async function handleImageFile(file: File) {
    if (!product) { setErr('Save the product first, then add demo images.'); return; }
    if (!file.type.startsWith('image/')) { setErr('Only image files allowed.'); return; }
    if (file.size > 8 * 1024 * 1024) { setErr('Image must be ≤ 8 MB.'); return; }
    setErr(null); setImgUploading(true); setImgPct(0);
    try {
      const r = await adminApi.uploadProductImage(product.id, file, (pct) => setImgPct(pct));
      setImages(r.product.demoImages ?? []);
      setOkMsg('Image added.');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Image upload failed.');
    } finally {
      setImgUploading(false); setImgPct(null);
      if (imgInputRef.current) imgInputRef.current.value = '';
    }
  }
  async function onRemoveImage(url: string) {
    if (!product) return;
    // The URL looks like /api/store/products/{id}/images/{filename} — pluck the tail.
    const filename = url.split('/').pop();
    if (!filename) return;
    setErr(null);
    // Optimistic update — reconcile with server response.
    setImages((prev) => prev.filter((u) => u !== url));
    try {
      const r = await adminApi.deleteProductImage(product.id, filename);
      setImages(r.product.demoImages ?? []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to remove image.');
      // Roll back — reload the product to be safe.
      const fresh = await adminApi.product(product.id);
      setImages(fresh.demoImages ?? []);
    }
  }

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: easeOut }}
    >
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link to="/admin/products" className="inline-flex items-center gap-1.5 text-xs text-ink-soft hover:text-ink mb-2">
            <ArrowLeft size={13} /> All products
          </Link>
          <p className="text-label-md text-primary">
            {isEditing ? 'edit' : 'new'} · digital product
          </p>
          <h1 className="mt-3 font-display text-3xl tracking-tight">
            {isEditing ? form.title || 'Edit product' : 'New product'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {isEditing && (
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg surface-low ghost-line text-ink-soft hover:text-red-700 hover:bg-red-50 transition text-sm"
            >
              <Trash2 size={14} /> Delete
            </button>
          )}
          <button
            type="submit"
            form="product-form"
            disabled={busy}
            className="btn-primary disabled:opacity-60"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} {isEditing ? 'Save changes' : 'Create product'}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {err && (
          <motion.div
            key="err"
            initial={false} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mt-5 px-4 py-3 rounded-xl text-sm bg-rose-50 text-rose-700 inline-flex items-center gap-2"
          ><AlertCircle size={14} /> {err}</motion.div>
        )}
        {okMsg && (
          <motion.div
            key="ok"
            initial={false} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mt-5 px-4 py-3 rounded-xl text-sm bg-green-50 text-green-700 inline-flex items-center gap-2"
          ><CheckCircle2 size={14} /> {okMsg}</motion.div>
        )}
      </AnimatePresence>

      <form id="product-form" onSubmit={onSave} className="mt-8 grid lg:grid-cols-12 gap-6">

        {/* MAIN COLUMN */}
        <div className="lg:col-span-8 space-y-5">
          <Card title="Basics">
            <Field label="Slug (URL fragment)" hint="e.g. hospital-management-system" required>
              <input value={form.slug} onChange={(e) => set('slug', e.target.value)} className="input-clean" />
            </Field>
            <Field label="Title" required>
              <input value={form.title} onChange={(e) => set('title', e.target.value)} className="input-clean" />
            </Field>
            <Field label="Tagline" hint="One short selling line shown on the card and detail hero." required>
              <input value={form.tagline} onChange={(e) => set('tagline', e.target.value)} className="input-clean" />
            </Field>
            <Field label="Long description" required>
              <textarea rows={5} value={form.description} onChange={(e) => set('description', e.target.value)} className="input-clean resize-y" />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Category" hint="Healthcare, Hospitality, Business Tools…">
                <input value={form.category} onChange={(e) => set('category', e.target.value)} className="input-clean" />
              </Field>
              <Field label="Version">
                <input value={form.version} onChange={(e) => set('version', e.target.value)} className="input-clean" />
              </Field>
            </div>
          </Card>

          <Card title="Pricing & sizing">
            <div className="grid sm:grid-cols-3 gap-4">
              <Field label="Price ₹">
                <input type="number" value={form.priceInr} onChange={(e) => set('priceInr', e.target.value === '' ? '' : Number(e.target.value))} className="input-clean" />
              </Field>
              <Field label="Price $">
                <input type="number" value={form.priceUsd} onChange={(e) => set('priceUsd', e.target.value === '' ? '' : Number(e.target.value))} className="input-clean" />
              </Field>
              <Field label="File size (MB)" hint="auto-set when you upload">
                <input type="number" value={form.fileSizeMb} onChange={(e) => set('fileSizeMb', e.target.value === '' ? '' : Number(e.target.value))} className="input-clean" />
              </Field>
            </div>
          </Card>

          <Card title="Content lists">
            <Field label="Tags (comma-separated)" hint="e.g. Java, Spring Boot, AWS, Docker">
              <input value={form.tags} onChange={(e) => set('tags', e.target.value)} className="input-clean" />
            </Field>
            <Field label="Features (pipe-separated)" hint="e.g. OPD + IPD | Lab module | Insurance billing">
              <textarea rows={3} value={form.features} onChange={(e) => set('features', e.target.value)} className="input-clean resize-y" />
            </Field>
            <Field label="What buyer gets (pipe-separated)">
              <textarea rows={3} value={form.whatYouGet} onChange={(e) => set('whatYouGet', e.target.value)} className="input-clean resize-y" />
            </Field>
            <Field label="Tech stack (comma-separated)">
              <input value={form.techStack} onChange={(e) => set('techStack', e.target.value)} className="input-clean" />
            </Field>
          </Card>

          <Card title="Links">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Demo URL">
                <input value={form.demoUrl} onChange={(e) => set('demoUrl', e.target.value)} placeholder="https://…" className="input-clean" />
              </Field>
              <Field label="Repo URL">
                <input value={form.repoUrl} onChange={(e) => set('repoUrl', e.target.value)} placeholder="https://github.com/…" className="input-clean" />
              </Field>
            </div>
          </Card>
        </div>

        {/* SIDEBAR */}
        <aside className="lg:col-span-4 space-y-5">
          <Card title="Visibility">
            <Toggle
              checked={form.published}
              onChange={(v) => set('published', v)}
              label="Published"
              hint="Visible on the public store."
              activeIcon={<Eye size={14} />}
              inactiveIcon={<EyeOff size={14} />}
            />
            <Toggle
              checked={form.featured}
              onChange={(v) => set('featured', v)}
              label="Featured"
              hint="Pinned to the top of the catalog with a glow ribbon."
              activeIcon={<Sparkles size={14} />}
              inactiveIcon={<Sparkles size={14} />}
            />
          </Card>

          <Card title="Cover colour">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.coverColor}
                onChange={(e) => set('coverColor', e.target.value)}
                className="w-14 h-14 rounded-xl ghost-line bg-transparent cursor-pointer"
              />
              <input
                value={form.coverColor}
                onChange={(e) => set('coverColor', e.target.value)}
                className="input-clean"
                placeholder="#00d166"
              />
            </div>
          </Card>

          {/* UPLOAD */}
          <Card title="Source archive">
            {!isEditing ? (
              <p className="text-xs text-ink-soft">Save the product first, then come back here to upload the ZIP.</p>
            ) : (
              <>
                <label
                  onDrop={onDrop}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  className={`block cursor-pointer rounded-xl border-2 border-dashed transition p-6 text-center ${
                    dragging
                      ? 'border-primary bg-green-50'
                      : 'border-outline-variant/30 hover:border-primary/50 hover:bg-surface-low'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".zip,.tar,.tgz,.gz,.7z,application/zip"
                    onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                    className="sr-only"
                  />
                  <Upload size={22} className="mx-auto text-primary" />
                  <p className="mt-2 text-sm text-ink">
                    <span className="font-semibold">Drop your ZIP</span> or click to browse
                  </p>
                  <p className="mt-1 text-[11px] text-muted">Max 200 MB · stored on the server</p>
                </label>

                {uploadPct !== null && (
                  <div className="mt-3">
                    <div className="h-1.5 rounded-full surface-low overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-primary-soft"
                        animate={{ width: `${uploadPct}%` }}
                        transition={{ duration: 0.15, ease: 'linear' }}
                      />
                    </div>
                    <p className="mt-1 text-[11px] font-num text-ink-soft text-center">Uploading {uploadPct}%</p>
                  </div>
                )}

                {(uploadInfo || product?.fileSizeMb) && (
                  <div className="mt-4 flex items-center gap-3 px-3 py-2 rounded-lg bg-green-50">
                    <FileArchive size={16} className="text-green-700 shrink-0" />
                    <div className="text-xs flex-1 min-w-0">
                      <p className="truncate text-green-800 font-medium">
                        {uploadInfo?.fileName ?? `product_${product?.id}_archive`}
                      </p>
                      <p className="text-green-700/80">
                        {uploadInfo?.sizeMb ?? product?.fileSizeMb} MB · saved on server
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!product) return;
                        if (!confirm('Delete the uploaded archive?')) return;
                        await adminApi.removeAsset(product.id);
                        setUploadInfo(null);
                        setOkMsg('Archive removed.');
                      }}
                      className="text-ink-soft hover:text-red-700"
                      aria-label="Remove archive"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </>
            )}
          </Card>

          {/* DEMO IMAGES */}
          <Card title="Demo images / screenshots">
            {!isEditing ? (
              <p className="text-xs text-ink-soft">Save the product first, then add demo images.</p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {images.map((url) => (
                    <div key={url} className="relative group rounded-lg overflow-hidden surface-low ambient-float aspect-square">
                      <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                      <button
                        type="button"
                        onClick={() => onRemoveImage(url)}
                        className="absolute top-1 right-1 w-6 h-6 grid place-items-center rounded-full bg-white/85 backdrop-blur text-ink-soft hover:text-red-700 opacity-0 group-hover:opacity-100 transition"
                        aria-label="Remove image"
                      ><X size={12} /></button>
                    </div>
                  ))}
                  <label
                    htmlFor="product-image-input"
                    className={`aspect-square rounded-lg border-2 border-dashed grid place-items-center cursor-pointer transition ${
                      imgUploading
                        ? 'border-primary/40 bg-green-50'
                        : 'border-outline-variant/30 hover:border-primary/50 hover:bg-surface-low text-ink-soft hover:text-primary'
                    }`}
                  >
                    {imgUploading
                      ? <div className="text-center">
                          <Loader2 size={16} className="animate-spin mx-auto text-primary" />
                          <p className="text-[10px] font-num text-ink-soft mt-1">{imgPct ?? 0}%</p>
                        </div>
                      : <div className="text-center">
                          <ImagePlus size={18} className="mx-auto" />
                          <p className="text-[10px] mt-1">Add</p>
                        </div>}
                  </label>
                  <input
                    id="product-image-input"
                    ref={imgInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={(e) => e.target.files?.[0] && handleImageFile(e.target.files[0])}
                    className="sr-only"
                  />
                </div>
                <p className="mt-3 text-[11px] text-muted">
                  JPG / PNG / WebP / GIF · max 8 MB each · shown as gallery on the public product page.
                </p>
              </>
            )}
          </Card>
        </aside>
      </form>
    </motion.div>
  );
}

/* ---------- small components ---------- */

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="tier-3 ambient-float p-6">
      <h2 className="text-label-md text-primary">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">
        {label}{required && <span className="ml-1 text-primary">*</span>}
      </span>
      <div className="mt-2">{children}</div>
      {hint && <p className="mt-1 text-[11px] text-muted">{hint}</p>}
    </label>
  );
}

function Toggle({
  checked, onChange, label, hint, activeIcon, inactiveIcon,
}: {
  checked: boolean; onChange: (v: boolean) => void;
  label: string; hint?: string;
  activeIcon?: React.ReactNode; inactiveIcon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
        checked ? 'bg-green-50 ring-1 ring-primary/40' : 'surface-low ghost-line hover:bg-surface-container'
      }`}
    >
      <span
        className={`w-9 h-5 rounded-full p-0.5 transition ${
          checked ? 'bg-gradient-to-r from-primary to-primary-soft' : 'bg-outline-variant/40'
        }`}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 600, damping: 30 }}
          className={`block w-4 h-4 rounded-full bg-white ${checked ? 'ml-4' : ''}`}
        />
      </span>
      <span className="flex-1 text-left">
        <span className="text-sm font-medium inline-flex items-center gap-2 text-ink">
          {checked ? activeIcon : inactiveIcon} {label}
        </span>
        {hint && <span className="block text-[11px] text-ink-soft mt-0.5">{hint}</span>}
      </span>
    </button>
  );
}
