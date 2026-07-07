import { Github, Linkedin, Mail, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { profile as staticProfile } from '../lib/data';
import { useSection } from '../hooks/usePortfolioContent';
import { copyDefaults, mergeCopy } from '../lib/copyDefaults';

/** Substitute {name} / {year} placeholders in Footer copy strings. */
function fill(tmpl: string, values: Record<string, string>): string {
  return tmpl.replace(/\{(\w+)\}/g, (_, k) => values[k] ?? '');
}

export default function Footer() {
  const raw = useSection<typeof staticProfile>('profile', staticProfile);
  // Handle both nested `socials.*` and legacy flat CMS entries.
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
  const footerCopy = mergeCopy(useSection('copy', copyDefaults)).footer;
  const year = String(new Date().getFullYear());
  const values = { name: profile.name, year };
  return (
    <footer className="relative mt-24">
      {/* Tonal lift, no border — section sits on surface-low against the page surface */}
      <div className="surface-low">
        <div className="max-w-content mx-auto px-4 sm:px-6 py-14">
          {/* asymmetric: 60 / 40 split breaks the standard grid */}
          <div className="grid lg:grid-cols-[1.4fr_1fr] gap-10 items-start">
            <div>
              <p className="text-label-md text-primary">{footerCopy.creditsEyebrow}</p>
              <h3 className="font-display text-headline-md mt-3 max-w-md">
                {/* Split on {name} so the name renders with a gradient. Fall
                    back to the whole string if the template didn't include the
                    placeholder. */}
                {footerCopy.creditsTitle.includes('{name}') ? (
                  <>
                    {footerCopy.creditsTitle.split('{name}')[0]}
                    <span className="text-gradient">{profile.name}</span>
                    {footerCopy.creditsTitle.split('{name}')[1] ?? ''}
                  </>
                ) : (
                  fill(footerCopy.creditsTitle, values)
                )}
              </h3>
              <p className="mt-4 text-sm text-ink-soft max-w-md leading-relaxed">
                {footerCopy.creditsBody}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <a href={profile.socials.linkedin} target="_blank" rel="noreferrer"
                   className="chip-resource hover:bg-surface-container transition">
                  <Linkedin size={12} /> LinkedIn
                </a>
                <a href={profile.socials.github} target="_blank" rel="noreferrer"
                   className="chip-resource hover:bg-surface-container transition">
                  <Github size={12} /> GitHub
                </a>
                <a href={`mailto:${profile.email}`}
                   className="chip-resource hover:bg-surface-container transition">
                  <Mail size={12} /> {profile.email}
                </a>
              </div>
            </div>

            {/* Floating contact card — Level 3 (lifted white) on Level 1 surface */}
            <div className="tier-3 ambient-float p-6">
              <p className="text-label-sm text-ink-soft">{footerCopy.contactCardEyebrow}</p>
              <h4 className="font-display text-2xl mt-2 leading-tight">{footerCopy.contactCardTitle}</h4>
              <p className="text-sm text-muted mt-3">
                {footerCopy.contactCardBody}
              </p>
              {/* Full-path anchor so this CTA works from /store/* routes too,
                  where the #contact section doesn't exist on the current page. */}
              <a href="/#contact" className="btn-primary mt-5">
                {footerCopy.contactCtaLabel} <ArrowUpRight size={14} />
              </a>
            </div>
          </div>

          {/* Legal-page links — required by every payment gateway. Content
              editable under /admin/portfolio → Legal. */}
          <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
            <Link to="/legal/terms"   className="hover:text-ink transition">Terms of Service</Link>
            <span aria-hidden>·</span>
            <Link to="/legal/privacy" className="hover:text-ink transition">Privacy Policy</Link>
            <span aria-hidden>·</span>
            <Link to="/legal/refund"  className="hover:text-ink transition">Refund Policy</Link>
          </div>

          <div className="mt-6 pt-6 flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
            <span>{fill(footerCopy.copyright, values)}</span>
            <span className="font-mono">{footerCopy.versionTag}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
