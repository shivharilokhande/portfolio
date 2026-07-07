import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ProductDto } from './storeApi';

export type CartLine = {
  productId: number;
  slug:      string;
  title:     string;
  priceInr:  number;
  priceUsd:  number;
  coverColor: string;
  quantity:  number;
};

type CartState = {
  lines:        CartLine[];
  currency:     'INR' | 'USD';
  /* actions */
  add:          (p: ProductDto) => void;
  remove:       (productId: number) => void;
  setQuantity:  (productId: number, qty: number) => void;
  setCurrency:  (c: 'INR' | 'USD') => void;
  clear:        () => void;
  /* derived */
  itemCount:    () => number;
  subtotal:     () => number;
};

/** Max units of a single product per order — must stay in sync with
 *  OrderRequest.OrderItemReq's @Max(20) on the backend. Values above this
 *  would 400 at checkout. */
const MAX_QTY = 20;

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines:    [],
      currency: 'INR',

      add(p) {
        set((s) => {
          const existing = s.lines.find((l) => l.productId === p.id);
          if (existing) {
            return {
              lines: s.lines.map((l) =>
                l.productId === p.id
                  ? { ...l, quantity: Math.min(MAX_QTY, l.quantity + 1) }
                  : l,
              ),
            };
          }
          return {
            lines: [
              ...s.lines,
              {
                productId:  p.id,
                slug:       p.slug,
                title:      p.title,
                priceInr:   p.priceInr,
                priceUsd:   p.priceUsd,
                coverColor: p.coverColor,
                quantity:   1,
              },
            ],
          };
        });
      },

      remove(productId) {
        set((s) => ({ lines: s.lines.filter((l) => l.productId !== productId) }));
      },

      setQuantity(productId, qty) {
        if (qty <= 0) return get().remove(productId);
        const clamped = Math.min(MAX_QTY, qty);
        set((s) => ({
          lines: s.lines.map((l) =>
            l.productId === productId ? { ...l, quantity: clamped } : l,
          ),
        }));
      },

      setCurrency(currency) { set({ currency }); },
      clear() { set({ lines: [] }); },

      itemCount() {
        return get().lines.reduce((acc, l) => acc + l.quantity, 0);
      },
      subtotal() {
        const { lines, currency } = get();
        return lines.reduce((acc, l) => acc + (currency === 'INR' ? l.priceInr : l.priceUsd) * l.quantity, 0);
      },
    }),
    { name: 'portfolio-store-cart-v1' },
  ),
);

/** Currency-aware money formatter.
 *
 *   INR shows whole rupees (₹499 not ₹499.00) — India-standard for digital
 *   catalog prices. USD preserves 2 decimals so a $299.99 product doesn't
 *   silently round up to $300 and lose the .99 pricing signal.
 */
export function formatMoney(amount: number, currency: 'INR' | 'USD'): string {
  return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'USD' ? 2 : 0,
  }).format(amount);
}
