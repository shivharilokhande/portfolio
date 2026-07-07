-- V9: index the column the contact-form rate-limit scans on every submit.
--
--   ContactRepository.countByEmailAndCreatedAtAfter(email, since) is called
--   from ContactService for every POST /api/contact. V1 already indexes
--   created_at and status, but email was un-indexed — the query fell back
--   to a full-table scan.
--
--   Works on both real MySQL 8 and H2 (MODE=MySQL).

CREATE INDEX ix_contact_email ON contact_submission (email);

-- NOTE: utf8mb4 charset conversion for the text-heavy tables (blog_post,
-- store_product, portfolio_content, contact_submission.message) is intentionally
-- NOT in this migration because H2 does not accept `CONVERT TO CHARACTER SET`
-- and would fail the dev boot. On real MySQL prod the DBA should run manually
-- (one-time, off-hours):
--
--   ALTER TABLE <table> CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
--
-- Tables that hold user-supplied text and should be converted:
--   contact_submission · blog_post · project · store_product · store_order ·
--   store_order_item · portfolio_content
--
-- If your MySQL 8 defaults are already utf8mb4 (most cloud managed instances),
-- this is a no-op.
