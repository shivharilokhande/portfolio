-- Portfolio CMS — key/value section table (MySQL 8 / InnoDB)
-- Each row is a section (profile, hero, projects, services, etc.) stored as JSON-stringified text.

CREATE TABLE portfolio_content (
    section_key  VARCHAR(60)  NOT NULL,
    label        VARCHAR(120) NOT NULL,
    body         MEDIUMTEXT   NOT NULL,
    updated_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (section_key)
);

-- Seed with current static defaults so the public site keeps the same content
-- on first boot. Admin can edit any of these rows via /admin/portfolio.
INSERT INTO portfolio_content (section_key, label, body) VALUES
('profile', 'Profile & identity', '{
  "name": "Shivhari Lokhande",
  "shortName": "Shivhari",
  "fullName": "Shivhari Ananta Lokhande",
  "title": "Technical Lead · Scrum Master · Backend Engineer",
  "tagline": "Engineering + Agile, side by side.",
  "oneLiner": "I lead delivery for teams that ship complex platforms — Java, Spring Boot, Workiva, AWS — with the Scrum discipline to keep them on time. Six years across IIT Bombay, Accenture, Deloitte, EY and CES.",
  "location": "Pune, India · Remote-first",
  "email": "shivlokhande7080@gmail.com",
  "phone": "+91 95189 56711",
  "cvUrl": "/Shivhari-Lokhande-CV.pdf",
  "linkedin": "https://www.linkedin.com/in/shivhari-lokhande/",
  "github": "https://github.com/shivharilokhande",
  "twitter": "https://x.com/"
}'),
('stats', 'Hero stats', '[
  {"value":"6","label":"Years experience"},
  {"value":"5","label":"Roles · IIT, Accenture, Deloitte, EY, CES"},
  {"value":"4","label":"Certifications"},
  {"value":"20+","label":"Workflows automated"}
]'),
('hero', 'Hero copy', '{
  "headline": ["Build", "the", "work", "that", "gets", "remembered."],
  "badge":    "Available for freelance & fractional CTO engagements",
  "primaryCta":   { "label": "Start a conversation", "href": "#contact" },
  "secondaryCta": { "label": "Download CV",           "href": "/Shivhari-Lokhande-CV.pdf" }
}'),
-- V6 originally seeded the array sections below with `[]`. On a fresh install
-- V8 then back-fills them. To keep V6 idempotent + readable we leave it as
-- empty arrays — V8 is the single source of seed content for these sections.
('services', 'Services', '[]'),
('projects', 'Projects', '[]'),
('testimonials', 'Voices', '[]'),
('skills', 'Skills & capabilities', '[]'),
('timeline', 'Journey', '[]'),
('education', 'Education', '[]'),
('certifications', 'Certifications', '[]');
