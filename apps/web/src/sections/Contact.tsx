/**
 * Contact — Luminous Engine conversion form.
 *
 *   Light tonal panel, .input-clean fields (no boxes — ghost line + focus ring),
 *   primary energy button, single ARIA-live status region.
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Mail, Github, Linkedin, Send, CheckCircle2, ShieldCheck, Clock, Loader2, Lock, Sparkles,
} from 'lucide-react';
import SectionHeader from '../components/SectionHeader';
import { profile as staticProfile } from '../lib/data';
import { useSection } from '../hooks/usePortfolioContent';
import { copyDefaults, mergeCopy, type ContactTrustBullet } from '../lib/copyDefaults';
import { api, type ContactPayload } from '../lib/api';

type Status = 'idle' | 'submitting' | 'success' | 'error';

/** Icon slug → real lucide element for the trust chips. Admin picks the slug
 *  from a dropdown in /admin/portfolio → Site copy → Contact block. */
const bulletIcons: Record<ContactTrustBullet['icon'], React.ReactNode> = {
  clock:    <Clock       size={13} />,
  shield:   <ShieldCheck size={13} />,
  check:    <CheckCircle2 size={13} />,
  sparkles: <Sparkles    size={13} />,
  lock:     <Lock        size={13} />,
};

export default function Contact() {
  const raw = useSection<typeof staticProfile>('profile', staticProfile);
  // Older CMS entries may have saved socials at the top level (linkedin/github/twitter)
  // instead of under `socials.*`. Merge so either shape works without crashing.
  const flat = raw as unknown as Record<string, string> & { socials?: Record<string, string> };
  const profile = {
    ...raw,
    socials: {
      ...staticProfile.socials,
      ...(flat.socials ?? {}),
      ...(flat.linkedin ? { linkedin: flat.linkedin } : {}),
      ...(flat.github   ? { github:   flat.github   } : {}),
      ...(flat.twitter  ? { twitter:  flat.twitter  } : {}),
    },
  };
  const contactCopy = mergeCopy(useSection('copy', copyDefaults)).contact;
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError]   = useState<string>('');

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('submitting');
    setError('');

    const data = new FormData(e.currentTarget);
    if (String(data.get('hp_field') ?? '').length > 0) {
      await new Promise((r) => setTimeout(r, 600));
      setStatus('success');
      (e.target as HTMLFormElement).reset();
      return;
    }

    const payload: ContactPayload = {
      name:         String(data.get('name')        ?? '').trim(),
      email:        String(data.get('email')       ?? '').trim(),
      company:      String(data.get('company')     ?? '').trim() || undefined,
      projectType:  String(data.get('projectType') ?? '').trim() || undefined,
      message:      String(data.get('message')     ?? '').trim(),
    };

    if (!payload.name || !payload.email || !payload.message) {
      setStatus('error'); setError('Please fill in name, email, and message.'); return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
      setStatus('error'); setError('That email address looks malformed.'); return;
    }
    if (payload.message.length < 10) {
      setStatus('error'); setError('A few more sentences please — at least 10 characters.'); return;
    }

    try {
      await api.contact(payload);
      setStatus('success');
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const httpStatus = (err as any)?.status;
      const isNetwork = httpStatus === undefined && err instanceof TypeError;
      // Never fake success on network failure — the buyer thought their
      // message landed but it never did. Surface a soft error instead so
      // they know to try again / fall back to email.
      setStatus('error');
      const msg = err instanceof Error ? err.message : 'Something went wrong.';
      setError(
        isNetwork
          ? `Couldn't reach the server. Try again in a moment, or email me directly at ${profile.email}.`
          : httpStatus === 429
            ? 'Whoa — you have submitted a few times recently. Try again in a bit, or email me directly.'
            : msg + ' If this keeps happening, email me at ' + profile.email + '.',
      );
    }
  }

  return (
    <section id="contact" className="relative py-24 sm:py-32 overflow-hidden">
      <div className="aurora bg-[radial-gradient(circle_at_15%_30%,rgba(0,209,102,0.14),transparent_50%),radial-gradient(circle_at_85%_70%,rgba(10,92,207,0.10),transparent_50%)]" />

      <div className="relative z-10 max-w-content mx-auto px-4 sm:px-6 grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5">
          <ContactHeader />

          <ul className="mt-7 flex flex-wrap gap-2">
            {contactCopy.trustBullets.map((b, i) => (
              <li key={`${b.text}-${i}`} className="chip-resource">
                <span className="text-primary">{bulletIcons[b.icon] ?? bulletIcons.clock}</span> {b.text}
              </li>
            ))}
          </ul>

          <ul className="mt-8 space-y-3 text-sm">
            <li className="flex items-center gap-3">
              <span className="w-10 h-10 shrink-0 rounded-xl surface-low grid place-items-center ambient-float text-primary"><Mail size={16} /></span>
              <a href={`mailto:${profile.email}`} className="hover:text-primary text-ink break-anywhere min-w-0">{profile.email}</a>
            </li>
            {profile.socials.linkedin && (
              <li className="flex items-center gap-3">
                <span className="w-10 h-10 shrink-0 rounded-xl surface-low grid place-items-center ambient-float text-primary"><Linkedin size={16} /></span>
                <a href={profile.socials.linkedin} target="_blank" rel="noreferrer" className="hover:text-primary text-ink break-anywhere min-w-0">
                  {/* Display text derived from the URL — strips protocol +
                      trailing slash — so a buyer of the template doesn't
                      see the previous owner's handle. */}
                  {displayFromUrl(profile.socials.linkedin)}
                </a>
              </li>
            )}
            {profile.socials.github && (
              <li className="flex items-center gap-3">
                <span className="w-10 h-10 shrink-0 rounded-xl surface-low grid place-items-center ambient-float text-primary"><Github size={16} /></span>
                <a href={profile.socials.github} target="_blank" rel="noreferrer" className="hover:text-primary text-ink break-anywhere min-w-0">
                  {displayFromUrl(profile.socials.github)}
                </a>
              </li>
            )}
          </ul>

          {/* Blockquote — hidden entirely when admin clears both fields
              in /admin/portfolio → Site copy → Contact block. */}
          {(contactCopy.quote.text.trim() || contactCopy.quote.attribution.trim()) && (
            <blockquote className="mt-10 tier-1 p-6 text-sm leading-relaxed">
              {contactCopy.quote.text.trim() && (
                <span className="block text-ink mb-2 italic">
                  &ldquo;{contactCopy.quote.text}&rdquo;
                </span>
              )}
              {contactCopy.quote.attribution.trim() && (
                <span className="text-label-sm text-muted">{contactCopy.quote.attribution}</span>
              )}
            </blockquote>
          )}
        </div>

        <motion.form
          onSubmit={onSubmit}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.55 }}
          className="lg:col-span-7 tier-3 ambient-float-lg p-5 sm:p-9 space-y-5"
          aria-busy={status === 'submitting'}
        >
          {/* honeypot */}
          <div className="hidden" aria-hidden>
            <label>
              Leave this empty:
              <input name="hp_field" tabIndex={-1} autoComplete="off" />
            </label>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field name="name"  label={contactCopy.fields.nameLabel}  placeholder={contactCopy.fields.namePlaceholder} required />
            <Field name="email" label={contactCopy.fields.emailLabel} type="email" placeholder={contactCopy.fields.emailPlaceholder} required />
          </div>
          <Field name="company"     label={contactCopy.fields.companyLabel}     placeholder={contactCopy.fields.companyPlaceholder} />
          <Field name="projectType" label={contactCopy.fields.projectTypeLabel} placeholder={contactCopy.fields.projectTypePlaceholder} />

          <label className="block">
            <span className="text-sm font-medium text-ink">{contactCopy.fields.messageLabel}</span>
            <textarea
              name="message"
              rows={5}
              required
              minLength={10}
              maxLength={4000}
              placeholder={contactCopy.fields.messagePlaceholder}
              className="input-clean mt-2 resize-y"
            />
          </label>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-muted flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-primary" />
              {contactCopy.privacyNote}
            </p>
            <button
              type="submit"
              disabled={status === 'submitting'}
              className="btn-primary disabled:opacity-60 disabled:cursor-wait"
            >
              {status === 'submitting' ? (
                <><Loader2 size={14} className="animate-spin" /> {contactCopy.submittingLabel}</>
              ) : (
                <><Send size={14} /> {contactCopy.submitLabel}</>
              )}
            </button>
          </div>

          <div role="status" aria-live="polite" className="min-h-[1.25rem]">
            {status === 'success' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-sm text-primary font-medium"
              >
                <CheckCircle2 size={16} /> {contactCopy.successMessage}
              </motion.div>
            )}
            {status === 'error' && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-red-500"
              >
                {error}
              </motion.div>
            )}
          </div>
        </motion.form>
      </div>
    </section>
  );
}

/** Render a compact display label for a social URL — strips protocol and
 *  trailing slash so `https://linkedin.com/in/foo/` becomes `linkedin.com/in/foo`. */
function displayFromUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
}

/** CMS-driven header for the Hire-me section. */
function ContactHeader() {
  const h = mergeCopy(useSection('copy', copyDefaults)).sectionHeaders.contact;
  return <SectionHeader eyebrow={h.eyebrow} title={h.title} description={h.description} />;
}

function Field({
  name, label, type = 'text', placeholder, required = false,
}: {
  name: string; label: string; type?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink">
        {label}{required && <span className="text-primary ml-1" aria-hidden>*</span>}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="input-clean mt-2"
      />
    </label>
  );
}
