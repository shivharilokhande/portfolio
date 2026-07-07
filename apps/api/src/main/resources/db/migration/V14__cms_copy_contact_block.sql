-- Extend the 'copy' section with the Contact block (trust chips, the EY
-- blockquote, form field labels + placeholders, privacy note, submit + success
-- text). Previous seed (V13) didn't cover these — they were still hardcoded
-- in Contact.tsx. Now every string in the Contact panel is admin-editable
-- under /admin/portfolio → Contact → Contact extras.
--
-- H2-compatible strategy: previous revision of this migration used MySQL's
-- JSON_MERGE_PATCH / JSON_EXTRACT which don't exist on H2. We do it in two
-- plain-SQL steps that work everywhere:
--
--   1. INSERT the row if it's missing (fresh install between V13 and V14).
--   2. UPDATE only the rows whose stored body text doesn't already mention
--      a "contact" key. That check is a LIKE-on-string, which loses any
--      exotic admin edits containing the literal substring "contact":,
--      but for a section a buyer hasn't touched yet it's safe and
--      idempotent.
--
-- Anyone who has already edited the copy row (adding e.g. their own contact
-- block via the admin UI, which merges via mergeCopy() on the frontend)
-- will match the LIKE and be skipped — nothing overwritten.

INSERT INTO portfolio_content (section_key, label, body)
SELECT 'copy', 'Site copy', '{}'
WHERE NOT EXISTS (
  SELECT 1 FROM portfolio_content WHERE section_key = 'copy'
);

UPDATE portfolio_content
   SET body = '{
  "sectionHeaders": {
    "about":        { "eyebrow": "About",                 "title": "Built to ship. Trained to lead.",             "description": "" },
    "skills":       { "eyebrow": "Capabilities",          "title": "Skills, mapped in three dimensions.",         "description": "The cluster below is the real catalogue — hover any node for proficiency. To the right, the same data folded onto a radar so the shape of the practice is obvious at a glance." },
    "timeline":     { "eyebrow": "Journey",               "title": "Six years of compounding craft.",             "description": "From Accenture floor to Big 4 consulting to leading squads at CES — every step deepened the same two muscles: ship hard things, lead the people doing it." },
    "projects":     { "eyebrow": "Featured work · Store", "title": "Built once. Ready for you to ship.",          "description": "Most of these are production-grade systems you can buy as source code in the store — hospital, hotel, pharmacy, salon, invoicing, appointment booking and more. The grey-badged tiles are private client case studies. Tap any tile to view it on the store." },
    "services":     { "eyebrow": "Services",              "title": "Four ways to work together.",                 "description": "Engagements scoped to your team. Rates are quoted on the discovery call so they reflect the work — not a hidden hourly meter. Retainers and statements-of-work both available." },
    "testimonials": { "eyebrow": "Voices · Store reviews","title": "What buyers say about the products.",         "description": "Verified reviews from teams running the source code I sell — hotels, clinics, pharmacies, salons, consultancies. Names lightly edited where buyers asked for privacy." },
    "contact":      { "eyebrow": "Hire me",               "title": "Let''s build something great.",                "description": "Tell me about your team, your timeline, and the problem you''re chewing on. I reply within 24 hours — usually faster." }
  },
  "aboutPillars": [
    { "icon": "code",      "title": "Engineer",   "text": "Java · Spring Boot · microservices · REST · AWS · Redis · MySQL." },
    { "icon": "briefcase", "title": "Scrum Lead", "text": "CSM-certified. Coaching squads at CES, EY, Deloitte and Accenture." }
  ],
  "heroCard": {
    "eyebrow":   "SHIPPING · NOW",
    "title":     "Currently building",
    "body":      "Enterprise platforms at CES Ltd · API design, observability, agile delivery.",
    "liveBadge": "Live",
    "stats": [
      { "n": "6+",  "l": "years" },
      { "n": "5",   "l": "firms" },
      { "n": "12k", "l": "commits" }
    ],
    "chips": ["Java", "Spring Boot", "AWS", "Workiva", "Scrum"]
  },
  "contact": {
    "trustBullets": [
      { "icon": "clock",  "text": "Replies within 24 hours" },
      { "icon": "shield", "text": "NDA-friendly · zero spam" }
    ],
    "quote": {
      "text":        "Shipped two sprints ahead of plan. The kind of lead you keep.",
      "attribution": "Engagement Partner · EY GDS"
    },
    "privacyNote":     "Submitting sends an email to me directly. No newsletter, no spam.",
    "submitLabel":     "Send message",
    "submittingLabel": "Sending…",
    "successMessage":  "Got it — I''ll reply within 24 hours.",
    "fields": {
      "nameLabel":          "Your name",
      "namePlaceholder":    "Ada Lovelace",
      "emailLabel":         "Email",
      "emailPlaceholder":   "ada@example.com",
      "companyLabel":       "Company (optional)",
      "companyPlaceholder": "Acme Inc.",
      "projectTypeLabel":   "Project type",
      "projectTypePlaceholder": "e.g. fractional CTO, Workiva integration, Spring Boot rescue",
      "messageLabel":       "What are you trying to build?",
      "messagePlaceholder": "A few sentences on the problem, the team, and the timeline."
    }
  },
  "footer": {
    "creditsEyebrow":     "END · CREDITS",
    "creditsTitle":       "Built end to end by {name}",
    "creditsBody":        "React Three Fiber, Framer Motion, GSAP ScrollTrigger over a Spring Boot + MySQL backend. Designed and shipped as a single editorial experience.",
    "contactCardEyebrow": "Ready for the next one",
    "contactCardTitle":   "Want a similar build?",
    "contactCardBody":    "Freelance & fractional CTO engagements open. Six-week pilot or three-month retainer.",
    "contactCtaLabel":    "Start a conversation",
    "copyright":          "© {year} {name} · Pune, India · Remote-first",
    "versionTag":         "v1.0"
  }
}',
    updated_at = CURRENT_TIMESTAMP
 WHERE section_key = 'copy'
   AND body NOT LIKE '%"contact"%';
