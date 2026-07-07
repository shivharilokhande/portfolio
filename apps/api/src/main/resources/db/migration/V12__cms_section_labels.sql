-- Clean up the sidebar labels the CMS renders in the admin panel. The
-- previous labels ("Hero stats", "Voices") were technically-correct but
-- opaque to anyone who didn't build the site. Renaming to be self-
-- describing so an admin unfamiliar with the code knows what each row
-- controls on the public site.
--
-- Idempotency: we only touch rows whose label still matches the old
-- default. If the admin has already renamed a section from the UI, their
-- label is preserved.

UPDATE portfolio_content
   SET label = 'Profile & identity'
 WHERE section_key = 'profile' AND label = 'Profile & identity';

UPDATE portfolio_content
   SET label = 'Hero (top of page)'
 WHERE section_key = 'hero' AND label = 'Hero copy';

UPDATE portfolio_content
   SET label = 'About-section stats'
 WHERE section_key = 'stats' AND label = 'Hero stats';

UPDATE portfolio_content
   SET label = 'Skills & pillars'
 WHERE section_key = 'skills' AND label = 'Skills & capabilities';

UPDATE portfolio_content
   SET label = 'Projects (bento grid)'
 WHERE section_key = 'projects' AND label = 'Projects';

UPDATE portfolio_content
   SET label = 'Services'
 WHERE section_key = 'services' AND label = 'Services';

UPDATE portfolio_content
   SET label = 'Testimonials (voices)'
 WHERE section_key = 'testimonials' AND label = 'Voices';

UPDATE portfolio_content
   SET label = 'Career journey (timeline)'
 WHERE section_key = 'timeline' AND label = 'Journey';

UPDATE portfolio_content
   SET label = 'Education'
 WHERE section_key = 'education' AND label = 'Education';

UPDATE portfolio_content
   SET label = 'Certifications'
 WHERE section_key = 'certifications' AND label = 'Certifications';
