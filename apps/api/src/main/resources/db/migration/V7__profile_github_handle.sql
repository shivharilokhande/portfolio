-- Patch: corrects the GitHub URL in the seeded `profile` portfolio CMS row.
-- The original V6 seed used `github.com/shivhari` (not a real account); the
-- canonical handle is `shivharilokhande`. Updates only existing rows, so
-- fresh installs running V6 + V7 land at the same state.

UPDATE portfolio_content
SET body = REPLACE(body,
                   '"github": "https://github.com/shivhari"',
                   '"github": "https://github.com/shivharilokhande"'),
    updated_at = CURRENT_TIMESTAMP
WHERE section_key = 'profile'
  AND body LIKE '%"github": "https://github.com/shivhari"%';
