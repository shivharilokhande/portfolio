-- V15: register the site.baseUrl and site.canonicalUrl settings so the
-- template ships with editable primary-domain config. `site.title` already
-- exists (V11) but V11 seeded it with a personal string; wipe it so the
-- runtime useSiteMeta() hook falls back to the CMS profile.
--
-- Also add a `siteMeta` CMS section (portfolio_content) that the frontend
-- useSiteMeta hook reads via useSection('siteMeta', {}). Idempotent.

INSERT INTO app_setting (setting_key, category, label, description, is_secret) VALUES
  ('site.baseUrl',       'site', 'Site base URL',
   'Absolute URL where this site is served (e.g. https://example.com). Used in the sitemap and canonical tags.',
   FALSE),
  ('site.canonicalUrl',  'site', 'Canonical URL',
   'Overrides the auto-generated canonical URL. Leave blank to derive from site.baseUrl.',
   FALSE);

-- Wipe the personal V11 seed so fresh installs don't ship someone else's title.
UPDATE app_setting SET value_text = NULL WHERE setting_key = 'site.title';

-- Register the siteMeta CMS section (fields consumed by useSiteMeta.ts).
INSERT INTO portfolio_content (section_key, label, body)
SELECT 'siteMeta', 'SEO & site metadata', '{
  "title":        "",
  "description":  "",
  "ogImageUrl":   "",
  "canonicalUrl": ""
}'
WHERE NOT EXISTS (
  SELECT 1 FROM portfolio_content WHERE section_key = 'siteMeta'
);
