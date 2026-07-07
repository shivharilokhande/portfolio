Portfolio local file storage
============================

Everything uploaded from the admin panel lands here on disk. Configurable
via the APP_STORAGE_DIR env var — default is this folder (apps/api/.storage/)
so a fresh clone works immediately without any setup.

Layout
------

  products/                   ← product source-code ZIPs
    {productId}-{filename}.zip

  product-images/             ← product gallery images
    {productId}/
      {uuid}.jpg | .png | .webp | .gif

  profile/                    ← admin's CV, single file, latest overwrites
    cv.pdf

Rules of the road
-----------------

* This folder is fully ignored by git — the .gitkeep files below are the
  only tracked things, and they exist just to preserve the directory
  shape on a fresh clone.
* Safe to delete the whole tree during dev — the app will recreate the
  subdirs on next start.
* For production, point APP_STORAGE_DIR at a persistent volume (mounted
  disk, S3-mounted FUSE, etc.), OR swap the file writes in the three
  Asset controllers for an S3 / Cloudflare R2 client.

Backup on Mac / Linux
---------------------

  tar -czf portfolio-storage-$(date +%F).tar.gz apps/api/.storage/

Restore
-------

  tar -xzf portfolio-storage-YYYY-MM-DD.tar.gz
