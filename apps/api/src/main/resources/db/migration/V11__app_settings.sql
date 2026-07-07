-- V11: single key/value table for admin-configurable app settings.
--
--   `setting_key` is a stable identifier (e.g. "payment.razorpay.keyId").
--   `value_text`  stores the current value as a string; JSON goes in here
--   too for compound settings.  Encryption at rest is the operator's
--   responsibility — sensitive values (API secrets) should be treated as
--   confidential in the DB.
--
--   `category` lets the admin UI group related keys together (payment,
--   notifications, site, features, rate-limit, analytics).

CREATE TABLE app_setting (
    setting_key   VARCHAR(120) PRIMARY KEY,
    category      VARCHAR(40)  NOT NULL,
    label         VARCHAR(120) NOT NULL,
    description   VARCHAR(400),
    value_text    TEXT,
    is_secret     BOOLEAN      NOT NULL DEFAULT FALSE,
    updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Seed the catalog with all the keys the admin panel can edit.  Values are
-- empty by default — the app falls back to env vars / static profile when a
-- setting has no value.

INSERT INTO app_setting (setting_key, category, label, description, is_secret) VALUES
  ('notifications.notifyTo',      'notifications', 'Inbox email',
   'Where new hire-me inquiries land. Leave blank to fall back to the profile email.',                     FALSE),
  ('notifications.fromAddress',   'notifications', 'From address',
   'The From: header used on outbound emails. Must be a domain you own to avoid spam filters.',            FALSE),
  ('notifications.autoReply',     'notifications', 'Auto-reply to sender',
   'When enabled, senders get an immediate "thanks, I''ll reply in 24h" confirmation.',                    FALSE),

  ('payment.razorpay.keyId',      'payment',       'Razorpay key ID',
   'Public key ID for Razorpay Checkout. Leave blank to keep Razorpay stubbed.',                           FALSE),
  ('payment.razorpay.keySecret',  'payment',       'Razorpay key secret',
   'Razorpay secret. Used server-side only to sign the order intent.',                                     TRUE),
  ('payment.stripe.secretKey',    'payment',       'Stripe secret key',
   'Stripe API secret (starts with sk_...). Leave blank to keep Stripe stubbed.',                          TRUE),
  ('payment.stripe.webhookSecret','payment',       'Stripe webhook secret',
   'Signing secret from Stripe > Developers > Webhooks. Used to verify inbound events.',                   TRUE),
  ('payment.defaultCurrency',     'payment',       'Default currency',
   'Which currency the checkout is pre-set to. INR or USD.',                                               FALSE),
  ('payment.testMode',            'payment',       'Test mode',
   'When enabled, real gateways are skipped and the mock provider is used regardless of keys.',            FALSE),

  ('site.title',                  'site',          'Site title',
   'Shown in the browser tab and used as the OG title for shares.',                                        FALSE),
  ('site.description',            'site',          'Site description',
   'Meta description + OG description for search results and link previews.',                              FALSE),
  ('site.ogImageUrl',             'site',          'OG image URL',
   'Full URL of the image shown on social shares. Ideally 1200×630.',                                      FALSE),
  ('site.analyticsId',            'site',          'Analytics ID',
   'Plausible / GA / Umami identifier. Leave blank to skip analytics.',                                    FALSE),

  ('features.storeEnabled',       'features',      'Store enabled',
   'Master switch for the /store routes. When off, the nav link is hidden and routes 404.',                FALSE),
  ('features.contactHoneypot',    'features',      'Contact honeypot',
   'Anti-spam field on the hire-me form. Keep on unless debugging.',                                       FALSE),

  ('rateLimit.contactPerHour',    'rateLimit',     'Contact submissions / hour',
   'Per-IP cap on hire-me submissions. Bump if your audience is large.',                                   FALSE),
  ('rateLimit.apiPerMinute',      'rateLimit',     'Generic API / minute',
   'Per-IP cap on public GETs to /api/*. Keep well above your polling needs.',                             FALSE),
  ('rateLimit.loginPerMinute',    'rateLimit',     'Admin login / minute',
   'Per-IP cap on /api/admin/login. Tight cap is the anti-brute-force measure.',                           FALSE);

-- Defaults so the admin UI shows something on first load.
UPDATE app_setting SET value_text = 'true'  WHERE setting_key = 'notifications.autoReply';
UPDATE app_setting SET value_text = 'INR'   WHERE setting_key = 'payment.defaultCurrency';
UPDATE app_setting SET value_text = 'true'  WHERE setting_key = 'payment.testMode';
UPDATE app_setting SET value_text = 'true'  WHERE setting_key = 'features.storeEnabled';
UPDATE app_setting SET value_text = 'true'  WHERE setting_key = 'features.contactHoneypot';
UPDATE app_setting SET value_text = '5'     WHERE setting_key = 'rateLimit.contactPerHour';
UPDATE app_setting SET value_text = '300'   WHERE setting_key = 'rateLimit.apiPerMinute';
UPDATE app_setting SET value_text = '5'     WHERE setting_key = 'rateLimit.loginPerMinute';
UPDATE app_setting SET value_text = 'Shivhari Lokhande — Technical Lead · Scrum Master · Backend Engineer'
   WHERE setting_key = 'site.title';
