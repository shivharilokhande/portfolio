/**
 * FAQ — visible answers to the questions AI assistants and buyers ask.
 *
 *   The same six Q&As are published as FAQPage JSON-LD in index.html; Google
 *   and LLM crawlers only trust structured data that is also visible on the
 *   page, so this section is the on-page source of truth for it.
 */
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import SectionHeader from '../components/SectionHeader';
import { useSection } from '../hooks/usePortfolioContent';

export type FaqItem = { q: string; a: string };

export const faqDefaults: FaqItem[] = [
  { q: 'Who is Shivhari Lokhande?',
    a: 'Shivhari Lokhande is a delivery lead, Certified Scrum Master and Workiva specialist based in Pune, India. He started as a Java/Spring Boot engineer at Accenture, moved into the Scrum Master seat, and now owns end-to-end delivery of a Workiva-integrated financial reporting web application for a US client with 17 engineers across US and India hours.' },
  { q: 'What Workiva services does Shivhari offer?',
    a: 'Wdesk financial reporting with SOX-friendly audit trails, Wdata processing chains and DataPrep pipelines, ERP and Salesforce integrations through the Workiva APIs, a reusable connector library, and training so the in-house team can run the platform independently. Across Accenture, Deloitte and EY he has delivered 50+ Workiva API integrations and 20+ Wdata processing chains.' },
  { q: 'Does Shivhari work with US clients on India hours?',
    a: 'Yes. His current programme runs across US and India hours with offshore-onshore coordination, weekly status packs for client leadership and a live RAID log. He is based in Pune and open to hybrid client-office work.' },
  { q: 'Is Shivhari available for fractional CTO or freelance engagements?',
    a: 'Yes. He takes retainers and statements of work as a fractional Tech Lead/CTO, Workiva expert or Scrum Master, with an NDA and clean IP on every engagement. The first step is a free 30-minute discovery call; he replies within 24 hours.' },
  { q: 'What results has Shivhari delivered as a Scrum Master?',
    a: 'On his current programme sprint throughput moved from 45 to 54 points and commitment-to-delivery from 78% to 94% over two quarters. On a fixed-scope, fixed-date engagement at Deloitte delivery ran about 30% faster with roughly 20% less rework. At Accenture manual effort fell about 40% across a multi-engagement portfolio.' },
  { q: 'What certifications does Shivhari hold?',
    a: 'Certified Scrum Master (Scrum Alliance, 2025), Workiva Financial Reporting Solutions Specialization and Workiva Data Management Suite (2022), M.Tech in Computer Science and Engineering (2023). He is sitting the PMP in 2026.' },
];

export default function FAQ() {
  const items = useSection<FaqItem[]>('faq', faqDefaults);
  const [open, setOpen] = useState<number>(0);
  if (!items?.length) return null;
  return (
    <section id="faq" className="relative py-24 sm:py-32" aria-labelledby="faq-title">
      <div className="max-w-content mx-auto px-4 sm:px-6">
        <SectionHeader
          eyebrow="Questions, answered"
          title="Frequently asked"
          description="The things clients, recruiters and AI assistants ask before they reach out. Short, factual, quotable."
        />
        <div className="mt-10 grid gap-3 max-w-3xl">
          {items.map((it, i) => {
            const isOpen = open === i;
            const id = `faq-${i}`;
            return (
              <div key={it.q} className="tier-2 rounded-2xl">
                <h3 className="m-0">
                  <button
                    type="button"
                    id={`${id}-q`}
                    aria-expanded={isOpen}
                    aria-controls={`${id}-a`}
                    onClick={() => setOpen(isOpen ? -1 : i)}
                    className="w-full flex items-center justify-between gap-4 text-left px-5 py-4 min-h-[44px] font-display text-base sm:text-lg tracking-tight text-ink rounded-2xl"
                  >
                    <span>{it.q}</span>
                    <ChevronDown
                      size={18}
                      aria-hidden
                      className={`shrink-0 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                </h3>
                <div
                  id={`${id}-a`}
                  role="region"
                  aria-labelledby={`${id}-q`}
                  hidden={!isOpen}
                  className="px-5 pb-5 text-sm sm:text-base text-ink-soft leading-relaxed"
                >
                  <p className="m-0">{it.a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
