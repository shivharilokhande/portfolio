-- V10: add a demo-image gallery column to store_product.
--
--   Stores a JSON array of image filenames. Kept as plain TEXT for
--   H2 + MySQL portability. Nullability is enforced at the JPA layer
--   (Product.demoImagesJson has @Column(nullable = false)) rather than
--   as a SQL constraint, because DEFAULT expressions on TEXT/BLOB
--   columns aren't uniformly supported across MySQL 5.7 / 8.0.13+ and
--   H2 MODE=MySQL.
--
--   Steps:
--     1. Add the column, nullable.
--     2. Back-fill '[]' into every existing row.
--     3. Application always writes non-null values (setDemoImageList()
--        emits at least "[]"), so no NOT NULL constraint is needed at DB.

ALTER TABLE store_product ADD COLUMN demo_images TEXT;

UPDATE store_product SET demo_images = '[]' WHERE demo_images IS NULL;
