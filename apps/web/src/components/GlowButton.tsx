import { forwardRef } from 'react';
import { ArrowRight } from 'lucide-react';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  as?: 'button' | 'a';
  href?: string;
  variant?: 'primary' | 'ghost' | 'tertiary';
  withArrow?: boolean;
};

/**
 * Luminous Engine CTA — energy gradient + ambient glow on primary,
 * tonal surface for ghost, transparent + primary text for tertiary.
 */
const GlowButton = forwardRef<HTMLButtonElement | HTMLAnchorElement, Props>(
  ({ as = 'button', href, variant = 'primary', withArrow = true, children, className = '', ...rest }, ref) => {
    const base =
      'group inline-flex items-center gap-2 px-5 py-3 rounded-lg font-semibold tracking-tight text-sm sm:text-base transition will-change-transform';
    const styles = {
      primary:
        'btn-glow bg-gradient-to-br from-primary to-primary-soft text-on-primary shadow-ambient hover:translate-y-[-1px]',
      ghost:
        'surface-low text-ink ghost-line hover:bg-surface-container',
      tertiary:
        'btn-tertiary',
    }[variant];

    const content = (
      <>
        {children}
        {withArrow && <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />}
      </>
    );

    if (as === 'a') {
      return (
        // eslint-disable-next-line jsx-a11y/anchor-is-valid
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          className={`${base} ${styles} ${className}`}
        >
          {content}
        </a>
      );
    }
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        className={`${base} ${styles} ${className}`}
        {...rest}
      >
        {content}
      </button>
    );
  },
);
GlowButton.displayName = 'GlowButton';
export default GlowButton;
