/**
 * BrandLogo — the two-tone wordmark used in the header, store nav, admin
 * layout and admin login. Every rendered string is driven by the CMS
 * profile (Profile tab in /admin/portfolio) so a buyer can rebrand the
 * entire site by editing three fields:
 *
 *   • profile.brandPrefix   → coloured half (e.g. "shivhari")
 *   • profile.brandSuffix   → muted half   (e.g. ".dev")
 *   • profile.logoInitial   → single-letter square badge (e.g. "S")
 *
 * If any field is blank we derive a sensible default from `shortName` so
 * the site never renders "undefined.undefined".
 */
import { profile as staticProfile } from '../lib/data';
import { useSection } from '../hooks/usePortfolioContent';

type Variant = 'sidebar' | 'inline';

export function useBrand() {
  const p = useSection<typeof staticProfile>('profile', staticProfile);
  const shortName = (p.shortName || p.name || 'Portfolio').toString();
  const brandPrefix = (p.brandPrefix?.trim() || shortName.toLowerCase().replace(/\s+/g, '')) as string;
  const brandSuffix = (p.brandSuffix?.trim() || '.dev') as string;
  const logoInitial = (p.logoInitial?.trim() || shortName.charAt(0).toUpperCase()) as string;
  const fullBrand = `${brandPrefix}${brandSuffix}`;
  return { brandPrefix, brandSuffix, logoInitial, fullBrand, shortName, profile: p };
}

/**
 * Renders the square gradient initial badge + wordmark. `variant` toggles
 * between the header layout (badge + inline text) and a compact inline mark
 * used inside form headers, empty states, etc.
 */
export default function BrandLogo({
  variant = 'inline',
  hideText = false,
  className = '',
}: {
  variant?: Variant;
  hideText?: boolean;
  className?: string;
}) {
  const { brandPrefix, brandSuffix, logoInitial } = useBrand();
  const badgeSizes = variant === 'sidebar'
    ? 'w-9 h-9 rounded-xl'
    : 'w-9 h-9 rounded-xl';
  return (
    <span className={`inline-flex items-center gap-2 font-display font-semibold ${className}`}>
      <span className={`${badgeSizes} grid place-items-center bg-gradient-to-br from-primary to-primary-soft text-on-primary ambient-float`}>
        {logoInitial}
      </span>
      {!hideText && (
        <span className="tracking-tight">
          <span className="text-gradient">{brandPrefix}</span>
          <span className="text-muted">{brandSuffix}</span>
        </span>
      )}
    </span>
  );
}

/** Just the two-tone text (no badge) — for footer credits etc. */
export function BrandWordmark({ className = '' }: { className?: string }) {
  const { brandPrefix, brandSuffix } = useBrand();
  return (
    <span className={`tracking-tight font-semibold ${className}`}>
      <span className="text-gradient">{brandPrefix}</span>
      <span className="text-muted">{brandSuffix}</span>
    </span>
  );
}
