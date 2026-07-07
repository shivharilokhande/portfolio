-- Introduce the 'copy' CMS section that carries every hardcoded string
-- outside `profile` / `hero` / arrays: each section's header (eyebrow /
-- title / description), the Hero right-side "SHIPPING · NOW" card, the
-- About-section pillars, and the Footer copy. The frontend reads this
-- via useSection('copy', copyDefaults) so any admin edit goes live on
-- the next poll — no redeploy.
--
-- Idempotency: only inserts if the key doesn't already exist. Once seeded
-- the row is fully editable through /admin/portfolio → Site copy.

INSERT INTO portfolio_content (section_key, label, body)
SELECT 'copy', 'Site copy (headers, hero card, footer)', '{
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
  "footer": {
    "creditsEyebrow":     "END · CREDITS",
    "creditsTitle":       "Built end to end by {name}",
    "creditsBody":        "React Three Fiber, Framer Motion, GSAP ScrollTrigger over a Spring Boot + MySQL backend. Designed and shipped as a single editorial experience.",
    "contactCardEyebrow": "Ready for the next one",
    "contactCardTitle":   "Want a similar build?",
    "contactCardBody":    "Freelance & fractional CTO engagements open. Six-week pilot or three-month retainer.",
    "contactCtaLabel":    "Start a conversation",
    "copyright":          "© {year} {name} · Pune, India · Remote-first",
    "versionTag":         "v1.0 · shivhari.dev"
  }
}'
WHERE NOT EXISTS (
  SELECT 1 FROM portfolio_content WHERE section_key = 'copy'
);
